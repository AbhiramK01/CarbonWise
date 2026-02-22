// CarbonWise - Full Stack Application
// API Integration & Frontend Logic

// ==================== API HELPER ====================
const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // Handle auth errors (401 & 403) on non-auth endpoints
            // Auth endpoints (login/register) should show their own error messages
            if ((response.status === 401 || response.status === 403) && !endpoint.startsWith('/auth/')) {
                logout();
                throw new Error('Session expired. Please login again.');
            }
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== UNIT CONVERSION ====================
function convertEmissions(valueKg) {
    return parseFloat(valueKg).toFixed(1);
}

function getEmissionUnit() {
    return 'kg';
}

function formatEmissions(valueKg, includeUnit = true) {
    const converted = convertEmissions(valueKg);
    if (includeUnit) {
        return `${converted} ${getEmissionUnit()} CO₂`;
    }
    return converted;
}

// ==================== AUTH STATE ====================
function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function setAuthState(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    updateAuthUI();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateAuthUI();
    resetAllDisplays(); // Reset all stats and visualizations
    showSection('dashboard');
    showToast('Logged out successfully');
}

function resetAllDisplays() {
    // Reset dashboard stats
    const statElements = {
        'today-emissions': '0',
        'weekly-average': '0',
        'monthly-total': '0',
        'total-emissions': '0',
        'annual-emissions': '0.00',
        'streak-count': '0',
        'nav-streak': '0',
        'level-number': 'Level 1',
        'level-title': 'Eco Beginner',
        'total-xp': '0',
        'badge-count': '0',
        'dropdown-level': '1',
        'dropdown-xp': '0'
    };
    
    Object.entries(statElements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
    
    // Reset progress bars
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach(bar => bar.style.width = '0%');
    
    // Reset XP progress text
    const xpText = document.getElementById('level-progress-text');
    if (xpText) xpText.textContent = '0 / 100 XP to Level 2';
    
    // Clear charts
    if (typeof chartInstances !== 'undefined') {
        Object.keys(chartInstances).forEach(key => {
            if (chartInstances[key]) {
                chartInstances[key].destroy();
                delete chartInstances[key];
            }
        });
    }
    
    // Clear activity log
    const activityList = document.getElementById('activity-list');
    if (activityList) {
        activityList.innerHTML = '<div class="empty-state"><p>Please login to view your activity log.</p></div>';
    }
    
    // Clear goals
    const goalsGrid = document.getElementById('goals-grid');
    if (goalsGrid) {
        goalsGrid.innerHTML = '<div class="empty-state"><p>Please login to set and track goals.</p></div>';
    }
    
    // Clear badges
    const badgesGrid = document.getElementById('badges-grid');
    if (badgesGrid) {
        badgesGrid.innerHTML = '<div class="empty-state"><p>Please login to view achievements.</p></div>';
    }
    
    // Clear leaderboard
    const leaderboard = document.getElementById('leaderboard-list');
    if (leaderboard) {
        leaderboard.innerHTML = '<div class="empty-state"><p>Please login to view leaderboard.</p></div>';
    }
}

function updateAuthUI() {
    const loggedIn = isLoggedIn();
    const user = getUser();
    
    const loggedOutState = document.getElementById('nav-user-logged-out');
    const loggedInState = document.getElementById('nav-user-logged-in');
    
    if (loggedOutState) loggedOutState.style.display = loggedIn ? 'none' : 'flex';
    if (loggedInState) loggedInState.style.display = loggedIn ? 'flex' : 'none';
    
    if (loggedIn && user) {
        const navUsername = document.getElementById('nav-username');
        const dropdownLevel = document.getElementById('dropdown-level');
        const dropdownXP = document.getElementById('dropdown-xp');
        const streakCount = document.getElementById('streak-count');
        
        if (navUsername) navUsername.textContent = user.name || user.username || 'User';
        if (dropdownLevel) dropdownLevel.textContent = user.level || 1;
        if (dropdownXP) dropdownXP.textContent = user.xp || 0;
        if (streakCount) streakCount.textContent = user.streak || 0;
    }
}

// ==================== AUTH MODAL ====================
function openAuthModal(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('active');
        switchAuthTab(tab);
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    
    if (loginForm) {
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
    }
    if (registerForm) {
        document.getElementById('register-username').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';
    }
    
    // Clear error messages
    if (loginError) {
        loginError.textContent = '';
        loginError.classList.remove('show');
    }
    if (registerError) {
        registerError.textContent = '';
        registerError.classList.remove('show');
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    const tabBtn = document.querySelector(`.auth-tab[data-tab="${tab}"]`);
    const form = document.getElementById(`${tab}-form`);
    
    if (tabBtn) tabBtn.classList.add('active');
    if (form) form.classList.add('active');
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    // Clear previous error
    errorEl.textContent = '';
    errorEl.classList.remove('show');
    
    if (!email || !password) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.classList.add('show');
        return;
    }
    
    try {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        setAuthState(data.token, data.user);
        closeAuthModal();
        loadDashboard();
        showToast('Welcome back!', 'success');
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.add('show');
    }
}

async function handleRegister() {
    const name = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const errorEl = document.getElementById('register-error');
    
    // Clear previous error
    errorEl.textContent = '';
    errorEl.classList.remove('show');
    
    if (!name || !email || !password || !confirmPassword) {
        errorEl.textContent = 'Please fill in all fields';
        errorEl.classList.add('show');
        return;
    }
    
    if (password !== confirmPassword) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.classList.add('show');
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        errorEl.classList.add('show');
        return;
    }
    
    try {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        
        setAuthState(data.token, data.user);
        closeAuthModal();
        loadDashboard();
        showToast('Welcome to CarbonWise!', 'success');
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.add('show');
    }
}

// ==================== NAVIGATION ====================
function showSection(sectionId) {
    // Check if section requires auth
    const protectedSections = ['goals', 'insights'];
    if (protectedSections.includes(sectionId) && !isLoggedIn()) {
        openAuthModal('login');
        return;
    }
    
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    
    const section = document.getElementById(sectionId);
    const navLink = document.querySelector(`.nav-links a[data-section="${sectionId}"]`);
    
    if (section) section.classList.add('active');
    if (navLink) navLink.classList.add('active');
    
    // Load section data
    switch(sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'log':
            loadActivityLog();
            break;
        case 'insights':
            loadInsights();
            break;
        case 'goals':
            loadGoals();
            loadUserProfile();
            loadLeaderboard();
            break;
    }
}

// ==================== DASHBOARD ====================
let emissionsChart = null;
let categoryChart = null;

async function loadDashboard() {
    if (!isLoggedIn()) {
        showDemoData();
        return;
    }
    
    try {
        const stats = await apiRequest('/stats/dashboard');
        updateDashboardStats(stats);
        await loadChartData();
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showDemoData();
    }
}

function showDemoData() {
    document.getElementById('today-emissions').textContent = '0.0';
    document.getElementById('week-emissions').textContent = '0.0';
    document.getElementById('month-emissions').textContent = '0.0';
    document.getElementById('global-comparison').textContent = '--%';
    
    // Reset trend indicators
    ['today-trend', 'week-trend', 'month-trend', 'global-trend'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.className = 'stat-trend';
            el.innerHTML = '<i class="fas fa-minus"></i> <span>--</span>';
        }
    });
}

function updateTrendIndicator(elementId, change, trend, label) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const isDown = trend === 'down' || change <= 0;
    const absChange = Math.abs(change || 0);
    
    el.className = `stat-trend ${isDown ? 'down' : 'up'}`;
    el.innerHTML = `
        <i class="fas fa-arrow-${isDown ? 'down' : 'up'}"></i> 
        <span>${absChange}% ${label}</span>
    `;
}

