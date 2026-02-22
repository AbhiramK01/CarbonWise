// ===== Ollama LLM Client =====
// Integration with local Ollama for AI-powered insights

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const OLLAMA_TIMEOUT = parseInt(process.env.OLLAMA_TIMEOUT) || 60000; // 60 seconds

/**
 * Check if Ollama server is available
 */
async function isOllamaAvailable() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.log('Ollama not available:', error.message);
        return false;
    }
}

/**
 * Generate text completion using Ollama
 * @param {string} prompt - The prompt to send
 * @param {object} options - Generation options
 * @returns {Promise<string>} - Generated text
 */
async function generateCompletion(prompt, options = {}) {
    const {
        model = OLLAMA_MODEL,
        temperature = 0.7,
        maxTokens = 500,
        systemPrompt = null
    } = options;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT);

        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                stream: false,
                options: {
                    temperature,
                    num_predict: maxTokens
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        return data.message?.content || '';
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Ollama request timed out');
        }
        throw error;
    }
}

/**
 * Generate carbon footprint insights from user data
 * @param {object} userData - User's emission data
 * @returns {Promise<object>} - AI-generated insights
 */
async function generateCarbonInsights(userData) {
    // Check if user has minimal data
    const hasData = userData.totalEmissions > 0 || 
                    userData.carTrips > 0 || 
                    userData.electricityUsage > 0 ||
                    userData.activityCount > 0;

    const systemPrompt = `You are a brutally honest carbon footprint coach. No corporate speak. No fluff. Just straight talk.

YOUR STYLE:
- Direct, punchy, conversational
- Use "you" directly - like talking to a friend
- Numbers and specifics only - no vague "could save" without data
- One clear action per insight
- Max 1-2 sentences per insight

STRICT RULES:
1. ONE insight per category MAXIMUM - pick the highest impact action
2. If no data for a category, skip it entirely
3. Every insight must have a specific number attached
4. No generic advice like "consider switching" - say exactly what to do
5. Calculate savings from ACTUAL data provided

Format as JSON:
{
    "summary": "One punchy sentence about their footprint status",
    "topInsight": {"title": "The ONE thing to fix first", "description": "Direct instruction", "category": "category", "potentialSavings": realistic_number},
    "insights": [
        {"title": "Action verb + specific thing", "description": "Why + exact impact", "category": "transport|electricity|diet|waste", "potentialSavings": number}
    ],
    "encouragement": "One motivating line - no cheese"
}`;

    const noDataNote = !hasData ? '\n\nUSER HAS NO DATA. Just tell them to start logging - nothing else.' : '';

    const categoriesLogged = userData.categoriesWithData || [];
    
    const prompt = `Analyze and give direct advice:${noDataNote}

THEIR NUMBERS:
- Total: ${userData.totalEmissions?.toFixed(1) || 0} kg CO₂ this month
- Activities: ${userData.activityCount || 0}
${userData.transportEmissions > 0 ? `- Transport: ${userData.transportEmissions?.toFixed(1)} kg (${userData.carTrips || 0} car trips, ${userData.publicTransitTrips || 0} transit)` : ''}
${userData.electricityEmissions > 0 ? `- Electricity: ${userData.electricityEmissions?.toFixed(1)} kg (${userData.electricityUsage || 0} kWh)` : ''}
${userData.heatingEmissions > 0 ? `- Heating: ${userData.heatingEmissions?.toFixed(1)} kg` : ''}
${userData.dietEmissions > 0 ? `- Food: ${userData.dietEmissions?.toFixed(1)} kg (${userData.dietType || 'mixed'} diet)` : ''}
${userData.wasteEmissions > 0 ? `- Waste: ${userData.wasteEmissions?.toFixed(1)} kg` : ''}

CATEGORIES WITH DATA: ${categoriesLogged.length > 0 ? categoriesLogged.join(', ') : 'NONE'}

${hasData ? `Give exactly ${Math.min(categoriesLogged.length, 3)} insights - ONE per category with data. Highest impact actions only.` : 'No data yet - encourage logging.'}`;

    try {
        const response = await generateCompletion(prompt, {
            systemPrompt,
            temperature: 0.6,
            maxTokens: 600
        });

        // Parse JSON response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Deduplicate insights by category - keep only first (highest priority)
            const seenCategories = new Set();
            if (parsed.insights) {
                parsed.insights = parsed.insights.filter(insight => {
                    const cat = insight.category?.toLowerCase();
                    if (seenCategories.has(cat)) return false;
                    seenCategories.add(cat);
                    return true;
                });
            }
            
            return parsed;
        }
        
        // Fallback: return raw response wrapped
        return {
            summary: response,
            topInsight: '',
            insights: [],
            encouragement: ''
        };
    } catch (error) {
        console.error('Error generating AI insights:', error);
        throw error;
    }
}

/**
 * Generate a personalized tip based on category
 * @param {string} category - Emission category
 * @param {object} userData - User context
 * @returns {Promise<string>} - Generated tip
 */
async function generateQuickTip(category, userData) {
    const prompt = `Give one specific, actionable tip (1-2 sentences) to reduce ${category} emissions for someone who:
- Has ${userData[`${category}Emissions`]?.toFixed(1) || 0} kg CO₂ monthly ${category} emissions
- ${category === 'transport' ? `Takes ${userData.carTrips || 0} car trips and ${userData.publicTransitTrips || 0} public transit trips` : ''}
- ${category === 'diet' ? `Has a ${userData.dietType || 'average'} diet` : ''}
Be specific and practical.`;

    try {
        const response = await generateCompletion(prompt, {
            temperature: 0.8,
            maxTokens: 100
        });
        return response.trim();
    } catch (error) {
        return null; // Fallback to rule-based tip
    }
}

module.exports = {
    isOllamaAvailable,
    generateCompletion,
    generateCarbonInsights,
    generateQuickTip,
    OLLAMA_MODEL
};
