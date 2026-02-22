# CarbonWise 🌱

A carbon footprint tracking application with ML-powered insights. Track your daily activities, monitor your environmental impact, set sustainability goals, and compete with others on the leaderboard.

## Features

- **Activity Tracking**: Log daily activities and their carbon footprint
- **Smart Insights**: ML-powered analysis of your carbon usage patterns
- **Goal Setting**: Set and track sustainability goals
- **Leaderboard**: Compare your progress with other users
- **Statistics Dashboard**: Visualize your environmental impact over time

## Prerequisites

Before running this application, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Git](https://git-scm.com/)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/carbonwise.git
cd carbonwise
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

**macOS/Linux:**
```bash
touch .env
```

**Windows (Command Prompt):**
```cmd
type nul > .env
```

**Windows (PowerShell):**
```powershell
New-Item .env -ItemType File
```

Add the following environment variables to the `.env` file:

```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key_here
```

> **Note**: Replace `your_super_secret_jwt_key_here` with a secure random string for production use.

### 4. Run the Application

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

### 5. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
carbonwise/
├── server.js           # Main Express server
├── package.json        # Project dependencies
├── database/
│   └── db.js          # SQLite database configuration
├── middleware/
│   └── auth.js        # JWT authentication middleware
├── routes/
│   ├── auth.js        # Authentication routes
│   ├── activities.js  # Activity tracking routes
│   ├── goals.js       # Goal management routes
│   ├── insights.js    # ML insights routes
│   ├── stats.js       # Statistics routes
│   └── leaderboard.js # Leaderboard routes
├── utils/
│   ├── gamification.js    # Gamification logic
│   ├── insights-engine.js # ML insights engine
│   └── ollama.js          # Ollama LLM integration
└── public/
    ├── index.html     # Frontend HTML
    ├── app.js         # Frontend JavaScript
    └── styles.css     # Frontend styles
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| GET | `/api/activities` | Get user activities |
| POST | `/api/activities` | Log new activity |
| GET | `/api/goals` | Get user goals |
| POST | `/api/goals` | Create new goal |
| GET | `/api/insights` | Get ML-powered insights |
| GET | `/api/stats` | Get user statistics |
| GET | `/api/leaderboard` | Get leaderboard |

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: SQLite (sql.js - pure JavaScript, no native modules)
- **Authentication**: JWT (jsonwebtoken), bcryptjs
- **Frontend**: HTML, CSS, JavaScript, Chart.js
- **AI/ML**: Ollama (local LLM) for personalized insights

## AI-Powered Insights with Ollama

CarbonWise uses [Ollama](https://ollama.ai/) to generate personalized, AI-powered carbon footprint insights. Ollama runs locally on your machine, ensuring privacy and no API costs.

### Installing Ollama on Windows

#### Step 1: Download Ollama

1. Visit [https://ollama.ai/download](https://ollama.ai/download)
2. Click **"Download for Windows"**
3. Run the installer (`OllamaSetup.exe`)
4. Follow the installation wizard (keep default settings)

#### Step 2: Verify Installation

Open **Command Prompt** or **PowerShell** and run:

```cmd
ollama --version
```

You should see the version number (e.g., `ollama version 0.1.x`).

#### Step 3: Pull the Required Model

CarbonWise uses the `llama3.1:8b` model. Download it by running:

```cmd
ollama pull llama3.1:8b
```

> **Note**: This downloads ~4.7GB. Make sure you have sufficient disk space and a stable internet connection.

#### Step 4: Start the Ollama Server

Ollama runs as a background service on Windows. To ensure it's running:

```cmd
ollama serve
```

Or check if it's already running:

```cmd
curl http://localhost:11434/api/tags
```

If you see a JSON response with model information, Ollama is ready!

#### Step 5: Configure CarbonWise (Optional)

Add these to your `.env` file to customize Ollama settings:

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT=60000
```

### Installing Ollama on macOS

```bash
# Using Homebrew
brew install ollama

# Or download from https://ollama.ai/download

# Pull the model
ollama pull llama3.1:8b

# Start the server
ollama serve
```

### Installing Ollama on Linux

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the model
ollama pull llama3.1:8b

# Start the server
ollama serve
```

### Running Without Ollama

CarbonWise works without Ollama! If Ollama isn't available, the app automatically falls back to rule-based insights. You'll still get personalized recommendations based on your activity data.

### Troubleshooting Ollama

**"Connection refused" error:**
- Make sure Ollama is running: `ollama serve`
- Check if port 11434 is available

**Slow response times:**
- First inference is slower (model loading)
- Subsequent requests are faster
- Consider using a smaller model: `ollama pull llama3.2:3b`

**Out of memory:**
- Close other applications
- Try a smaller model: `ollama pull llama3.2:1b`

**Windows Firewall blocking Ollama:**
- Allow Ollama through Windows Firewall
- Settings → Privacy & Security → Windows Security → Firewall → Allow an app

## Troubleshooting

### Common Issues

**Port already in use:**

*macOS/Linux:*
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 <PID>
```

*Windows (Command Prompt):*
```cmd
:: Find process using port 3000
netstat -ano | findstr :3000
:: Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F
```

*Windows (PowerShell):*
```powershell
# Find and kill process using port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

**Module not found errors:**

*macOS/Linux:*
```bash
rm -rf node_modules
npm install
```

*Windows (Command Prompt):*
```cmd
rmdir /s /q node_modules
npm install
```

*Windows (PowerShell):*
```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

**'nodemon' is not recognized (Windows):**

This error occurs because `nodemon` is installed locally. Use one of these solutions:

*Option 1: Use `npm start` instead (recommended for production):*
```cmd
npm start
```

*Option 2: Install nodemon globally:*
```cmd
npm install -g nodemon
npm run dev
```

*Option 3: Use npx to run local nodemon:*
```cmd
npx nodemon server.js
```

**Database errors:**
- The SQLite database is created automatically on first run
- To reset the database, delete the `.db` file in the database folder and restart the server

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

---

Made with 💚 for a sustainable future
