// ===== ML Insights Engine =====
// Rule-based recommendation system with pattern analysis

const db = require('../database/db');

// Insight templates with conditions
const INSIGHT_TEMPLATES = {
    transport: [
        {
            id: 'switch-to-public-transit',
            title: 'Switch to Public Transit',
            description: 'Your car usage accounts for a significant portion of emissions. Using public transit just 2 days a week could reduce your transport footprint by 40%.',
            condition: (data) => data.carTrips > 5 && data.publicTransitTrips < 2,
            calculateSavings: (data) => data.carEmissions * 0.4,
            priority: 9,
            category: 'transport'
        },
        {
            id: 'try-cycling',
            title: 'Try Active Commuting',
            description: 'Short trips under 5km are perfect for cycling. You could save emissions and improve your health!',
            condition: (data) => data.shortCarTrips > 3,
            calculateSavings: (data) => data.shortCarTrips * 2.5,
            priority: 8,
            category: 'transport'
        },
        {
            id: 'carpooling',
            title: 'Consider Carpooling',
            description: 'Sharing rides with colleagues or neighbors could cut your transport emissions in half.',
            condition: (data) => data.soloCarTrips > 8,
            calculateSavings: (data) => data.carEmissions * 0.3,
            priority: 7,
            category: 'transport'
        },
        {
            id: 'reduce-flights',
            title: 'Reduce Air Travel',
            description: 'A single flight can emit more CO2 than months of driving. Consider video calls for business or trains for shorter trips.',
            condition: (data) => data.flightEmissions > 100,
            calculateSavings: (data) => data.flightEmissions * 0.5,
            priority: 10,
            category: 'transport'
        }
    ],
    energy: [
        {
            id: 'switch-renewable',
            title: 'Switch to Renewable Energy',
            description: 'Your area has green energy providers available. Switching could reduce your electricity emissions by up to 90%.',
            condition: (data) => data.energySource !== 'renewable' && data.electricityEmissions > 20,
            calculateSavings: (data) => data.electricityEmissions * 0.85,
            priority: 9,
            category: 'energy'
        },
        {
            id: 'reduce-standby',
            title: 'Eliminate Standby Power',
            description: 'Electronic devices on standby can account for 10% of electricity use. Use power strips to easily turn them off.',
            condition: (data) => data.electricityUsage > 300,
            calculateSavings: (data) => data.electricityEmissions * 0.1,
            priority: 6,
            category: 'energy'
        },
        {
            id: 'led-lighting',
            title: 'Switch to LED Lighting',
            description: 'LED bulbs use 75% less energy than incandescent bulbs and last 25 times longer.',
            condition: (data) => data.electricityUsage > 250,
            calculateSavings: (data) => data.electricityEmissions * 0.05,
            priority: 5,
            category: 'energy'
        },
        {
            id: 'smart-thermostat',
            title: 'Install a Smart Thermostat',
            description: 'Optimizing your heating schedule can reduce energy use by 10-15% without sacrificing comfort.',
            condition: (data) => data.heatingEmissions > 30,
            calculateSavings: (data) => data.heatingEmissions * 0.12,
            priority: 7,
            category: 'energy'
        }
    ],
    diet: [
        {
            id: 'meatless-days',
            title: 'Try Meatless Days',
            description: 'Reducing meat consumption by just one day per week can significantly lower your dietary carbon footprint.',
            condition: (data) => data.dietType === 'meat-heavy' || data.dietType === 'average',
            calculateSavings: (data) => (data.dietEmissions || 40) * 0.15,
            priority: 8,
            category: 'diet'
        },
        {
            id: 'local-seasonal',
            title: 'Choose Local & Seasonal',
            description: 'Locally sourced, seasonal produce requires less transportation and storage, reducing emissions by 10-15%.',
            condition: (data) => !data.localFood,
            calculateSavings: (data) => (data.dietEmissions || 30) * 0.12,
            priority: 6,
            category: 'diet'
        },
        {
            id: 'reduce-food-waste',
            title: 'Reduce Food Waste',
            description: 'About 30% of food is wasted. Planning meals and using leftovers can cut diet emissions significantly.',
            condition: (data) => !data.lowFoodWaste,
            calculateSavings: (data) => (data.dietEmissions || 30) * 0.2,
            priority: 7,
            category: 'diet'
        },
        {
            id: 'plant-protein',
            title: 'Explore Plant Proteins',
            description: 'Beans, lentils, and tofu have 10-50x lower emissions than beef. Try swapping just a few meals.',
            condition: (data) => data.dietType !== 'vegetarian' && data.dietType !== 'vegan',
            calculateSavings: (data) => (data.dietEmissions || 35) * 0.2,
            priority: 7,
            category: 'diet'
        }
    ],
    waste: [
        {
            id: 'start-composting',
            title: 'Start Composting',
            description: 'Composting food waste prevents methane emissions from landfills and creates nutrient-rich soil.',
            condition: (data) => !data.composts && data.wasteEmissions > 5,
            calculateSavings: (data) => (data.wasteEmissions || 10) * 0.3,
            priority: 7,
            category: 'waste'
        },
        {
            id: 'improve-recycling',
            title: 'Improve Recycling Habits',
            description: 'Recycling just one more material type (paper, plastic, glass, or metal) can reduce waste emissions by 10%.',
            condition: (data) => data.recyclingScore < 4,
            calculateSavings: (data) => (data.wasteEmissions || 8) * 0.1,
            priority: 6,
            category: 'waste'
        },
        {
            id: 'reduce-single-use',
            title: 'Reduce Single-Use Items',
            description: 'Switching to reusable bags, bottles, and containers can eliminate significant waste and emissions.',
            condition: (data) => data.singleUseLevel === 'high' || data.singleUseLevel === 'medium',
            calculateSavings: (data) => (data.wasteEmissions || 8) * 0.15,
            priority: 6,
            category: 'waste'
        }
    ]
};

