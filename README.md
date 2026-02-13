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
│   └── insights-engine.js # ML insights engine
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
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT (jsonwebtoken), bcryptjs
- **Frontend**: HTML, CSS, JavaScript

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
