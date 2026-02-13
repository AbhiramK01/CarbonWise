// ===== Insights Routes =====
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { generateInsights, identifyTrends, generateAISummary } = require('../utils/insights-engine');

// Get all insights for user
router.get('/', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 10 } = req.query;

        // Generate fresh insights based on user data
        const insights = generateInsights(userId);

        // Get AI summary
        const aiSummary = generateAISummary(userId);

        // Get trends
        const trends = identifyTrends(userId);

        res.json({
            aiSummary,
            insights: insights.slice(0, parseInt(limit)),
            trends,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Insights error:', error);
        res.status(500).json({ error: 'Failed to generate insights', message: error.message });
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
