# CarbonWise Startup Guide

Complete guide to running CarbonWise from scratch.

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | Backend server |
| Python | 3.9+ | ML microservice |
| pip | Latest | Python package manager |
| Ollama | Latest | LLM service (optional) |

### Verify Installations

```bash
node --version    # Should show v18+
python3 --version # Should show 3.9+
pip3 --version    # Any recent version
ollama --version  # Optional
```

---

## First-Time Setup

### Step 1: Clone/Navigate to Project

```bash
cd /Users/abhiramk01/CW1
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

This installs:
- express (web server)
- sql.js (SQLite database)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- node-fetch (HTTP client)
- And other dependencies...

### Step 2.5: (Optional) Seed Demo Users

```bash
node seed-users.js
```

This creates 5 demo users with activity history for testing:
- `alex.commuter@demo.com` - High transport emissions
- `bella.foodie@demo.com` - High diet emissions  
- `charlie.homebody@demo.com` - High electricity usage
- `diana.average@demo.com` - Balanced lifestyle
- `evan.green@demo.com` - Eco-conscious

**All passwords: `demo123`**

### Step 3: Install Python ML Dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

This installs:
- flask (API server)
- scikit-learn (ML algorithms)
- numpy (numerical computing)
- pandas (data manipulation)

### Step 4: Generate Training Data

```bash
cd ml-service
python generate_data.py
```

**Output:**
```
Generating 10000 synthetic users...
Dataset saved to data/
  - users_raw.json: 10000 users with activities
  - user_features.json: 10000 feature vectors
  - user_features.csv: CSV format for analysis
```

### Step 5: Train ML Models

```bash
python train_models.py
```

**Output:**
```
==================================================
CarbonWise ML Model Training
==================================================
Loaded 10000 user feature vectors

=== Training K-Means Clustering ===
Silhouette Score: 0.6596

=== Training Random Forest Predictor ===
R² Score: 0.9142

=== Training Anomaly Detector ===
Detected anomalies

✅ Training complete!
```

**Time:** ~30-60 seconds (includes hyperparameter tuning)

### Step 6: (Optional) Setup Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Or download from https://ollama.ai

# Pull a model
ollama pull llama3.2
```

---

## Starting the Application

### Option A: Start Services Individually

**Terminal 1 - ML Service:**
```bash
cd /Users/abhiramk01/CW1/ml-service
python app.py
```
Runs on: http://localhost:5001

**Terminal 2 - Node.js Server:**
```bash
cd /Users/abhiramk01/CW1
node server.js
```
Runs on: http://localhost:3000

**Terminal 3 - Ollama (Optional):**
```bash
ollama serve
```
Runs on: http://localhost:11434

### Option B: Quick Start (Background Processes)

```bash
# Navigate to project
cd /Users/abhiramk01/CW1

# Start ML service in background
cd ml-service && python app.py &

# Start Node.js server
cd /Users/abhiramk01/CW1 && node server.js
```

### Option C: One-Liner Start

```bash
cd /Users/abhiramk01/CW1 && \
(cd ml-service && python app.py &) && \
sleep 2 && \
node server.js
```

---

## Stopping the Application

### Stop All Services

```bash
# Kill Node.js
pkill -9 node

# Kill Python ML service
pkill -9 -f "python.*app.py"

# Kill Ollama (if running)
pkill -9 ollama
```

### Stop Specific Ports

```bash
# Kill process on port 3000 (Node.js)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5001 (ML service)
lsof -ti:5001 | xargs kill -9

# Kill process on port 11434 (Ollama)
lsof -ti:11434 | xargs kill -9
```

---

## Restart Commands

### Quick Restart (All Services)

```bash
# Kill everything and restart
pkill -9 node; pkill -9 -f "python.*app.py"; sleep 1; \
cd /Users/abhiramk01/CW1/ml-service && python app.py & \
sleep 2 && \
cd /Users/abhiramk01/CW1 && node server.js
```

### Restart ML Service Only

```bash
lsof -ti:5001 | xargs kill -9 2>/dev/null
cd /Users/abhiramk01/CW1/ml-service && python app.py &
```

