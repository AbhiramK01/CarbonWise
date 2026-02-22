// ===== Activities Routes =====
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { checkBadges, awardXP, updateGoalProgress } = require('../utils/gamification');

// Emission factors (kg CO2 per unit)
const EMISSION_FACTORS = {
    electricity: {
        mixed: 0.5,
        coal: 0.9,
        'natural-gas': 0.4,
        nuclear: 0.02,
        renewable: 0.05
    },
    transport: {
        car: { petrol: 0.21, diesel: 0.18, hybrid: 0.12, electric: 0.05 },
        bus: 0.089,
        train: 0.041,
        plane: 0.255,
        bike: 0,
        walk: 0,
        metro: 0.035,
        carpool: 0.07
    },
    heating: {
        'natural-gas': 2.0,
        oil: 2.5,
        electric: 1.5,
        wood: 0.3,
        'heat-pump': 0.5
    },
    diet: {
        'meat-heavy': 7.2,
        average: 5.6,
        'low-meat': 4.2,
        vegetarian: 3.8,
        vegan: 2.9
    },
    waste: {
        perBag: 0.5,
        recyclingReduction: 0.1,
        compostReduction: 0.2
    }
};

// Get all activities for user
router.get('/', authenticateToken, (req, res) => {
    try {
        const { date, startDate, endDate, category, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM activities WHERE user_id = ?';
        const params = [req.user.id];

        if (date) {
            query += ' AND date = ?';
            params.push(date);
        } else if (startDate && endDate) {
            query += ' AND date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const rawActivities = db.prepare(query).all(...params);
        
        // Transform to include frontend-expected field names
        const activities = rawActivities.map(a => ({
            ...a,
            activity_type: a.description,
            amount: a.value
        }));

        // Get total count
        let countQuery = 'SELECT COUNT(*) as count FROM activities WHERE user_id = ?';
        const countParams = [req.user.id];
        if (date) {
            countQuery += ' AND date = ?';
            countParams.push(date);
        }
        if (category) {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }
        const total = db.prepare(countQuery).get(...countParams).count;

        res.json({ activities, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ error: 'Failed to fetch activities', message: error.message });
    }
});

// Helper to detect eco-friendly activity type from description
function detectActivityType(category, description) {
    const desc = (description || '').toLowerCase();
    
    // Preserve exact calculator activity types
    const calculatorTypes = ['electricity', 'driving', 'heating', 'daily_diet', 'household_waste'];
    if (calculatorTypes.includes(desc)) {
        return desc;
    }
    
    if (category === 'transport') {
        if (desc.includes('bike') || desc.includes('cycling') || desc.includes('biking')) return 'bike';
        if (desc.includes('walk') || desc.includes('walking')) return 'walk';
        if (desc.includes('bus')) return 'bus';
        if (desc.includes('train') || desc.includes('rail')) return 'train';
        if (desc.includes('metro') || desc.includes('subway') || desc.includes('underground')) return 'metro';
        if (desc.includes('carpool') || desc.includes('shared ride') || desc.includes('ride share')) return 'carpool';
        if (desc.includes('car') || desc.includes('drive') || desc.includes('driving')) return 'car';
    }
    
    if (category === 'diet' || category === 'food') {
        if (desc.includes('vegan')) return 'vegan';
        if (desc.includes('vegetarian') || desc.includes('veggie')) return 'vegetarian';
        if (desc.includes('low meat') || desc.includes('low-meat') || desc.includes('less meat')) return 'low-meat';
    }
    
    if (category === 'electricity' || category === 'energy') {
        if (desc.includes('solar')) return 'solar';
        if (desc.includes('wind')) return 'wind';
        if (desc.includes('renewable') || desc.includes('green energy')) return 'renewable';
        if (desc.includes('nuclear')) return 'nuclear';
    }
    
    return description;
}

// Create new activity
router.post('/', authenticateToken, (req, res) => {
    try {
        // Support both old and new field names for compatibility
        const { 
            category, 
            description, activity_type,
            value, amount,
            unit, 
            date,
            subType, fuelType 
        } = req.body;

        const activityDescription = description || activity_type || 'Unknown activity';
        const rawValue = value !== undefined ? value : (amount !== undefined ? amount : null);
        const activityValue = rawValue !== null ? parseFloat(rawValue) : null;
        const activityDate = date || new Date().toISOString().split('T')[0];
        const activityUnit = unit || 'kg';

        if (!category || activityValue === null || isNaN(activityValue)) {
            return res.status(400).json({ error: 'Category and value/amount are required' });
        }

        // Calculate emissions
        let emissions = 0;
        const calcType = subType || detectActivityType(category, activityDescription);
        switch (category) {
            case 'transport':
                if (calcType === 'car') {
                    // Car has nested fuel types - default to petrol if not specified
                    const fuelFactor = EMISSION_FACTORS.transport.car[fuelType] || EMISSION_FACTORS.transport.car.petrol;
                    emissions = activityValue * fuelFactor;
                } else if (calcType in EMISSION_FACTORS.transport && typeof EMISSION_FACTORS.transport[calcType] === 'number') {
                    // Use 'in' operator to check for property existence, not truthiness
                    // This allows bike/walk with 0 emissions to work correctly
                    emissions = activityValue * EMISSION_FACTORS.transport[calcType];
                } else {
                    emissions = activityValue * 0.21; // Default to car petrol
                }
                break;
            case 'electricity':
            case 'energy':
                emissions = activityValue * (EMISSION_FACTORS.electricity[calcType] || 0.5);
                break;
            case 'heating':
                emissions = activityValue * (EMISSION_FACTORS.heating[calcType] || 2.0);
                break;
            case 'diet':
            case 'food':
                emissions = activityValue * (EMISSION_FACTORS.diet[calcType] || 1.8);
                break;
            case 'waste':
                emissions = activityValue * EMISSION_FACTORS.waste.perBag;
                break;
            default:
                emissions = activityValue * 0.5;
        }

        const result = db.prepare(`
            INSERT INTO activities (user_id, category, description, value, unit, emissions, date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.id, category, activityDescription, activityValue, activityUnit, emissions, activityDate);

        // Update user streak
        const today = new Date().toISOString().split('T')[0];
        const user = db.prepare('SELECT last_activity_date, streak FROM users WHERE id = ?').get(req.user.id);
        
        let newStreak = user ? (user.streak || 0) : 0;
        if (user && user.last_activity_date !== today) {
            const lastDate = new Date(user.last_activity_date);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                newStreak = user.streak + 1;
            } else if (diffDays > 1) {
                newStreak = 1;
            }
            
            db.prepare('UPDATE users SET streak = ?, last_activity_date = ? WHERE id = ?').run(newStreak, today, req.user.id);
        }

        // Award XP for logging activity
        awardXP(req.user.id, 10);

        // Check for new badges
        checkBadges(req.user.id);

        // Update goal progress based on activity
        updateGoalProgress(req.user.id, category, calcType, activityValue, emissions);

        // Get the newly created activity
        let activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
        
        // Fallback: if not found by id, get the most recent activity for this user
        if (!activity) {
            activity = db.prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
        }
        
        // Transform to include frontend-expected field names
        const responseActivity = activity ? {
            ...activity,
            activity_type: activity.description,
            amount: activity.value
        } : { id: result.lastInsertRowid, category, description: activityDescription, value: activityValue };

        res.status(201).json({
            message: 'Activity logged successfully',
            activity: responseActivity,
            xpEarned: 10,
            streak: newStreak
        });
    } catch (error) {
        console.error('Create activity error:', error);
        res.status(500).json({ error: 'Failed to create activity', message: error.message });
    }
});

// Update activity
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const { category, description, value, unit, date, subType, fuelType } = req.body;

        // Check ownership
        const activity = db.prepare('SELECT * FROM activities WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        // Recalculate emissions if value or category changed
        let emissions = activity.emissions;
        if (value !== undefined || category || subType) {
            const cat = category || activity.category;
            const val = value !== undefined ? value : activity.value;
            
            switch (cat) {
                case 'transport':
                    if (subType === 'car') {
                        const fuelFactor = EMISSION_FACTORS.transport.car[fuelType] || EMISSION_FACTORS.transport.car.petrol;
                        emissions = val * fuelFactor;
                    } else if (EMISSION_FACTORS.transport[subType] && typeof EMISSION_FACTORS.transport[subType] === 'number') {
                        emissions = val * EMISSION_FACTORS.transport[subType];
                    } else {
                        emissions = val * 0.21;
                    }
                    break;
                case 'electricity':
                    emissions = val * (EMISSION_FACTORS.electricity[subType] || 0.5);
                    break;
                default:
                    emissions = val * 0.5;
            }
        }

        db.prepare(`
            UPDATE activities SET
                category = COALESCE(?, category),
                description = COALESCE(?, description),
                value = COALESCE(?, value),
                unit = COALESCE(?, unit),
                date = COALESCE(?, date),
                emissions = ?
            WHERE id = ? AND user_id = ?
        `).run(category, description, value, unit, date, emissions, id, req.user.id);

        const updatedActivity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
        res.json({ message: 'Activity updated', activity: updatedActivity });
    } catch (error) {
        console.error('Update activity error:', error);
        res.status(500).json({ error: 'Failed to update activity', message: error.message });
    }
});

// Delete activity
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;

        const activity = db.prepare('SELECT * FROM activities WHERE id = ? AND user_id = ?').get(id, req.user.id);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        db.prepare('DELETE FROM activities WHERE id = ? AND user_id = ?').run(id, req.user.id);

        res.json({ message: 'Activity deleted' });
    } catch (error) {
        console.error('Delete activity error:', error);
        res.status(500).json({ error: 'Failed to delete activity', message: error.message });
    }
});

// Get emission factors
router.get('/factors', (req, res) => {
    res.json(EMISSION_FACTORS);
});

module.exports = router;