// Analyze user data and generate insights
function analyzeUserData(userId) {
    const data = {};

    // Get user's activities from last 30 days
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    const activities = db.prepare(`
        SELECT * FROM activities 
        WHERE user_id = ? AND date >= ?
    `).all(userId, monthAgoStr);

    // Get calculator profile
    const profile = db.prepare(`
        SELECT * FROM calculator_profiles WHERE user_id = ?
    `).get(userId);

    // Analyze transport
    const transportActivities = activities.filter(a => a.category === 'transport');
    data.carTrips = transportActivities.filter(a => 
        a.description.toLowerCase().includes('car') || 
        a.description.toLowerCase().includes('drove')
    ).length;
    data.publicTransitTrips = transportActivities.filter(a =>
        a.description.toLowerCase().includes('bus') ||
        a.description.toLowerCase().includes('train') ||
        a.description.toLowerCase().includes('metro')
    ).length;
    data.shortCarTrips = transportActivities.filter(a =>
        (a.description.toLowerCase().includes('car') || a.description.toLowerCase().includes('drove')) &&
        a.value < 5
    ).length;
    data.soloCarTrips = data.carTrips; // Assume solo unless specified
    data.carEmissions = transportActivities
        .filter(a => a.description.toLowerCase().includes('car') || a.description.toLowerCase().includes('drove'))
        .reduce((sum, a) => sum + a.emissions, 0);
    data.flightEmissions = transportActivities
        .filter(a => a.description.toLowerCase().includes('flight') || a.description.toLowerCase().includes('plane'))
        .reduce((sum, a) => sum + a.emissions, 0);
    data.transportEmissions = transportActivities.reduce((sum, a) => sum + a.emissions, 0);

    // Analyze electricity
    const electricityActivities = activities.filter(a => a.category === 'electricity');
    data.electricityEmissions = electricityActivities.reduce((sum, a) => sum + a.emissions, 0);
    data.electricityUsage = electricityActivities.reduce((sum, a) => sum + a.value, 0);
    data.energySource = profile?.energy_source || 'mixed';

    // Analyze heating
    const heatingActivities = activities.filter(a => a.category === 'heating');
    data.heatingEmissions = heatingActivities.reduce((sum, a) => sum + a.emissions, 0);

    // Analyze diet
    const dietActivities = activities.filter(a => a.category === 'diet');
    data.dietEmissions = dietActivities.reduce((sum, a) => sum + a.emissions, 0);
    data.dietType = profile?.diet_type || 'average';
    data.localFood = profile?.local_food || false;
    data.lowFoodWaste = profile?.low_food_waste || false;

    // Analyze waste
    const wasteActivities = activities.filter(a => a.category === 'waste');
    data.wasteEmissions = wasteActivities.reduce((sum, a) => sum + a.emissions, 0);
    data.composts = profile?.compost || false;
    data.recyclingScore = (profile?.recycle_paper ? 1 : 0) + 
                          (profile?.recycle_plastic ? 1 : 0) + 
                          (profile?.recycle_glass ? 1 : 0) + 
                          (profile?.recycle_metal ? 1 : 0);
    data.singleUseLevel = profile?.single_use || 'medium';

    // Calculate totals
    data.totalEmissions = activities.reduce((sum, a) => sum + a.emissions, 0);

    return data;
}