function updateDashboardStats(stats) {
    const todayEl = document.getElementById('today-emissions');
    const weekEl = document.getElementById('week-emissions');
    const monthEl = document.getElementById('month-emissions');
    const globalEl = document.getElementById('global-comparison');
    
    // Update values with unit conversion
    if (todayEl) todayEl.textContent = convertEmissions(stats.today?.emissions || 0);
    if (weekEl) weekEl.textContent = convertEmissions(stats.week?.emissions || 0);
    if (monthEl) monthEl.textContent = convertEmissions(stats.month?.emissions || 0);
    if (globalEl) {
        const comparison = stats.comparison?.global || 0;
        globalEl.textContent = `${comparison > 0 ? '+' : ''}${comparison}%`;
    }
    
    // Update unit labels
    const unitLabel = `${getEmissionUnit()} CO₂`;
    ['today-unit', 'week-unit', 'month-unit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = unitLabel;
    });
    
    // Update trend indicators
    updateTrendIndicator('today-trend', stats.today?.change, stats.today?.trend, 'vs yesterday');
    updateTrendIndicator('week-trend', stats.week?.change, stats.week?.trend, 'vs last week');
    updateTrendIndicator('month-trend', stats.month?.change, stats.month?.trend, 'vs last month');
    
    // Update global trend
    const globalTrend = document.getElementById('global-trend');
    if (globalTrend && stats.comparison) {
        const isBelow = stats.comparison.global < 0;
        globalTrend.className = `stat-trend ${isBelow ? 'down' : 'up'}`;
        globalTrend.innerHTML = isBelow 
            ? '<i class="fas fa-leaf"></i> <span>Great job!</span>'
            : '<i class="fas fa-exclamation-triangle"></i> <span>Above average</span>';
    }
    
    // Update user stats
    if (stats.user) {
        const user = getUser();
        if (user) {
            user.xp = stats.user.xp;
            user.level = stats.user.level;
            user.streak = stats.user.streak;
            localStorage.setItem('user', JSON.stringify(user));
            updateAuthUI();
        }
    }
    
    // Update comparison section
    updateUserComparison(stats);
}

function updateUserComparison(stats) {
    const userEmissionsBar = document.getElementById('user-emissions-bar');
    const userEmissionsValue = document.getElementById('user-emissions-value');
    const comparisonMessage = document.getElementById('comparison-message');
    
    if (!userEmissionsBar || !userEmissionsValue) return;
    
    // Calculate annual emissions based on month data (multiply by 12 to estimate yearly)
    const monthEmissions = parseFloat(stats.month?.emissions) || 0;
    const yearlyEstimate = (monthEmissions * 12 / 1000).toFixed(1); // Convert kg to tons
    
    // Target is 2 tons/year, max reference is 8 tons
    const maxReference = 8; // 8 tons as max for scale
    const barWidth = Math.min((yearlyEstimate / maxReference) * 100, 100);
    
    userEmissionsBar.style.width = `${barWidth}%`;
    userEmissionsValue.textContent = `${yearlyEstimate} tons/year`;
    
    if (comparisonMessage) {
        const target = 2.0; // 2030 target in tons
        if (yearlyEstimate <= target) {
            comparisonMessage.textContent = '🎉 Great job! You\'re meeting the 2030 climate target!';
            comparisonMessage.style.color = 'var(--success-color)';
        } else {
            const reduction = ((yearlyEstimate - target) / yearlyEstimate * 100).toFixed(0);
            comparisonMessage.textContent = `Reduce emissions by ${reduction}% to meet the 2030 target.`;
            comparisonMessage.style.color = 'var(--warning-color)';
        }
    }
}

async function loadChartData() {
    try {
        const chartData = await apiRequest('/stats/charts?range=week');
        updateEmissionsChart(chartData.timeline || chartData);
        updateCategoryChart(chartData.categories || []);
    } catch (error) {
        console.error('Failed to load chart data:', error);
    }
}

function updateEmissionsChart(chartData) {
    const ctx = document.getElementById('emissions-chart')?.getContext('2d');
    if (!ctx) return;
    
    if (emissionsChart) {
        emissionsChart.destroy();
    }
    
    emissionsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Carbon Emissions (kg CO₂)',
                data: chartData.data || [0, 0, 0, 0, 0, 0, 0],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function updateCategoryChart(categories) {
    const ctx = document.getElementById('category-chart')?.getContext('2d');
    if (!ctx) return;
    
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const categoryColors = {
        transport: '#3b82f6',
        energy: '#f59e0b',
        electricity: '#f59e0b',
        diet: '#ef4444',
        food: '#ef4444',
        heating: '#8b5cf6',
        waste: '#10b981',
        other: '#6b7280'
    };
    
    const labels = categories.map(c => c.category?.charAt(0).toUpperCase() + c.category?.slice(1) || 'Other');
    const data = categories.map(c => parseFloat(c.total) || 0);
    const colors = categories.map(c => categoryColors[c.category] || categoryColors.other);
    
    if (labels.length === 0) {
        labels.push('No Data');
        data.push(1);
        colors.push('#e5e7eb');
    }
    
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// ==================== CALCULATOR ====================
const EMISSION_FACTORS = {
    electricity: {
        coal: 0.91,
        'natural-gas': 0.42,
        mixed: 0.48,
        renewable: 0.02,
        nuclear: 0.012
    },
    transport: {
        car: { petrol: 0.21, diesel: 0.27, hybrid: 0.12, electric: 0.05 },
        bus: 0.089,
        train: 0.041,
        bike: 0,
        walk: 0,
        motorcycle: 0.103,
        plane: 0.255
    },
    heating: {
        'natural-gas': 0.20,
        oil: 0.27,
        electric: 0.12,
        'heat-pump': 0.03,
        wood: 0.05
    },
    diet: {
        'meat-heavy': 7.2,
        'average': 5.6,
        'low-meat': 4.7,
        'pescatarian': 3.9,
        'vegetarian': 3.8,
        'vegan': 2.9
    },
    waste: {
        base_per_bag: 2.5
    }
};

// Calculator state - track selected options
let calculatorState = {
    transport: { type: null, distance: 0 },
    diet: { type: null },
    electricity: { usage: 0, source: 'mixed' },
    heating: { type: 'natural-gas', size: 0, hours: 8 },
    waste: { bags: 0 }
};

function initCalculator() {
    // Electricity calculator
    const electricityUsage = document.getElementById('electricity-usage');
    const energySource = document.getElementById('energy-source');
    
    if (electricityUsage && energySource) {
        const calcElectricity = () => {
            const usage = parseFloat(electricityUsage.value) || 0;
            const source = energySource.value;
            calculatorState.electricity = { usage, source };
            const factor = EMISSION_FACTORS.electricity[source] || 0.48;
            const result = (usage * factor).toFixed(1);
            document.getElementById('electricity-result').textContent = result;
            updateTotalEmissions();
        };
        electricityUsage.addEventListener('input', calcElectricity);
        energySource.addEventListener('change', calcElectricity);
    }
    
    // Transport calculator - using .transport-card with data-type
    const transportCards = document.querySelectorAll('.transport-card');
    const transportDistance = document.getElementById('transport-distance');
    const fuelType = document.getElementById('fuel-type');
    const carOptions = document.getElementById('car-options');
    
    transportCards.forEach(card => {
        card.addEventListener('click', () => {
            transportCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            calculatorState.transport.type = card.dataset.type;
            
            if (carOptions) {
                carOptions.style.display = card.dataset.type === 'car' ? 'block' : 'none';
            }
            calcTransport();
        });
    });
    
    const calcTransport = () => {
        const distancePerWeek = parseFloat(transportDistance?.value) || 0;
        calculatorState.transport.distance = distancePerWeek;
        calculatorState.transport.fuelType = fuelType?.value || 'petrol';
        let factor = 0;
        
        if (calculatorState.transport.type === 'car') {
            factor = EMISSION_FACTORS.transport.car[calculatorState.transport.fuelType] || 0.21;
        } else if (calculatorState.transport.type) {
            factor = EMISSION_FACTORS.transport[calculatorState.transport.type] || 0;
        }
        
        // Convert weekly distance to monthly emissions (4.33 weeks/month)
        const monthlyResult = (distancePerWeek * 4.33 * factor).toFixed(1);
        const resultEl = document.getElementById('transport-result');
        if (resultEl) resultEl.textContent = monthlyResult;
        updateTotalEmissions();
    };
    
    if (transportDistance) transportDistance.addEventListener('input', calcTransport);
    if (fuelType) fuelType.addEventListener('change', calcTransport);
    
    // Heating calculator
    const heatingType = document.getElementById('heating-type');
    const homeSize = document.getElementById('home-size');
    const heatingHours = document.getElementById('heating-hours');
    const heatingHoursValue = document.getElementById('heating-hours-value');
    
    const calcHeating = () => {
        const type = heatingType?.value || 'natural_gas';
        const size = parseFloat(homeSize?.value) || 0;
        const hours = parseFloat(heatingHours?.value) || 8;
        
        if (heatingHoursValue) heatingHoursValue.textContent = hours;
        
        const factor = EMISSION_FACTORS.heating[type] || 0.20;
        const result = ((size / 1000) * factor * hours / 8).toFixed(1);
        
        const resultEl = document.getElementById('heating-result');
        if (resultEl) resultEl.textContent = result;
        updateTotalEmissions();
    };
    
    if (heatingType) heatingType.addEventListener('change', calcHeating);
    if (homeSize) homeSize.addEventListener('input', calcHeating);
    if (heatingHours) heatingHours.addEventListener('input', calcHeating);
    
    // Diet calculator - using .diet-card with data-type
    const dietCards = document.querySelectorAll('.diet-card');
    
    dietCards.forEach(card => {
        card.addEventListener('click', () => {
            dietCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            calculatorState.diet.type = card.dataset.type;
            calcDiet();
        });
    });
    
    const calcDiet = () => {
        // Diet emission factors are per DAY - convert to monthly (multiply by 30)
        const dailyEmissions = calculatorState.diet.type ? EMISSION_FACTORS.diet[calculatorState.diet.type] : 5.6;
        let multiplier = 1;
        
        if (document.getElementById('local-food')?.checked) multiplier -= 0.1;
        if (document.getElementById('organic-food')?.checked) multiplier -= 0.05;
        if (document.getElementById('food-waste')?.checked) multiplier -= 0.15;
        
        const monthlyResult = (dailyEmissions * 30 * multiplier).toFixed(1);
        const resultEl = document.getElementById('diet-result');
        if (resultEl) resultEl.textContent = monthlyResult;
        updateTotalEmissions();
    };
    
    document.getElementById('local-food')?.addEventListener('change', calcDiet);
    document.getElementById('organic-food')?.addEventListener('change', calcDiet);
    document.getElementById('food-waste')?.addEventListener('change', calcDiet);
    
    // Waste calculator
    const wasteBags = document.getElementById('waste-bags');
    const singleUse = document.getElementById('single-use');
    
    const calcWaste = () => {
        const bagsPerWeek = parseFloat(wasteBags?.value) || 0;
        let recycleBonus = 0;
        
        if (document.getElementById('recycle-paper')?.checked) recycleBonus += 0.1;
        if (document.getElementById('recycle-plastic')?.checked) recycleBonus += 0.15;
        if (document.getElementById('recycle-glass')?.checked) recycleBonus += 0.05;
        if (document.getElementById('recycle-metal')?.checked) recycleBonus += 0.1;
        if (document.getElementById('compost')?.checked) recycleBonus += 0.2;
        
        let singleUseMultiplier = 1;
        const singleUseVal = singleUse?.value;
        if (singleUseVal === 'low') singleUseMultiplier = 0.7;
        else if (singleUseVal === 'minimal') singleUseMultiplier = 0.4;
        
        // Convert weekly bags to monthly emissions (4.33 weeks/month)
        const baseMonthly = bagsPerWeek * 4.33 * EMISSION_FACTORS.waste.base_per_bag;
        const monthlyResult = (baseMonthly * (1 - recycleBonus) * singleUseMultiplier).toFixed(1);
        
        const resultEl = document.getElementById('waste-result');
        if (resultEl) resultEl.textContent = monthlyResult;
        updateTotalEmissions();
    };
    
    if (wasteBags) wasteBags.addEventListener('input', calcWaste);
    if (singleUse) singleUse.addEventListener('change', calcWaste);
    
    ['recycle-paper', 'recycle-plastic', 'recycle-glass', 'recycle-metal', 'compost'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', calcWaste);
    });
    
    // Calculator tabs - using data-tab attribute
    document.querySelectorAll('.calc-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.calc-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const content = document.getElementById(`calc-${tab.dataset.tab}`);
            if (content) content.classList.add('active');
        });
    });
    
    // Save calculation button
    document.getElementById('save-calculation')?.addEventListener('click', saveCalculation);
}

