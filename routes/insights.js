// ===== Insights Routes =====
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { generateInsights, identifyTrends, generateAISummary, getInsights, generateAIInsights } = require('../utils/insights-engine');

// Get all insights for user (AI-powered with fallback)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 10, refresh = 'false' } = req.query;
        const forceRefresh = refresh === 'true';

        // Get AI-powered insights (with caching and fallback)
        const insightsData = await getInsights(userId, forceRefresh);

        // Get enhanced statistics
        const stats = getEnhancedStats(userId);

        res.json({
            source: insightsData.source,
            model: insightsData.model || null,
            aiSummary: {
                summary: insightsData.summary
            },
            topInsight: insightsData.topInsight,
            insights: (insightsData.insights || []).slice(0, parseInt(limit)),
            trends: insightsData.trends || identifyTrends(userId),
            encouragement: insightsData.encouragement,
            stats: stats,
            generatedAt: insightsData.generatedAt
        });
    } catch (error) {
        console.error('Insights error:', error);
        res.status(500).json({ error: 'Failed to generate insights', message: error.message });
    }
});

// Get enhanced statistics for insights
function getEnhancedStats(userId) {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Normalize category names
    const normalizeCategory = (cat) => {
        const lower = (cat || '').toLowerCase();
        if (lower === 'energy' || lower === 'electricity') return 'electricity';
        if (lower === 'food' || lower === 'diet') return 'diet';
        return lower;
    };

    // Category breakdown (raw from DB)
    const rawBreakdown = db.prepare(`
        SELECT category, 
               COUNT(*) as count,
               SUM(emissions) as total_emissions,
               AVG(emissions) as avg_emissions
        FROM activities 
        WHERE user_id = ? AND date >= ?
        GROUP BY category
        ORDER BY total_emissions DESC
    `).all(userId, monthAgo.toISOString().split('T')[0]);

    // Merge categories (energy → electricity, food → diet)
    const mergedMap = new Map();
    for (const c of rawBreakdown) {
        const normalizedCat = normalizeCategory(c.category);
        if (mergedMap.has(normalizedCat)) {
            const existing = mergedMap.get(normalizedCat);
            existing.count += c.count;
            existing.total_emissions += c.total_emissions || 0;
        } else {
            mergedMap.set(normalizedCat, {
                category: normalizedCat,
                count: c.count,
                total_emissions: c.total_emissions || 0
            });
        }
    }

    const categoryBreakdown = Array.from(mergedMap.values());
    categoryBreakdown.sort((a, b) => b.total_emissions - a.total_emissions);

    const totalEmissions = categoryBreakdown.reduce((sum, c) => sum + c.total_emissions, 0);

    // Add percentages and format
    const breakdown = categoryBreakdown.map(c => ({
        category: c.category,
        count: c.count,
        emissions: parseFloat(c.total_emissions.toFixed(2)),
        avgPerActivity: parseFloat((c.total_emissions / c.count).toFixed(2)),
        percentage: totalEmissions > 0 ? Math.round((c.total_emissions / totalEmissions) * 100) : 0
    }));

    // Weekly comparison
    const thisWeekEmissions = db.prepare(`
        SELECT COALESCE(SUM(emissions), 0) as total FROM activities 
        WHERE user_id = ? AND date >= ?
    `).get(userId, weekAgo.toISOString().split('T')[0]).total;

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const lastWeekEmissions = db.prepare(`
        SELECT COALESCE(SUM(emissions), 0) as total FROM activities 
        WHERE user_id = ? AND date >= ? AND date < ?
    `).get(userId, twoWeeksAgo.toISOString().split('T')[0], weekAgo.toISOString().split('T')[0]).total;

    const weeklyChange = lastWeekEmissions > 0 
        ? Math.round(((thisWeekEmissions - lastWeekEmissions) / lastWeekEmissions) * 100) 
        : 0;

    // Activity patterns
    const activityCount = db.prepare(`
        SELECT COUNT(*) as count FROM activities WHERE user_id = ? AND date >= ?
    `).get(userId, monthAgo.toISOString().split('T')[0]).count;

    const daysActive = db.prepare(`
        SELECT COUNT(DISTINCT date) as days FROM activities WHERE user_id = ? AND date >= ?
    `).get(userId, monthAgo.toISOString().split('T')[0]).days;

    // Best performing category (lowest per-activity emissions)
    const bestCategory = breakdown.length > 0 
        ? breakdown.reduce((best, c) => c.avgPerActivity < best.avgPerActivity ? c : best, breakdown[0])
        : null;

    // Highest impact category
    const highestImpact = breakdown.length > 0 ? breakdown[0] : null;

    // Daily average
    const dailyAverage = daysActive > 0 ? (totalEmissions / daysActive) : 0;

    // Global average comparison (4.8 tons/year = 13.15 kg/day)
    const globalDailyAvg = 13.15;
    const vsGlobalPercent = globalDailyAvg > 0 
        ? Math.round(((dailyAverage - globalDailyAvg) / globalDailyAvg) * 100) 
        : 0;

    return {
        breakdown,
        totals: {
            monthly: parseFloat(totalEmissions.toFixed(2)),
            weekly: parseFloat(thisWeekEmissions.toFixed(2)),
            dailyAverage: parseFloat(dailyAverage.toFixed(2)),
            activityCount,
            daysActive
        },
        comparison: {
            weeklyChange,
            vsGlobal: vsGlobalPercent,
            isAboveAverage: dailyAverage > globalDailyAvg
        },
        highlights: {
            highestImpact: highestImpact ? {
                category: highestImpact.category,
                emissions: highestImpact.emissions,
                percentage: highestImpact.percentage
            } : null,
            bestCategory: bestCategory ? {
                category: bestCategory.category,
                avgPerActivity: bestCategory.avgPerActivity
            } : null
        }
    };
}