### Restart Node.js Only

```bash
pkill -9 node
cd /Users/abhiramk01/CW1 && node server.js
```

---

## Health Checks

### Check All Services

```bash
# Node.js Backend
curl http://localhost:3000/health

# ML Service
curl http://localhost:5001/health

# Ollama
curl http://localhost:11434/api/tags
```

### Expected Responses

**Node.js:**
```json
{"status":"ok","timestamp":"2026-03-09T..."}
```

**ML Service:**
```json
{
    "status": "healthy",
    "models_loaded": 6,
    "available_endpoints": ["/classify", "/predict", "/anomaly", "/recommend"]
}
```

**Ollama:**
```json
{"models":[{"name":"llama3.2",...}]}
```

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3000
lsof -i :5001

# Kill the process
lsof -ti:3000 | xargs kill -9
```

### ML Models Not Found

```bash
# Check if models exist
ls -la /Users/abhiramk01/CW1/ml-service/models/

# Regenerate if missing
cd /Users/abhiramk01/CW1/ml-service
python generate_data.py
python train_models.py
```

### Node.js Module Errors

```bash
# Reinstall dependencies
cd /Users/abhiramk01/CW1
rm -rf node_modules
npm install
```

### Python Import Errors

```bash
# Reinstall Python dependencies
cd /Users/abhiramk01/CW1/ml-service
pip install -r requirements.txt --force-reinstall
```

### Database Issues

```bash
# Delete and recreate database
rm /Users/abhiramk01/CW1/carbonwise.db
# Database auto-creates on server start
node server.js
```

---

## Service Ports Summary

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Node.js Backend | 3000 | http://localhost:3000 | Main application |
| ML Microservice | 5001 | http://localhost:5001 | Machine learning |
| Ollama LLM | 11434 | http://localhost:11434 | Language model |

---

## Directory Structure

```
/Users/abhiramk01/CW1/
├── server.js           # Main entry point
├── package.json        # Node.js dependencies
├── carbonwise.db       # SQLite database (auto-created)
│
├── public/             # Frontend files
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── routes/             # API routes
│   ├── activities.js
│   ├── auth.js
│   ├── insights.js
│   └── ...
│
├── utils/              # Utility modules
│   ├── ml-client.js    # ML service client
│   ├── ollama-client.js # LLM client
│   └── ...
│
├── ml-service/         # Python ML microservice
│   ├── app.py          # Flask API
│   ├── generate_data.py
│   ├── train_models.py
│   ├── requirements.txt
│   ├── data/           # Training data
│   └── models/         # Trained models
│
└── docs/               # Documentation
    ├── ML-LLM-ARCHITECTURE.md
    └── STARTUP-GUIDE.md
```

---

## Quick Reference Card

### Start Everything
```bash
cd /Users/abhiramk01/CW1
cd ml-service && python app.py &
cd .. && node server.js
```

### Stop Everything
```bash
pkill -9 node; pkill -9 -f "python.*app.py"
```

### Check Everything
```bash
curl localhost:3000/health && curl localhost:5001/health
```

### Open Application
```
http://localhost:3000
```

---

## Development Mode

### Watch for Changes (Node.js)

```bash
# Install nodemon globally
npm install -g nodemon

# Run with auto-restart
nodemon server.js
```

### Debug Mode

```bash
# Node.js with debug output
DEBUG=* node server.js

# Python with verbose output
python app.py --debug
```

---

## Production Considerations

For production deployment, consider:

1. **Environment Variables**
   ```bash
   export NODE_ENV=production
   export JWT_SECRET=your-secure-secret
   ```

2. **Process Manager (PM2)**
   ```bash
   npm install -g pm2
   pm2 start server.js
   pm2 start ml-service/app.py --interpreter python3
   ```

3. **Reverse Proxy (nginx)**
   - Route both services through nginx
   - Enable HTTPS
   - Add rate limiting

4. **Database**
   - Consider PostgreSQL or MySQL for production
   - Implement proper backups