function updateTotalEmissions() {
    const electricity = parseFloat(document.getElementById('electricity-result')?.textContent) || 0;
    const transport = parseFloat(document.getElementById('transport-result')?.textContent) || 0;
    const heating = parseFloat(document.getElementById('heating-result')?.textContent) || 0;
    const diet = parseFloat(document.getElementById('diet-result')?.textContent) || 0;
    const waste = parseFloat(document.getElementById('waste-result')?.textContent) || 0;
    
    // All values are now monthly
    const totalMonthly = electricity + transport + heating + diet + waste;
    
    const timePeriod = document.getElementById('calc-time-period')?.value || 'monthly';
    const totalEl = document.getElementById('total-emissions');
    const unitEl = document.getElementById('total-unit');
    const annualEl = document.getElementById('annual-emissions');
    
    let displayValue, unitText;
    switch (timePeriod) {
        case 'daily':
            displayValue = totalMonthly / 30;
            unitText = 'kg CO₂/day';
            break;
        case 'weekly':
            displayValue = totalMonthly / 4.33;
            unitText = 'kg CO₂/week';
            break;
        case 'yearly':
            displayValue = totalMonthly * 12;
            unitText = 'kg CO₂/year';
            break;
        case 'monthly':
        default:
            displayValue = totalMonthly;
            unitText = 'kg CO₂/month';
            break;
    }
    
    if (totalEl) totalEl.textContent = displayValue.toFixed(1);
    if (unitEl) unitEl.textContent = unitText;
    // Annual = monthly * 12 months / 1000 to convert to tons
    if (annualEl) annualEl.textContent = ((totalMonthly * 12) / 1000).toFixed(2);
}

// Initialize time period selector
document.getElementById('calc-time-period')?.addEventListener('change', updateTotalEmissions);

async function saveCalculation() {
    if (!isLoggedIn()) {
        openAuthModal('login');
        return;
    }
    
    const electricity = parseFloat(document.getElementById('electricity-result')?.textContent) || 0;
    const transportEmissions = parseFloat(document.getElementById('transport-result')?.textContent) || 0;
    const heating = parseFloat(document.getElementById('heating-result')?.textContent) || 0;
    const diet = parseFloat(document.getElementById('diet-result')?.textContent) || 0;
    const waste = parseFloat(document.getElementById('waste-result')?.textContent) || 0;
    
    const activities = [];
    
    // Electricity - save if there's usage
    if (calculatorState.electricity.usage > 0) {
        activities.push({ 
            category: 'energy', 
            activity_type: 'electricity', 
            amount: electricity, 
            unit: 'kg',
            subType: calculatorState.electricity.source
        });
    }
    
    // Transport - save if distance entered, even if emissions are 0 (bike/walk)
    if (calculatorState.transport.distance > 0 && calculatorState.transport.type) {
        activities.push({ 
            category: 'transport', 
            activity_type: calculatorState.transport.type, // 'car', 'bike', 'walk', etc.
            description: `${calculatorState.transport.type} - ${calculatorState.transport.distance} km`,
            amount: calculatorState.transport.distance, // Distance in km
            unit: 'km',
            subType: calculatorState.transport.type,
            fuelType: calculatorState.transport.fuelType
        });
    }
    
    // Heating - save if there's usage
    if (heating > 0) {
        activities.push({ 
            category: 'energy', 
            activity_type: 'heating', 
            amount: heating, 
            unit: 'kg' 
        });
    }
    
    // Diet - save if a diet type was selected
    if (calculatorState.diet.type) {
        activities.push({ 
            category: 'food', 
            activity_type: calculatorState.diet.type, // 'vegan', 'vegetarian', etc.
            amount: diet, 
            unit: 'kg',
            subType: calculatorState.diet.type
        });
    }
    
    // Waste - save if there's waste
    if (waste > 0) {
        activities.push({ 
            category: 'waste', 
            activity_type: 'household_waste', 
            amount: waste, 
            unit: 'kg' 
        });
    }
    
    if (activities.length === 0) {
        showToast('Please enter some data first', 'warning');
        return;
    }
    
    try {
        let totalXP = 0;
        for (const activity of activities) {
            const result = await apiRequest('/activities', {
                method: 'POST',
                body: JSON.stringify(activity)
            });
            totalXP += result.xpEarned || 0;
        }
        
        showToast(`Saved! +${totalXP} XP earned`, 'success');
        loadDashboard();
        loadGoals(); // Refresh goals to show updated progress
        resetCalculator(); // Reset all inputs after save
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function resetCalculator() {
    // Reset all input fields
    const inputsToReset = [
        'electricity-usage',
        'transport-distance',
        'home-size',
        'heating-hours',
        'waste-bags'
    ];
    
    inputsToReset.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // Reset dropdowns to defaults
    const energySource = document.getElementById('energy-source');
    if (energySource) energySource.value = 'mixed';
    
    const fuelType = document.getElementById('fuel-type');
    if (fuelType) fuelType.value = 'petrol';
    
    const heatingType = document.getElementById('heating-type');
    if (heatingType) heatingType.value = 'natural-gas';
    
    const singleUse = document.getElementById('single-use');
    if (singleUse) singleUse.value = 'sometimes';
    
    // Reset heating hours slider
    const heatingHoursValue = document.getElementById('heating-hours-value');
    if (heatingHoursValue) heatingHoursValue.textContent = '8';
    
    // Reset checkboxes
    ['local-food', 'organic-food', 'food-waste', 'recycle-paper', 'recycle-plastic', 
     'recycle-glass', 'recycle-metal', 'compost'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });
    
    // Remove active class from transport and diet cards
    document.querySelectorAll('.transport-card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.diet-card').forEach(c => c.classList.remove('active'));
    
    // Hide car options
    const carOptions = document.getElementById('car-options');
    if (carOptions) carOptions.style.display = 'none';
    
    // Reset result displays to 0
    ['electricity-result', 'transport-result', 'heating-result', 'diet-result', 'waste-result'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
    });
    
    // Reset totals
    const totalEl = document.getElementById('total-emissions');
    const annualEl = document.getElementById('annual-emissions');
    if (totalEl) totalEl.textContent = '0';
    if (annualEl) annualEl.textContent = '0.00';
    
    // Reset calculator state
    calculatorState = {
        transport: { type: null, distance: 0 },
        diet: { type: null },
        electricity: { usage: 0, source: 'mixed' },
        heating: { type: 'natural-gas', size: 0, hours: 8 },
        waste: { bags: 0 }
    };
}

