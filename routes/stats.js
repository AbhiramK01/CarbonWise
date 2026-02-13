// ===== Stats Routes =====
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Global averages (kg CO2 per year)
const GLOBAL_AVERAGES = {
    global: 4800,      // 4.8 tons/year
    regional: {
        'north-america': 15000,
        'europe': 7000,
        'asia': 4500,
        'africa': 1000,
        'south-america': 2500,
        'oceania': 12000,
        'default': 5500
    },
    target2030: 2000   // Paris Agreement target
};

// Get dashboard stats
router.get('/dashboard', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];
        
        // Calculate date ranges
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const monthAgoStr = monthAgo.toISOString().split('T')[0];

        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];

        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const twoMonthsAgoStr = twoMonthsAgo.toISOString().split('T')[0];

        // Today's emissions
        const todayStats = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities WHERE user_id = ? AND date = ?
        `).get(userId, today);

        // Yesterday's emissions for comparison
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const yesterdayStats = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities WHERE user_id = ? AND date = ?
        `).get(userId, yesterdayStr);

        // This week's emissions
        const weekStats = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities WHERE user_id = ? AND date >= ?
        `).get(userId, weekAgoStr);

        // Last week's emissions
        const lastWeekStats = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities WHERE user_id = ? AND date >= ? AND date < ?
        `).get(userId, twoWeeksAgoStr, weekAgoStr);

        // This month's emissions
        const monthStats = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities WHERE user_id = ? AND date >= ?
        `).get(userId, monthAgoStr);

        // Last month's emissions
        const lastMonthStats = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities WHERE user_id = ? AND date >= ? AND date < ?
        `).get(userId, twoMonthsAgoStr, monthAgoStr);

        // Calculate annual projection
        const daysTracked = db.prepare(`
            SELECT COUNT(DISTINCT date) as days FROM activities WHERE user_id = ?
        `).get(userId).days || 1;

        const totalEmissions = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total FROM activities WHERE user_id = ?
        `).get(userId).total;

        const dailyAverage = totalEmissions / Math.max(daysTracked, 1);
        const annualProjection = dailyAverage * 365;

        // Calculate percentage changes
        const todayChange = yesterdayStats.total > 0 
            ? ((todayStats.total - yesterdayStats.total) / yesterdayStats.total * 100).toFixed(1)
            : 0;
        
        const weekChange = lastWeekStats.total > 0
            ? ((weekStats.total - lastWeekStats.total) / lastWeekStats.total * 100).toFixed(1)
            : 0;

        const monthChange = lastMonthStats.total > 0
            ? ((monthStats.total - lastMonthStats.total) / lastMonthStats.total * 100).toFixed(1)
            : 0;

        // Compare to global average
        const globalComparison = ((annualProjection - GLOBAL_AVERAGES.global) / GLOBAL_AVERAGES.global * 100).toFixed(0);

        // Get user info
        const user = db.prepare('SELECT xp, level, streak FROM users WHERE id = ?').get(userId);

        res.json({
            today: {
                emissions: todayStats.total.toFixed(1),
                change: parseFloat(todayChange),
                trend: parseFloat(todayChange) <= 0 ? 'down' : 'up'
            },
            week: {
                emissions: weekStats.total.toFixed(1),
                change: parseFloat(weekChange),
                trend: parseFloat(weekChange) <= 0 ? 'down' : 'up'
            },
            month: {
                emissions: monthStats.total.toFixed(1),
                change: parseFloat(monthChange),
                trend: parseFloat(monthChange) <= 0 ? 'down' : 'up'
            },
            annual: {
                projection: (annualProjection / 1000).toFixed(2),
                unit: 'tons'
            },
            comparison: {
                global: parseFloat(globalComparison),
                isBelow: parseFloat(globalComparison) < 0
            },
            user: {
                xp: user.xp,
                level: user.level,
                streak: user.streak
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
    }
});

// Get chart data
router.get('/charts', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const { range = 'week' } = req.query;

        let days, groupBy, dateFormat;
        const endDate = new Date();
        let startDate = new Date();

        switch (range) {
            case 'week':
                days = 7;
                startDate.setDate(startDate.getDate() - 6);
                groupBy = 'date';
                break;
            case 'month':
                days = 30;
                startDate.setDate(startDate.getDate() - 29);
                groupBy = 'date';
                break;
            case 'year':
                days = 365;
                startDate.setFullYear(startDate.getFullYear() - 1);
                groupBy = "strftime('%Y-%m', date)";
                break;
            default:
                days = 7;
                startDate.setDate(startDate.getDate() - 6);
                groupBy = 'date';
        }

        // Get emissions over time
        let emissionsQuery;
        if (range === 'year') {
            emissionsQuery = db.prepare(`
                SELECT strftime('%Y-%m', date) as period, SUM(emissions) as total
                FROM activities
                WHERE user_id = ? AND date >= ?
                GROUP BY strftime('%Y-%m', date)
                ORDER BY period
            `);
        } else {
            emissionsQuery = db.prepare(`
                SELECT date as period, SUM(emissions) as total
                FROM activities
                WHERE user_id = ? AND date >= ?
                GROUP BY date
                ORDER BY date
            `);
        }

        const emissionsData = emissionsQuery.all(userId, startDate.toISOString().split('T')[0]);

        // Generate labels and fill missing data
        const labels = [];
        const data = [];
        const emissionsMap = new Map(emissionsData.map(e => [e.period, e.total]));

        if (range === 'year') {
            for (let i = 11; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const key = d.toISOString().slice(0, 7);
                labels.push(d.toLocaleString('default', { month: 'short' }));
                data.push(emissionsMap.get(key) || 0);
            }
        } else {
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().split('T')[0];
                labels.push(range === 'week' ? d.toLocaleString('default', { weekday: 'short' }) : d.getDate().toString());
                data.push(emissionsMap.get(key) || 0);
            }
        }

        // Get category breakdown
        const categoryData = db.prepare(`
            SELECT category, SUM(emissions) as total
            FROM activities
            WHERE user_id = ? AND date >= ?
            GROUP BY category
            ORDER BY total DESC
        `).all(userId, startDate.toISOString().split('T')[0]);

        const totalEmissions = categoryData.reduce((sum, c) => sum + c.total, 0) || 1;
        const categories = categoryData.map(c => ({
            category: c.category,
            total: c.total.toFixed(1),
            percentage: Math.round((c.total / totalEmissions) * 100)
        }));

        res.json({
            timeline: { labels, data },
            categories,
            range
        });
    } catch (error) {
        console.error('Chart data error:', error);
        res.status(500).json({ error: 'Failed to fetch chart data', message: error.message });
    }
});

// Get comparison data
router.get('/comparison', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const { region = 'default' } = req.query;

        // Calculate user's annual emissions
        const totalEmissions = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total FROM activities WHERE user_id = ?
        `).get(userId).total;

        const daysTracked = db.prepare(`
            SELECT COUNT(DISTINCT date) as days FROM activities WHERE user_id = ?
        `).get(userId).days || 1;

        const annualProjection = (totalEmissions / daysTracked) * 365;

        const regionalAvg = GLOBAL_AVERAGES.regional[region] || GLOBAL_AVERAGES.regional.default;

        res.json({
            user: {
                annual: (annualProjection / 1000).toFixed(2),
                percentage: Math.round((annualProjection / GLOBAL_AVERAGES.global) * 100)
            },
            regional: {
                annual: (regionalAvg / 1000).toFixed(1),
                percentage: Math.round((regionalAvg / GLOBAL_AVERAGES.global) * 100)
            },
            global: {
                annual: (GLOBAL_AVERAGES.global / 1000).toFixed(1),
                percentage: 100
            },
            target: {
                annual: (GLOBAL_AVERAGES.target2030 / 1000).toFixed(1),
                percentage: Math.round((GLOBAL_AVERAGES.target2030 / GLOBAL_AVERAGES.global) * 100)
            }
        });
    } catch (error) {
        console.error('Comparison data error:', error);
        res.status(500).json({ error: 'Failed to fetch comparison data', message: error.message });
    }
});

// Get activity summary by date
router.get('/summary/:date', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const { date } = req.params;

        const activities = db.prepare(`
            SELECT * FROM activities WHERE user_id = ? AND date = ?
            ORDER BY created_at DESC
        `).all(userId, date);

        const totals = db.prepare(`
            SELECT 
                COUNT(*) as count,
                COALESCE(SUM(emissions), 0) as emissions
            FROM activities WHERE user_id = ? AND date = ?
        `).get(userId, date);

        // Calculate carbon saved (eco choices vs alternatives)
        let carbonSaved = 0;
        activities.forEach(a => {
            if (a.category === 'transport') {
                const desc = a.description.toLowerCase();
                if (desc.includes('bike') || desc.includes('walk') || desc.includes('bus') || desc.includes('train')) {
                    carbonSaved += a.value * 0.15; // Savings vs driving
                }
            }
        });

        res.json({
            date,
            activities,
            summary: {
                count: totals.count,
                totalEmissions: totals.emissions.toFixed(1),
                carbonSaved: carbonSaved.toFixed(1)
            }
        });
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ error: 'Failed to fetch summary', message: error.message });
    }
});

module.exports = router;