// Force refresh AI insights
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Force regenerate AI insights
        const insightsData = await getInsights(userId, true);

        res.json({
            message: 'Insights refreshed',
            source: insightsData.source,
            generatedAt: insightsData.generatedAt
        });
    } catch (error) {
        console.error('Refresh insights error:', error);
        res.status(500).json({ error: 'Failed to refresh insights', message: error.message });
    }
});

// Get specific insight details
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const insights = generateInsights(userId);
        const insight = insights.find(i => i.id === id);

        if (!insight) {
            return res.status(404).json({ error: 'Insight not found' });
        }

        // Add more details for specific insights
        const enhancedInsight = {
            ...insight,
            tips: getInsightTips(id),
            resources: getInsightResources(id)
        };

        res.json({ insight: enhancedInsight });
    } catch (error) {
        console.error('Get insight error:', error);
        res.status(500).json({ error: 'Failed to get insight', message: error.message });
    }
});

// Dismiss an insight
router.post('/:id/dismiss', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        // Store dismissed insight in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Re-show after 30 days

        db.prepare(`
            INSERT OR REPLACE INTO insights (user_id, insight_type, category, title, description, is_dismissed, expires_at)
            VALUES (?, ?, 'dismissed', ?, '', 1, ?)
        `).run(userId, id, id, expiresAt.toISOString());

        res.json({ message: 'Insight dismissed', expiresAt: expiresAt.toISOString() });
    } catch (error) {
        console.error('Dismiss insight error:', error);
        res.status(500).json({ error: 'Failed to dismiss insight', message: error.message });
    }
});

// Get trends analysis
router.get('/analysis/trends', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const trends = identifyTrends(userId);

        res.json({ trends });
    } catch (error) {
        console.error('Trends error:', error);
        res.status(500).json({ error: 'Failed to analyze trends', message: error.message });
    }
});

// Get category-specific recommendations
router.get('/category/:category', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const { category } = req.params;

        const allInsights = generateInsights(userId);
        const categoryInsights = allInsights.filter(i => i.category === category);

        res.json({
            category,
            insights: categoryInsights,
            tips: getCategoryTips(category)
        });
    } catch (error) {
        console.error('Category insights error:', error);
        res.status(500).json({ error: 'Failed to get category insights', message: error.message });
    }
});

// Helper function: Get tips for specific insights
function getInsightTips(insightId) {
    const tips = {
        'switch-to-public-transit': [
            'Plan your route using public transit apps',
            'Get a monthly pass for cost savings',
            'Use travel time productively - read or work',
            'Combine with cycling for the "last mile"'
        ],
        'try-cycling': [
            'Start with just one day per week',
            'Invest in a comfortable, reliable bike',
            'Use bike lanes and quiet streets',
            'Keep rain gear at work for bad weather'
        ],
        'switch-renewable': [
            'Compare green energy providers in your area',
            'Look for 100% renewable options',
            'Consider installing solar panels',
            'Many providers offer competitive rates'
        ],
        'meatless-days': [
            'Start with "Meatless Monday"',
            'Explore cuisines that are naturally vegetarian (Indian, Mediterranean)',
            'Learn to cook 3-4 delicious veggie meals',
            'Focus on what you\'re adding, not removing'
        ],
        'start-composting': [
            'Start with a simple countertop bin',
            'Compost fruit/veggie scraps, coffee grounds, eggshells',
            'Avoid meat, dairy, and oily foods',
            'Use the compost in your garden or donate it'
        ]
    };
    return tips[insightId] || ['Follow the recommendation to reduce your carbon footprint'];
}

// Helper function: Get resources for insights
function getInsightResources(insightId) {
    const resources = {
        'switch-to-public-transit': [
            { title: 'Local Transit Authority', type: 'link' },
            { title: 'Transit App Recommendations', type: 'article' }
        ],
        'switch-renewable': [
            { title: 'Green Energy Providers Comparison', type: 'tool' },
            { title: 'Solar Panel Calculator', type: 'tool' }
        ],
        'meatless-days': [
            { title: 'Easy Vegetarian Recipes', type: 'recipes' },
            { title: 'Plant-Based Protein Guide', type: 'guide' }
        ]
    };
    return resources[insightId] || [];
}

// Helper function: Get tips for categories
function getCategoryTips(category) {
    const categoryTips = {
        transport: [
            'Walk or bike for trips under 2km',
            'Use public transit for longer commutes',
            'Carpool when driving is necessary',
            'Maintain your vehicle for efficiency',
            'Consider an electric or hybrid vehicle'
        ],
        energy: [
            'Switch to LED bulbs throughout your home',
            'Unplug devices when not in use',
            'Use smart power strips',
            'Set thermostats efficiently',
            'Consider renewable energy providers'
        ],
        diet: [
            'Reduce red meat consumption',
            'Buy local and seasonal produce',
            'Plan meals to reduce food waste',
            'Grow some of your own herbs/vegetables',
            'Choose products with less packaging'
        ],
        waste: [
            'Follow the 5 Rs: Refuse, Reduce, Reuse, Recycle, Rot',
            'Bring reusable bags, bottles, and containers',
            'Compost food scraps',
            'Repair before replacing',
            'Buy second-hand when possible'
        ]
    };
    return categoryTips[category] || [];
}

module.exports = router;