// ==================== ACTIVITY LOG ====================
let currentLogDate = new Date();
let currentPeriod = 'daily';

async function loadActivityLog() {
    updateCurrentDateDisplay();
    
    if (!isLoggedIn()) {
        const activityList = document.getElementById('activity-list');
        if (activityList) {
            activityList.innerHTML = '<div class="empty-state"><p>Please login to view your activity log.</p></div>';
        }
        return;
    }
    
    try {
        let url;
        if (currentPeriod === 'daily') {
            const dateStr = currentLogDate.toISOString().split('T')[0];
            url = `/activities?date=${dateStr}`;
        } else if (currentPeriod === 'weekly') {
            const startDate = new Date(currentLogDate);
            startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6); // End of week (Saturday)
            url = `/activities?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
        } else if (currentPeriod === 'monthly') {
            const startDate = new Date(currentLogDate.getFullYear(), currentLogDate.getMonth(), 1);
            const endDate = new Date(currentLogDate.getFullYear(), currentLogDate.getMonth() + 1, 0);
            url = `/activities?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
        }
        const data = await apiRequest(url);
        renderActivityList(data.activities || []);
        updateLogSummary(data.activities || []);
    } catch (error) {
        console.error('Failed to load activities:', error);
    }
}

function updateCurrentDateDisplay() {
    const dateEl = document.getElementById('current-date');
    if (!dateEl) return;
    
    if (currentPeriod === 'daily') {
        dateEl.textContent = currentLogDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else if (currentPeriod === 'weekly') {
        const startDate = new Date(currentLogDate);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        dateEl.textContent = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (currentPeriod === 'monthly') {
        dateEl.textContent = currentLogDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
    }
}

function renderActivityList(activities) {
    const container = document.getElementById('activity-list');
    if (!container) return;
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-leaf"></i>
                <p>No activities logged for this ${currentPeriod || 'day'}. Use the Calculator to log activities.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activities.map(a => `
        <div class="activity-item" data-id="${a.id}">
            <div class="activity-icon ${a.category}">
                <i class="fas ${getCategoryIcon(a.category)}"></i>
            </div>
            <div class="activity-details">
                <h4>${formatActivityType(a.activity_type)}</h4>
                <p>${a.amount} ${a.unit}</p>
            </div>
            <div class="activity-emissions">
                <span class="emissions-value">${convertEmissions(a.emissions)}</span>
                <span class="emissions-unit">${getEmissionUnit()} CO₂</span>
            </div>
            <div class="activity-actions">
                <button class="edit-btn" onclick="editActivity(${a.id}, '${a.category}', '${(a.activity_type || '').replace(/'/g, "\\'")}', ${a.amount}, '${a.unit}', '${a.date}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="deleteActivity(${a.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateLogSummary(activities) {
    const totalActivities = document.getElementById('total-activities');
    const totalEmissions = document.getElementById('log-total-emissions');
    
    if (totalActivities) totalActivities.textContent = activities.length;
    if (totalEmissions) {
        const total = activities.reduce((sum, a) => sum + a.emissions, 0);
        totalEmissions.textContent = `${convertEmissions(total)} ${getEmissionUnit()}`;
    }
}

function openAddActivityModal() {
    if (!isLoggedIn()) {
        openAuthModal('login');
        return;
    }
    
    const modal = document.getElementById('add-activity-modal');
    if (modal) {
        // Reset to add mode
        editingActivityId = null;
        const title = modal.querySelector('.modal-header h2');
        if (title) title.textContent = 'Log Activity';
        
        // Clear form
        document.getElementById('activity-category').value = '';
        document.getElementById('activity-description').value = '';
        document.getElementById('activity-value').value = '';
        document.getElementById('activity-unit').value = 'kg';
        document.getElementById('activity-date').value = currentLogDate.toISOString().split('T')[0];
        
        modal.classList.add('active');
    }
}

function closeAddActivityModal() {
    const modal = document.getElementById('add-activity-modal');
    if (modal) {
        modal.classList.remove('active');
        editingActivityId = null;
        const title = modal.querySelector('.modal-header h2');
        if (title) title.textContent = 'Log Activity';
    }
}

async function saveActivity() {
    const category = document.getElementById('activity-category').value;
    const description = document.getElementById('activity-description').value;
    const value = parseFloat(document.getElementById('activity-value').value);
    const unit = document.getElementById('activity-unit').value;
    const date = document.getElementById('activity-date').value;
    
    if (!category || !description || !value) {
        showToast('Please fill in all fields', 'warning');
        return;
    }
    
    try {
        const isEditing = editingActivityId !== null;
        const url = isEditing ? `/activities/${editingActivityId}` : '/activities';
        const method = isEditing ? 'PUT' : 'POST';
        
        await apiRequest(url, {
            method,
            body: JSON.stringify({
                category,
                description,
                activity_type: description,
                value,
                amount: value,
                unit,
                date
            })
        });
        
        closeAddActivityModal();
        loadActivityLog();
        showToast(isEditing ? 'Activity updated!' : 'Activity logged successfully!', 'success');
        editingActivityId = null;
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteActivity(id) {
    if (!confirm('Delete this activity?')) return;
    
    try {
        await apiRequest(`/activities/${id}`, { method: 'DELETE' });
        loadActivityLog();
        showToast('Activity deleted', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

let editingActivityId = null;

function editActivity(id, category, description, value, unit, date) {
    editingActivityId = id;
    
    const modal = document.getElementById('add-activity-modal');
    if (!modal) return;
    
    // Update modal title
    const title = modal.querySelector('.modal-header h2');
    if (title) title.textContent = 'Edit Activity';
    
    // Populate form fields
    document.getElementById('activity-category').value = category || '';
    document.getElementById('activity-description').value = description || '';
    document.getElementById('activity-value').value = value || '';
    document.getElementById('activity-unit').value = unit || 'kg';
    document.getElementById('activity-date').value = date || currentLogDate.toISOString().split('T')[0];
    
    modal.classList.add('active');
}

// ==================== INSIGHTS ====================
const aiLoadingMessages = [
    'Gathering your activity history',
    'Analyzing emission patterns',
    'Identifying optimization areas',
    'Generating personalized recommendations',
    'Preparing your insights summary'
];

let aiLoadingInterval = null;

function showAILoading(show = true) {
    const overlay = document.getElementById('ai-loading-overlay');
    const refreshBtn = document.querySelector('.refresh-insights-btn');
    const statusEl = document.getElementById('ai-loading-status');
    
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
    
    if (refreshBtn) {
        if (show) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
        }
    }
    
    // Cycle through loading messages
    if (show && statusEl) {
        let messageIndex = 0;
        statusEl.textContent = aiLoadingMessages[0];
        
        aiLoadingInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % aiLoadingMessages.length;
            statusEl.textContent = aiLoadingMessages[messageIndex];
        }, 3000);
    } else if (aiLoadingInterval) {
        clearInterval(aiLoadingInterval);
        aiLoadingInterval = null;
    }
}

async function loadInsights(forceRefresh = false) {
    const container = document.querySelector('#insights .insights-grid');
    if (!container) return;
    
    if (!isLoggedIn()) {
        container.innerHTML = '<div class="empty-state"><p>Please login to view personalized insights.</p></div>';
        return;
    }
    
    // Show the AI loading overlay for force refresh or initial load
    showAILoading(true);
    container.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        const url = forceRefresh ? '/insights?refresh=true' : '/insights';
        const data = await apiRequest(url);
        showAILoading(false);
        renderInsights(data);
    } catch (error) {
        console.error('Failed to load insights:', error);
        showAILoading(false);
        container.innerHTML = '<div class="empty-state"><p>Failed to load insights. Please try again.</p></div>';
    }
}

function renderInsights(data) {
    // Render statistics first
    if (data.stats) {
        renderInsightStats(data.stats);
    }

    // Update AI summary section
    const summaryEl = document.querySelector('.ai-summary-text');
    if (summaryEl && data.aiSummary) {
        let summaryHtml = data.aiSummary.summary || 'Log more activities to get personalized insights!';
        
        // Add AI badge if insights are AI-generated
        if (data.source === 'ai') {
            summaryHtml = `<span class="ai-badge"><i class="fas fa-robot"></i> AI</span> ${summaryHtml}`;
        }
        
        summaryEl.innerHTML = summaryHtml;
    }
    
    // Update encouragement if available
    const encouragementEl = document.querySelector('.ai-encouragement');
    if (encouragementEl && data.encouragement) {
        encouragementEl.innerHTML = data.encouragement;
        encouragementEl.style.display = 'block';
    }
    
    // Update top insight highlight
    if (data.topInsight) {
        const topInsightEl = document.querySelector('.top-insight');
        if (topInsightEl) {
            const topText = typeof data.topInsight === 'string' ? data.topInsight : data.topInsight.title || data.topInsight.description;
            topInsightEl.innerHTML = `<i class="fas fa-star"></i> <strong>Top Recommendation:</strong> ${topText}`;
            topInsightEl.style.display = 'block';
        }
    }
    
    // Update insights grid with enhanced cards
    const container = document.querySelector('#insights .insights-grid');
    if (!container || !data.insights) return;
    
    if (data.insights.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Log more activities to get personalized insights!</p></div>';
        return;
    }

    // Calculate max savings for visual scaling
    const maxSavings = Math.max(...data.insights.map(i => i.potentialSavings || 0), 50);
    
    container.innerHTML = data.insights.map((insight, index) => {
        const savingsPercent = insight.potentialSavings ? Math.min((insight.potentialSavings / maxSavings) * 100, 100) : 0;
        const categoryData = data.stats?.breakdown?.find(b => b.category === insight.category);
        
        return `
        <div class="insight-card ${insight.category}" data-insight-id="${insight.id || index}">
            <div class="insight-header">
                <div class="insight-icon">
                    <i class="fas ${getInsightIcon(insight.category)}"></i>
                </div>
                <span class="insight-category">${capitalizeFirst(insight.category)}</span>
                ${insight.potentialSavings >= 20 ? '<span class="high-impact-badge"><i class="fas fa-bolt"></i> High Impact</span>' : ''}
            </div>
            <h4>${insight.title}</h4>
            <p>${insight.description}</p>
            
            ${categoryData ? `
            <div class="insight-stats">
                <div class="insight-stat">
                    <div class="insight-stat-value">${categoryData.emissions.toFixed(1)}</div>
                    <div class="insight-stat-label">kg CO₂ this month</div>
                </div>
                <div class="insight-stat">
                    <div class="insight-stat-value">${categoryData.percentage}%</div>
                    <div class="insight-stat-label">of your footprint</div>
                </div>
            </div>
            ` : ''}
            
            ${insight.potentialSavings ? `
                <div class="insight-savings">
                    <i class="fas fa-leaf"></i>
                    <span>Save up to <strong>${insight.potentialSavings} kg</strong> CO₂/month</span>
                </div>
                <div class="savings-bar">
                    <div class="savings-bar-fill" style="width: ${savingsPercent}%"></div>
                </div>
            ` : ''}
            
            <div class="insight-actions">
                ${getActionChips(insight.category)}
            </div>
        </div>
    `}).join('');
    
    // Render trends
    renderTrends(data.trends || []);
    
    // Add refresh button handler
    const refreshBtn = document.querySelector('.refresh-insights-btn');
    if (refreshBtn) {
        refreshBtn.onclick = () => loadInsights(true);
    }
}

function renderInsightStats(stats) {
    // Monthly emissions ring
    const monthlyValue = document.getElementById('monthly-emissions-value');
    if (monthlyValue) {
        monthlyValue.textContent = stats.totals?.monthly?.toFixed(1) || '0';
    }
    
    // Animate ring progress (max 100kg for full ring)
    const ringFill = document.querySelector('#monthly-ring .ring-fill');
    if (ringFill) {
        const percentage = Math.min((stats.totals?.monthly || 0) / 100 * 100, 100);
        ringFill.setAttribute('stroke-dasharray', `${percentage}, 100`);
    }
    
    // Weekly change
    const weeklyChange = document.getElementById('weekly-change');
    if (weeklyChange && stats.comparison) {
        const change = stats.comparison.weeklyChange;
        const isPositive = change <= 0;
        weeklyChange.textContent = `${change > 0 ? '+' : ''}${change}% vs last week`;
        weeklyChange.className = `stat-comparison ${isPositive ? 'positive' : 'negative'}`;
    }
    
    // Days active
    const daysActive = document.getElementById('days-active');
    if (daysActive) {
        daysActive.textContent = stats.totals?.daysActive || 0;
    }
    
    const activityCount = document.getElementById('activity-count');
    if (activityCount) {
        activityCount.textContent = `${stats.totals?.activityCount || 0} activities logged`;
    }
    
    // vs Global
    const vsGlobalValue = document.getElementById('vs-global-value');
    const vsGlobalText = document.getElementById('vs-global-text');
    const vsGlobalIcon = document.getElementById('vs-global-icon');
    
    if (vsGlobalValue && stats.comparison) {
        const vsGlobal = stats.comparison.vsGlobal;
        vsGlobalValue.textContent = `${vsGlobal > 0 ? '+' : ''}${vsGlobal}%`;
        
        if (vsGlobalText) {
            vsGlobalText.textContent = stats.comparison.isAboveAverage 
                ? 'Above global average' 
                : 'Below global average! 🎉';
        }
        
        if (vsGlobalIcon) {
            vsGlobalIcon.className = stats.comparison.isAboveAverage 
                ? 'stat-icon-large red' 
                : 'stat-icon-large green';
        }
    }
    
    // Category breakdown chart
    renderCategoryBreakdown(stats.breakdown || []);
}

let categoryPieChart = null;
const CATEGORY_COLORS = {
    transport: '#3498db',
    electricity: '#f39c12',
    energy: '#f39c12',
    diet: '#27ae60',
    food: '#27ae60',
    heating: '#e74c3c',
    waste: '#9b59b6'
};

function renderCategoryBreakdown(breakdown) {
    const chartCanvas = document.getElementById('category-pie-chart');
    const legendContainer = document.querySelector('#insights .breakdown-legend');
    
    if (!chartCanvas) return;
    
    if (breakdown.length === 0) {
        if (legendContainer) legendContainer.innerHTML = '<p class="empty-state">No data yet</p>';
        return;
    }
    
    // Prepare chart data
    const labels = breakdown.map(b => capitalizeFirst(b.category));
    const values = breakdown.map(b => b.emissions);
    const colors = breakdown.map(b => CATEGORY_COLORS[b.category] || '#95a5a6');
    
    // Destroy existing chart
    if (categoryPieChart) {
        categoryPieChart.destroy();
    }
    
    // Create doughnut chart
    categoryPieChart = new Chart(chartCanvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '65%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.label}: ${context.raw.toFixed(1)} kg CO₂`
                    }
                }
            }
        }
    });
    
    // Render legend with progress bars
    if (legendContainer) {
        legendContainer.innerHTML = breakdown.map(b => `
            <div class="legend-item">
                <div class="legend-color" style="background: ${CATEGORY_COLORS[b.category] || '#95a5a6'}"></div>
                <div class="legend-info">
                    <span class="legend-label">${capitalizeFirst(b.category)}</span>
                    <div class="legend-bar">
                        <div class="legend-bar-fill" style="width: ${b.percentage}%; background: ${CATEGORY_COLORS[b.category] || '#95a5a6'}"></div>
                    </div>
                    <span class="legend-value">${b.emissions.toFixed(1)} kg (${b.percentage}%)</span>
                </div>
            </div>
    `).join('');
    }
}

