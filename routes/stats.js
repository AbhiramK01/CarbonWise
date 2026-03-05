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
        // Use calendar week boundaries (Monday-Sunday)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since Monday
        
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(now.getDate() - daysFromMonday);
        thisWeekStart.setHours(0, 0, 0, 0);
        const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];
        
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(thisWeekStart.getDate() - 7);
        const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
        
        const lastWeekEnd = new Date(thisWeekStart);
        lastWeekEnd.setDate(thisWeekStart.getDate() - 1); // Sunday of last week
        const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];
        
        // Use calendar month boundaries instead of rolling 30 days
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthStartStr = thisMonthStart.toISOString().split('T')[0];
        
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
        
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
        const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

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

        // This week's emissions (calendar week, Monday-Sunday)
        const weekStats = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities WHERE user_id = ? AND date >= ?
        `).get(userId, thisWeekStartStr);

        // Last week's emissions (previous calendar week)
        const lastWeekStats = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities WHERE user_id = ? AND date >= ? AND date <= ?
        `).get(userId, lastWeekStartStr, lastWeekEndStr);

        // This month's emissions (calendar month)
        const monthStats = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities WHERE user_id = ? AND date >= ?
        `).get(userId, thisMonthStartStr);

        // Last month's emissions (previous calendar month)
        const lastMonthStats = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities WHERE user_id = ? AND date >= ? AND date <= ?
        `).get(userId, lastMonthStartStr, lastMonthEndStr);

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
        const { range = 'week', offset = '0' } = req.query;
        const periodOffset = parseInt(offset) || 0;

        let groupBy, periodLabel;
        const now = new Date();
        let startDate, endDate;

        switch (range) {
            case 'week':
                // Calculate the target week's Monday
                const currentDay = now.getDay();
                const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
                
                // Start with this week's Monday
                const thisMonday = new Date(now);
                thisMonday.setDate(now.getDate() - daysFromMonday);
                thisMonday.setHours(0, 0, 0, 0);
                
                // Go back by offset weeks
                startDate = new Date(thisMonday);
                startDate.setDate(startDate.getDate() - (periodOffset * 7));
                
                // End date is Sunday of that week (or today if offset is 0)
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                if (periodOffset === 0) {
                    endDate = now; // Current week ends today
                }
                
                groupBy = 'date';
                
                // Generate period label
                if (periodOffset === 0) {
                    periodLabel = 'This Week';
                } else if (periodOffset === 1) {
                    periodLabel = 'Last Week';
                } else {
                    const weekStartStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const weekEndStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    periodLabel = `${weekStartStr} - ${weekEndStr}`;
                }
                break;
                
            case 'month':
                // Calculate the target month
                const targetMonth = new Date(now.getFullYear(), now.getMonth() - periodOffset, 1);
                startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
                
                // End is last day of month or today if current month
                if (periodOffset === 0) {
                    endDate = now;
                } else {
                    endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
                }
                
                groupBy = 'date';
                
                // Generate period label
                if (periodOffset === 0) {
                    periodLabel = 'This Month';
                } else {
                    periodLabel = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }
                break;
                
            case 'year':
                // Calculate the target year
                const targetYear = now.getFullYear() - periodOffset;
                startDate = new Date(targetYear, 0, 1);
                
                // End is Dec 31 or today if current year
                if (periodOffset === 0) {
                    endDate = now;
                } else {
                    endDate = new Date(targetYear, 11, 31);
                }
                
                groupBy = "strftime('%Y-%m', date)";
                
                // Generate period label
                if (periodOffset === 0) {
                    periodLabel = 'This Year';
                } else {
                    periodLabel = `${targetYear}`;
                }
                break;
                
            default:
                startDate = new Date(now);
                const defaultDay = startDate.getDay();
                const defaultDaysFromMonday = defaultDay === 0 ? 6 : defaultDay - 1;
                startDate.setDate(startDate.getDate() - defaultDaysFromMonday);
                endDate = now;
                groupBy = 'date';
                periodLabel = 'This Week';
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Get emissions over time
        let emissionsQuery;
        if (range === 'year') {
            emissionsQuery = db.prepare(`
                SELECT strftime('%Y-%m', date) as period, SUM(emissions) as total
                FROM activities
                WHERE user_id = ? AND date >= ? AND date <= ?
                GROUP BY strftime('%Y-%m', date)
                ORDER BY period
            `);
        } else {
            emissionsQuery = db.prepare(`
                SELECT date as period, SUM(emissions) as total
                FROM activities
                WHERE user_id = ? AND date >= ? AND date <= ?
                GROUP BY date
                ORDER BY date
            `);
        }

        const emissionsData = emissionsQuery.all(userId, startDateStr, endDateStr);

        // Generate labels and fill missing data
        const labels = [];
        const data = [];
        const emissionsMap = new Map(emissionsData.map(e => [e.period, e.total]));

        if (range === 'year') {
            // Year view: show all months
            const targetYear = startDate.getFullYear();
            const endMonth = periodOffset === 0 ? now.getMonth() : 11;
            for (let i = 0; i <= endMonth; i++) {
                const d = new Date(targetYear, i, 1);
                const key = d.toISOString().slice(0, 7);
                labels.push(d.toLocaleString('default', { month: 'short' }));
                data.push(emissionsMap.get(key) || 0);
            }
        } else {
            // Week and month: iterate through the date range
            const tempDate = new Date(startDate);
            tempDate.setHours(0, 0, 0, 0);
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            
            while (tempDate <= endDateObj) {
                const key = tempDate.toISOString().split('T')[0];
                if (range === 'week') {
                    labels.push(tempDate.toLocaleString('default', { weekday: 'short' }));
                } else {
                    labels.push(tempDate.getDate().toString());
                }
                data.push(emissionsMap.get(key) || 0);
                tempDate.setDate(tempDate.getDate() + 1);
            }
        }

        // Get category breakdown for the period
        const categoryData = db.prepare(`
            SELECT category, SUM(emissions) as total
            FROM activities
            WHERE user_id = ? AND date >= ? AND date <= ?
            GROUP BY category
            ORDER BY total DESC
        `).all(userId, startDateStr, endDateStr);

        const totalEmissions = categoryData.reduce((sum, c) => sum + c.total, 0) || 1;
        const categories = categoryData.map(c => ({
            category: c.category,
            total: c.total.toFixed(1),
            percentage: Math.round((c.total / totalEmissions) * 100)
        }));

        res.json({
            timeline: { labels, data },
            categories,
            range,
            offset: periodOffset,
            periodLabel,
            startDate: startDateStr,
            endDate: endDateStr
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