// Generate personalized insights
function generateInsights(userId) {
    const userData = analyzeUserData(userId);
    const insights = [];

    // Check all insight templates
    for (const category of Object.keys(INSIGHT_TEMPLATES)) {
        for (const template of INSIGHT_TEMPLATES[category]) {
            try {
                if (template.condition(userData)) {
                    const savings = template.calculateSavings(userData);
                    if (savings > 0) {
                        insights.push({
                            id: template.id,
                            title: template.title,
                            description: template.description,
                            category: template.category,
                            potentialSavings: Math.round(savings * 10) / 10,
                            priority: template.priority
                        });
                    }
                }
            } catch (e) {
                // Skip if template evaluation fails
            }
        }
    }

    // Sort by priority and potential savings
    insights.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.potentialSavings - a.potentialSavings;
    });

    return insights;
}

// Identify trends in user data
function identifyTrends(userId) {
    const trends = [];

    // Get emissions by category for last two weeks
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const categories = ['transport', 'electricity', 'heating', 'diet', 'waste'];

    for (const category of categories) {
        const thisWeek = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities
            WHERE user_id = ? AND category = ? AND date >= ?
        `).get(userId, category, weekAgo.toISOString().split('T')[0]);

        const lastWeek = db.prepare(`
            SELECT COALESCE(SUM(emissions), 0) as total
            FROM activities
            WHERE user_id = ? AND category = ? AND date >= ? AND date < ?
        `).get(userId, category, twoWeeksAgo.toISOString().split('T')[0], weekAgo.toISOString().split('T')[0]);

        if (lastWeek.total > 0) {
            const changePercent = Math.round(((thisWeek.total - lastWeek.total) / lastWeek.total) * 100);
            
            if (Math.abs(changePercent) >= 5) {
                let trend, message;
                if (changePercent <= -10) {
                    trend = 'positive';
                    message = `Great job! Your ${category} emissions are down ${Math.abs(changePercent)}% this week.`;
                } else if (changePercent >= 10) {
                    trend = 'negative';
                    message = `Your ${category} emissions increased ${changePercent}% this week. Consider reviewing your habits.`;
                } else {
                    trend = 'neutral';
                    message = `Your ${category} emissions are relatively stable.`;
                }

                trends.push({
                    category,
                    changePercent,
                    trend,
                    message,
                    thisWeek: thisWeek.total.toFixed(1),
                    lastWeek: lastWeek.total.toFixed(1)
                });
            }
        }
    }

    return trends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

// Generate main AI insight summary
function generateAISummary(userId) {
    const userData = analyzeUserData(userId);
    const insights = generateInsights(userId);

    // Find highest emission category
    const categories = [
        { name: 'transport', emissions: userData.transportEmissions },
        { name: 'electricity', emissions: userData.electricityEmissions },
        { name: 'heating', emissions: userData.heatingEmissions },
        { name: 'diet', emissions: userData.dietEmissions },
        { name: 'waste', emissions: userData.wasteEmissions }
    ];

    categories.sort((a, b) => b.emissions - a.emissions);
    const topCategory = categories[0];
    const totalEmissions = categories.reduce((sum, c) => sum + c.emissions, 0) || 1;
    const topPercentage = Math.round((topCategory.emissions / totalEmissions) * 100);

    // Calculate total potential savings
    const totalPotentialSavings = insights.reduce((sum, i) => sum + i.potentialSavings, 0);

    // Generate personalized summary
    let summary = `Based on your activity patterns, your highest emission source is **${topCategory.name}**, accounting for ${topPercentage}% of your footprint. `;

    if (insights.length > 0) {
        summary += `By following our top recommendations, you could reduce emissions by up to ${totalPotentialSavings.toFixed(0)} kg CO₂ per month.`;
    }

    return {
        summary,
        topCategory: {
            name: topCategory.name,
            emissions: topCategory.emissions.toFixed(1),
            percentage: topPercentage
        },
        potentialSavings: totalPotentialSavings.toFixed(0),
        insightCount: insights.length
    };
}

module.exports = {
    analyzeUserData,
    generateInsights,
    identifyTrends,
    generateAISummary,
    INSIGHT_TEMPLATES
};