function getActionChips(category) {
    const actions = {
        transport: [
            { icon: 'fa-bicycle', label: 'Try cycling' },
            { icon: 'fa-train', label: 'Use transit' },
            { icon: 'fa-users', label: 'Carpool' }
        ],
        electricity: [
            { icon: 'fa-solar-panel', label: 'Go solar' },
            { icon: 'fa-lightbulb', label: 'Use LEDs' },
            { icon: 'fa-power-off', label: 'Unplug devices' }
        ],
        energy: [
            { icon: 'fa-solar-panel', label: 'Go solar' },
            { icon: 'fa-lightbulb', label: 'Use LEDs' },
            { icon: 'fa-power-off', label: 'Unplug devices' }
        ],
        diet: [
            { icon: 'fa-leaf', label: 'Try meatless' },
            { icon: 'fa-store', label: 'Buy local' },
            { icon: 'fa-recycle', label: 'Reduce waste' }
        ],
        food: [
            { icon: 'fa-leaf', label: 'Try meatless' },
            { icon: 'fa-store', label: 'Buy local' },
            { icon: 'fa-recycle', label: 'Reduce waste' }
        ],
        waste: [
            { icon: 'fa-recycle', label: 'Recycle more' },
            { icon: 'fa-seedling', label: 'Compost' },
            { icon: 'fa-shopping-bag', label: 'Reusable bags' }
        ]
    };
    
    const categoryActions = actions[category] || actions.transport;
    return categoryActions.map(a => 
        `<button class="action-chip" onclick="showActionTip('${a.label}')">
            <i class="fas ${a.icon}"></i> ${a.label}
        </button>`
    ).join('');
}

function showActionTip(action) {
    showToast(`💡 Tip: ${action} can help reduce your carbon footprint!`, 'info');
}

function renderTrends(trends) {
    const container = document.getElementById('trend-cards');
    if (!container) return;
    
    if (trends.length === 0) {
        container.innerHTML = '<p class="empty-state">Log more activities to see your trends!</p>';
        return;
    }
    
    container.innerHTML = trends.map(trend => {
        const trendClass = trend.trend === 'positive' ? 'positive' : 
                          trend.trend === 'negative' ? 'negative' : 'neutral';
        const trendIcon = trend.trend === 'positive' ? 'fa-arrow-down' :
                         trend.trend === 'negative' ? 'fa-arrow-up' : 'fa-minus';
        
        return `
            <div class="trend-card ${trendClass}">
                <i class="fas ${trendIcon}"></i>
                <div class="trend-info">
                    <h4>${capitalizeFirst(trend.category)} ${trend.changePercent > 0 ? 'up' : trend.changePercent < 0 ? 'down' : 'stable'} ${Math.abs(trend.changePercent)}%</h4>
                    <p>${trend.message}</p>
                </div>
            </div>
        `;
    }).join('');
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getInsightIcon(category) {
    const icons = {
        transport: 'fa-car',
        energy: 'fa-bolt',
        food: 'fa-utensils',
        diet: 'fa-utensils',
        waste: 'fa-recycle',
        shopping: 'fa-shopping-bag'
    };
    return icons[category] || 'fa-lightbulb';
}

// ==================== GOALS ====================
async function loadGoals() {
    const container = document.getElementById('goals-grid');
    if (!container) return;
    
    if (!isLoggedIn()) {
        container.innerHTML = '<div class="empty-state"><p>Please login to set and track goals.</p></div>';
        return;
    }
    
    try {
        const data = await apiRequest('/goals');
        renderGoals(data.goals || []);
    } catch (error) {
        console.error('Failed to load goals:', error);
    }
}

function renderGoals(goals) {
    const container = document.getElementById('goals-grid');
    const pastContainer = document.getElementById('past-goals-grid');
    if (!container) return;
    
    // Separate active and completed goals
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    
    if (activeGoals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bullseye"></i>
                <p>No active goals. Create a new goal!</p>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    Goals track your CO₂ savings from eco-friendly choices.
                </p>
                <button class="btn-primary" onclick="openAddGoalModal()">Set a Goal</button>
            </div>
        `;
    } else {
        // Goal type info with XP rewards
        const goalTypeInfo = {
            'reduce-transport': { unit: 'kg CO₂ saved', tip: 'Bike, walk, bus, train trips', icon: 'fa-car-side' },
            'reduce-energy': { unit: 'kg CO₂ saved', tip: 'Renewable energy usage', icon: 'fa-bolt' },
            'diet-change': { unit: 'kg CO₂ saved', tip: 'Vegetarian or vegan meals', icon: 'fa-utensils' },
            'zero-waste': { unit: 'recycling points', tip: 'Recycling activities', icon: 'fa-recycle' },
            'streak': { unit: 'days', tip: 'Consecutive logging days', icon: 'fa-fire' }
        };
        
        container.innerHTML = activeGoals.map(goal => {
            const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
            const daysLeft = Math.ceil((new Date(goal.end_date) - new Date()) / (1000 * 60 * 60 * 24));
            const typeInfo = goalTypeInfo[goal.type] || { unit: 'kg CO₂', tip: 'Eco activities', icon: 'fa-leaf' };
            
            const statusBadge = daysLeft > 0 
                ? `<span class="badge">${daysLeft}d left</span>` 
                : '<span class="badge warning">Expired</span>';
            
            return `
                <div class="goal-card active" data-id="${goal.id}">
                    <div class="goal-header">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas ${typeInfo.icon}" style="color: var(--primary-green);"></i>
                            <h4>${goal.title || goal.type}</h4>
                        </div>
                        <div class="goal-actions">
                            ${statusBadge}
                            <button class="icon-btn" onclick="editGoal(${goal.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="icon-btn danger" onclick="deleteGoal(${goal.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <p class="goal-tip"><i class="fas fa-lightbulb"></i> ${typeInfo.tip}</p>
                    <div class="goal-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-stats">
                            <span>${goal.current_value.toFixed(1)} / ${goal.target_value} ${typeInfo.unit}</span>
                            <span>${progress.toFixed(0)}%</span>
                        </div>
                    </div>
                    <div class="goal-reward">
                        <i class="fas fa-star" style="color: gold;"></i> 
                        <span>${goal.xp_reward || 100} XP on completion</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Render completed goals in past section
    if (pastContainer) {
        if (completedGoals.length === 0) {
            pastContainer.innerHTML = '<div class="empty-state"><p>No completed goals yet. Keep working!</p></div>';
        } else {
            pastContainer.innerHTML = completedGoals.map(goal => `
                <div class="goal-card completed" data-id="${goal.id}">
                    <div class="goal-header">
                        <h4><i class="fas fa-check-circle" style="color: var(--success-green);"></i> ${goal.title || goal.type}</h4>
                        <div class="goal-actions">
                            <span class="badge success">+${goal.xp_reward || 100} XP</span>
                            <button class="icon-btn danger" onclick="deleteGoal(${goal.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="goal-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 100%; background: var(--success-green);"></div>
                        </div>
                        <div class="progress-stats">
                            <span>${goal.target_value} ${goal.type.includes('streak') ? 'days' : 'kg CO₂'} - Completed!</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
}

async function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    
    try {
        await apiRequest(`/goals/${id}`, { method: 'DELETE' });
        loadGoals();
        showToast('Goal deleted', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function editGoal(id) {
    try {
        const data = await apiRequest('/goals');
        const goal = (data.goals || []).find(g => g.id === id);
        if (!goal) return;
        
        // Populate edit modal
        document.getElementById('goal-type').value = goal.type;
        document.getElementById('goal-title').value = goal.title || '';
        document.getElementById('goal-target').value = goal.target_value;
        document.getElementById('goal-duration').value = goal.duration || 'month';
        
        // Store id for update
        document.getElementById('goal-form').dataset.editId = id;
        
        openAddGoalModal();
    } catch (error) {
        showToast('Failed to load goal', 'error');
    }
}

// ==================== GAMIFICATION ====================
const LEVEL_TITLES = {
    1: 'Eco Beginner',
    2: 'Green Starter',
    3: 'Carbon Cutter',
    4: 'Eco Enthusiast',
    5: 'Eco Warrior',
    6: 'Climate Champion',
    7: 'Sustainability Star',
    8: 'Planet Protector',
    9: 'Eco Master',
    10: 'Climate Hero'
};

const LEVEL_ICONS = {
    1: 'fa-seedling',
    2: 'fa-leaf',
    3: 'fa-tree',
    4: 'fa-wind',
    5: 'fa-solar-panel',
    6: 'fa-globe-americas',
    7: 'fa-star',
    8: 'fa-crown',
    9: 'fa-gem',
    10: 'fa-trophy'
};

// XP thresholds for each level (cumulative)
const XP_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

function getXPForLevel(level) {
    // XP required to reach a specific level
    return XP_THRESHOLDS[Math.min(level, XP_THRESHOLDS.length - 1)] || (level * 100);
}

function getLevelFromXP(totalXP) {
    // Calculate level from total XP
    for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
        if (totalXP >= XP_THRESHOLDS[i]) {
            return i + 1;
        }
    }
    return 1;
}

function getXPProgressInLevel(totalXP, level) {
    // Calculate XP progress within current level
    const xpForCurrentLevel = XP_THRESHOLDS[level - 1] || 0;
    const xpForNextLevel = XP_THRESHOLDS[level] || (xpForCurrentLevel + 100);
    const xpInLevel = totalXP - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    return {
        current: Math.max(0, xpInLevel),
        needed: xpNeeded,
        percent: Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100))
    };
}

async function loadUserProfile() {
    if (!isLoggedIn()) {
        updateLevelDisplay({ level: 1, xp: 0 }, []);
        return;
    }
    
    try {
        const data = await apiRequest('/auth/me');
        updateLevelDisplay(data, data.badges || []);
        renderBadges(data.badges || []);
    } catch (error) {
        console.error('Failed to load user profile:', error);
    }
}

function updateLevelDisplay(user, badges) {
    const level = user.level || 1;
    const xp = user.xp || 0;
    
    // Update level number and title
    const levelNumber = document.getElementById('level-number');
    const levelTitle = document.getElementById('level-title');
    const levelIcon = document.getElementById('level-icon');
    
    if (levelNumber) levelNumber.textContent = `Level ${level}`;
    if (levelTitle) levelTitle.textContent = LEVEL_TITLES[level] || LEVEL_TITLES[10];
    if (levelIcon) {
        levelIcon.className = `fas ${LEVEL_ICONS[level] || LEVEL_ICONS[10]}`;
    }
    
    // Update progress bar using proper XP thresholds
    const progress = getXPProgressInLevel(xp, level);
    
    const progressBar = document.getElementById('level-progress-bar');
    const progressText = document.getElementById('level-progress-text');
    
    if (progressBar) progressBar.style.width = `${progress.percent}%`;
    if (progressText) progressText.textContent = `${progress.current} / ${progress.needed} XP to Level ${level + 1}`;
    
    // Update total XP and badge count
    const totalXPEl = document.getElementById('total-xp');
    const badgeCount = document.getElementById('badge-count');
    
    if (totalXPEl) totalXPEl.textContent = xp.toLocaleString();
    if (badgeCount) badgeCount.textContent = badges.length;
}

async function loadAllBadges() {
    // Fetch all available badges and user's earned badges
    try {
        const data = await apiRequest('/auth/me');
        const earnedBadgeIds = (data.badges || []).map(b => b.id);
        
        // Define all available badges
        const allBadges = [
            { id: 1, name: 'First Steps', description: 'Log your first activity', icon: 'fa-seedling' },
            { id: 2, name: 'Week Warrior', description: '7-day logging streak', icon: 'fa-fire' },
            { id: 3, name: 'Green Commuter', description: '10 bike trips logged', icon: 'fa-bicycle' },
            { id: 4, name: 'Veggie Lover', description: '5 meat-free days', icon: 'fa-leaf' },
            { id: 5, name: 'Carbon Champion', description: 'Reduce emissions 50%', icon: 'fa-trophy' },
            { id: 6, name: 'Planet Protector', description: 'Below global average', icon: 'fa-globe' },
            { id: 7, name: 'Eco Legend', description: 'Reach Level 10', icon: 'fa-crown' },
            { id: 8, name: 'Renewable Hero', description: '100% green energy', icon: 'fa-solar-panel' }
        ];
        
        renderBadges(allBadges.map(badge => ({
            ...badge,
            earned: earnedBadgeIds.includes(badge.id)
        })));
    } catch (error) {
        console.error('Failed to load badges:', error);
    }
}

function renderBadges(badges) {
    const container = document.getElementById('badges-grid');
    if (!container) return;
    
    if (!isLoggedIn()) {
        container.innerHTML = '<div class="empty-state"><p>Please login to view achievements.</p></div>';
        return;
    }
    
    // Define all available badges with their status
    const allBadges = [
        { name: 'First Steps', description: 'Log your first activity', icon: 'fa-seedling' },
        { name: 'Week Warrior', description: '7-day logging streak', icon: 'fa-fire' },
        { name: 'Green Commuter', description: '10 bike trips logged', icon: 'fa-bicycle' },
        { name: 'Veggie Lover', description: '5 meat-free days', icon: 'fa-leaf' },
        { name: 'Carbon Champion', description: 'Reduce emissions 50%', icon: 'fa-trophy' },
        { name: 'Planet Protector', description: 'Below global average', icon: 'fa-globe' },
        { name: 'Eco Legend', description: 'Reach Level 10', icon: 'fa-crown' },
        { name: 'Renewable Hero', description: '100% green energy', icon: 'fa-solar-panel' }
    ];
    
    const earnedNames = badges.map(b => b.name);
    
    container.innerHTML = allBadges.map(badge => {
        const isEarned = earnedNames.includes(badge.name);
        return `
            <div class="badge-card ${isEarned ? 'earned' : ''}">
                <div class="badge-icon">
                    <i class="fas ${badge.icon}"></i>
                </div>
                <span class="badge-name">${badge.name}</span>
                <span class="badge-desc">${badge.description}</span>
            </div>
        `;
    }).join('');
}

let currentLeaderboardType = 'global';

async function loadLeaderboard(type = 'global') {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    
    currentLeaderboardType = type;
    
    container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';
    
    try {
        let endpoint = '/leaderboard';
        if (type === 'weekly') endpoint = '/leaderboard/weekly';
        else if (type === 'streak') endpoint = '/leaderboard/streaks';
        
        const data = await apiRequest(endpoint);
        renderLeaderboard(data.leaderboard || [], data.userRank, type);
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        container.innerHTML = '<div class="empty-state"><p>Failed to load leaderboard.</p></div>';
    }
}

function renderLeaderboard(leaderboard, userRank, type = 'global') {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    
    if (leaderboard.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No users on the leaderboard yet. Be the first!</p></div>';
        return;
    }
    
    const getRankClass = (rank) => {
        if (rank === 1) return 'gold';
        if (rank === 2) return 'silver';
        if (rank === 3) return 'bronze';
        return '';
    };
    
    container.innerHTML = leaderboard.map(user => {
        // Different display for streak leaderboard
        const scoreDisplay = type === 'streak' 
            ? `<span class="lb-score"><i class="fas fa-fire" style="color: #e67e22;"></i> ${user.streak} days</span>`
            : `<span class="lb-score">${user.xp.toLocaleString()} XP</span>`;
            
        const reductionDisplay = type === 'streak'
            ? `<span class="lb-reduction">${user.xp.toLocaleString()} XP</span>`
            : `<span class="lb-reduction">${user.reductionPercent > 0 ? '-' : '+'}${Math.abs(user.reductionPercent || 0)}%</span>`;
        
        return `
            <div class="leaderboard-item ${getRankClass(user.rank)} ${user.isCurrentUser ? 'you' : ''}">
                <span class="lb-rank">${user.rank}</span>
                <div class="lb-avatar"><i class="fas fa-user-circle"></i></div>
                <span class="lb-name">${user.isCurrentUser ? 'You' : user.username}</span>
                ${scoreDisplay}
                ${reductionDisplay}
            </div>
        `;
    }).join('');
    
    // Add current user if not in top list
    if (userRank && !leaderboard.some(u => u.isCurrentUser)) {
        container.innerHTML += `
            <div class="leaderboard-item you" style="margin-top: 1rem; border-top: 2px solid var(--border-color); padding-top: 1rem;">
                <span class="lb-rank">${userRank.rank}</span>
                <div class="lb-avatar"><i class="fas fa-user-circle"></i></div>
                <span class="lb-name">You</span>
                <span class="lb-score">${userRank.xp.toLocaleString()} XP</span>
                <span class="lb-reduction">${userRank.reductionPercent > 0 ? '-' : '+'}${Math.abs(userRank.reductionPercent || 0)}%</span>
            </div>
        `;
    }
}

function openAddGoalModal() {
    if (!isLoggedIn()) {
        openAuthModal('login');
        return;
    }
    
    const modal = document.getElementById('add-goal-modal');
    if (modal) modal.classList.add('active');
}

function closeAddGoalModal() {
    const modal = document.getElementById('add-goal-modal');
    if (modal) modal.classList.remove('active');
}

// ==================== PROFILE & SETTINGS ====================
function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    
    const user = getUser();
    if (user) {
        const usernameEl = document.getElementById('profile-username');
        const emailEl = document.getElementById('profile-email');
        const levelEl = document.getElementById('profile-level');
        const xpEl = document.getElementById('profile-xp');
        const streakEl = document.getElementById('profile-streak');
        
        if (usernameEl) usernameEl.value = user.name || user.username || 'User';
        if (emailEl) emailEl.value = user.email || '';
        if (levelEl) levelEl.textContent = user.level || 1;
        if (xpEl) xpEl.textContent = user.xp || 0;
        if (streakEl) streakEl.textContent = user.streak || 0;
    }
    
    modal.classList.add('active');
}

function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.remove('active');
}

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('active');
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('active');
}

function saveSettings() {
    const theme = document.getElementById('theme-select')?.value || 'light';
    const dailyReminders = document.getElementById('daily-reminders')?.checked;
    const weeklyReports = document.getElementById('weekly-reports')?.checked;
    
    // Save to localStorage
    localStorage.setItem('settings', JSON.stringify({
        theme,
        dailyReminders,
        weeklyReports
    }));
    
    // Apply theme immediately
    applyTheme(theme);
    
    closeSettingsModal();
    showToast('Settings saved!', 'success');
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    
    const themeSelect = document.getElementById('theme-select');
    const dailyReminders = document.getElementById('daily-reminders');
    const weeklyReports = document.getElementById('weekly-reports');
    
    if (themeSelect && settings.theme) themeSelect.value = settings.theme;
    if (dailyReminders) dailyReminders.checked = settings.dailyReminders !== false;
    if (weeklyReports) weeklyReports.checked = settings.weeklyReports !== false;
    
    // Apply saved theme
    applyTheme(settings.theme || 'light');
}

async function saveGoal() {
    const type = document.getElementById('goal-type').value;
    const target = parseFloat(document.getElementById('goal-target').value);
    const duration = document.getElementById('goal-duration').value;
    const title = document.getElementById('goal-title')?.value || '';
    const editId = document.getElementById('goal-form')?.dataset.editId;
    
    if (!type || !target) {
        showToast('Please fill in all fields', 'warning');
        return;
    }
    
    const goalTitles = {
        'reduce-transport': 'Green Transport Challenge',
        'reduce-energy': 'Clean Energy Challenge',
        'diet-change': 'Plant-Based Diet Challenge',
        'zero-waste': 'Zero Waste Challenge',
        'streak': 'Logging Streak Challenge'
    };
    
    // Calculate XP reward based on difficulty (target value and duration)
    const durationDays = parseInt(duration) || 30;
    const baseXP = 50;
    const difficultyMultiplier = Math.min(3, 1 + (target / 20)); // More difficult = more XP
    const durationMultiplier = durationDays <= 7 ? 1.5 : durationDays <= 14 ? 1.2 : 1; // Shorter = harder
    const xpReward = Math.round(baseXP * difficultyMultiplier * durationMultiplier);
    
    try {
        if (editId) {
            // Update existing goal
            await apiRequest(`/goals/${editId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: title || goalTitles[type] || 'Custom Goal',
                    target_value: target,
                    duration_days: durationDays,
                    type: type,
                    xp_reward: xpReward
                })
            });
            delete document.getElementById('goal-form').dataset.editId;
            showToast('Goal updated!', 'success');
        } else {
            // Create new goal
            await apiRequest('/goals', {
                method: 'POST',
                body: JSON.stringify({
                    title: title || goalTitles[type] || 'Custom Goal',
                    target_value: target,
                    duration_days: durationDays,
                    type: type,
                    xp_reward: xpReward
                })
            });
            showToast('Goal created! Log activities to make progress.', 'success');
        }
        
        closeAddGoalModal();
        loadGoals();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Goal type hints
const GOAL_HINTS = {
    'reduce-transport': {
        hint: 'Progress by logging bike rides, walks, public transport, or carpooling instead of driving alone.',
        targetHint: 'Each km by eco-transport saves ~0.1-0.2 kg CO₂'
    },
    'reduce-energy': {
        hint: 'Progress by logging renewable or nuclear energy usage instead of fossil fuels.',
        targetHint: 'Each kWh of green energy saves ~0.4-0.9 kg CO₂'
    },
    'diet-change': {
        hint: 'Progress by logging vegetarian or vegan meals instead of meat-heavy meals.',
        targetHint: 'Each plant-based meal saves ~3-4 kg CO₂'
    },
    'zero-waste': {
        hint: 'Progress by logging recycling and composting activities.',
        targetHint: 'Each recycling action counts toward your goal'
    },
    'streak': {
        hint: 'Progress by maintaining consecutive days of logging any activity.',
        targetHint: 'Enter the number of days you want to maintain'
    }
};

function updateGoalHints(goalType) {
    const goalHint = document.getElementById('goal-hint');
    const targetHint = document.getElementById('target-hint');
    const targetLabel = document.querySelector('label[for="goal-target"]');
    
    const hints = GOAL_HINTS[goalType];
    
    if (hints) {
        if (goalHint) goalHint.textContent = hints.hint;
        if (targetHint) targetHint.textContent = hints.targetHint;
        if (targetLabel) {
            targetLabel.textContent = goalType === 'streak' ? 'Target (days)' : 'Target (kg CO₂ to save)';
        }
    } else {
        if (goalHint) goalHint.textContent = 'Select a goal type to see how it works';
        if (targetHint) targetHint.textContent = 'How much CO₂ you aim to save';
    }
}

// ==================== UTILITIES ====================
function getCategoryIcon(category) {
    const icons = {
        transport: 'fa-car',
        energy: 'fa-bolt',
        food: 'fa-utensils',
        waste: 'fa-recycle',
        shopping: 'fa-shopping-bag'
    };
    return icons[category] || 'fa-leaf';
}

function formatActivityType(type) {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    if (toast && toastMessage) {
        toast.className = `toast ${type}`;
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth UI
    updateAuthUI();
    
    // Navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) showSection(section);
        });
    });
    
    // Auth modal
    document.getElementById('show-auth-btn')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    // Profile and Settings links
    document.getElementById('profile-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('user-dropdown-menu')?.classList.remove('show');
        openProfileModal();
    });
    document.getElementById('settings-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('user-dropdown-menu')?.classList.remove('show');
        openSettingsModal();
    });
    
    // Profile/Settings modal backdrop close
    document.getElementById('profile-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'profile-modal') closeProfileModal();
    });
    document.getElementById('settings-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'settings-modal') closeSettingsModal();
    });
    
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });
    
    // Login/Register buttons
    document.getElementById('login-btn')?.addEventListener('click', handleLogin);
    document.getElementById('register-btn')?.addEventListener('click', handleRegister);
    
    // Close modal on backdrop click
    document.getElementById('auth-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'auth-modal') closeAuthModal();
    });
    
    // User dropdown
    document.getElementById('user-dropdown-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('user-dropdown-menu')?.classList.toggle('show');
    });
    
    document.addEventListener('click', () => {
        document.getElementById('user-dropdown-menu')?.classList.remove('show');
    });
    
    // Activity log date navigation
    document.getElementById('prev-date')?.addEventListener('click', () => {
        if (currentPeriod === 'daily') {
            currentLogDate.setDate(currentLogDate.getDate() - 1);
        } else if (currentPeriod === 'weekly') {
            currentLogDate.setDate(currentLogDate.getDate() - 7);
        } else if (currentPeriod === 'monthly') {
            currentLogDate.setMonth(currentLogDate.getMonth() - 1);
        }
        loadActivityLog();
    });
    
    document.getElementById('next-date')?.addEventListener('click', () => {
        if (currentPeriod === 'daily') {
            currentLogDate.setDate(currentLogDate.getDate() + 1);
        } else if (currentPeriod === 'weekly') {
            currentLogDate.setDate(currentLogDate.getDate() + 7);
        } else if (currentPeriod === 'monthly') {
            currentLogDate.setMonth(currentLogDate.getMonth() + 1);
        }
        loadActivityLog();
    });
    
    // Period selector buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPeriod = btn.dataset.period;
            loadActivityLog();
        });
    });
    
    // Activity modal
    document.getElementById('add-activity-btn')?.addEventListener('click', openAddActivityModal);
    document.getElementById('cancel-activity')?.addEventListener('click', closeAddActivityModal);
    document.getElementById('save-activity')?.addEventListener('click', saveActivity);
    
    document.getElementById('add-activity-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'add-activity-modal') closeAddActivityModal();
    });
    
    // Goal modal
    document.getElementById('add-goal-btn')?.addEventListener('click', openAddGoalModal);
    document.getElementById('cancel-goal')?.addEventListener('click', closeAddGoalModal);
    document.getElementById('save-goal')?.addEventListener('click', saveGoal);
    
    // Goal type hint updates
    document.getElementById('goal-type')?.addEventListener('change', (e) => {
        updateGoalHints(e.target.value);
    });
    
    document.getElementById('add-goal-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'add-goal-modal') closeAddGoalModal();
    });
    
    // Leaderboard tabs
    document.querySelectorAll('.lb-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadLeaderboard(btn.dataset.lb);
        });
    });
    
    // Chart range buttons
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (isLoggedIn()) {
                try {
                    const chartData = await apiRequest(`/stats/charts?range=${btn.dataset.range}`);
                    updateEmissionsChart(chartData.timeline || chartData);
                    updateCategoryChart(chartData.categories || []);
                } catch (error) {
                    console.error('Failed to load chart data:', error);
                }
            }
        });
    });
    
    // Initialize calculator
    initCalculator();
    
    // Load settings
    loadSettings();
    
    // Load initial dashboard
    loadDashboard();
});
