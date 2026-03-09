<p align="center">
  <img src="https://img.icons8.com/color/96/000000/co2.png" alt="CarbonWise Logo"/>
</p>

<h1 align="center">🌱 CarbonWise</h1>

<p align="center">
  <strong>Track your carbon footprint. Make sustainable choices. Save the planet.</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-demo">Demo</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-documentation">Documentation</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen?style=flat-square&logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/express-4.x-blue?style=flat-square&logo=express" alt="Express"/>
  <img src="https://img.shields.io/badge/database-SQLite-orange?style=flat-square&logo=sqlite" alt="SQLite"/>
  <img src="https://img.shields.io/badge/AI-Ollama-purple?style=flat-square" alt="Ollama"/>
  <img src="https://img.shields.io/badge/license-ISC-green?style=flat-square" alt="License"/>
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Activity Tracking** | Log daily activities across 5 categories: Transport, Electricity, Heating, Diet, Waste |
| 🤖 **AI Insights** | Get personalized recommendations powered by local LLM (Ollama) |
| 🎯 **Goal Setting** | Set sustainability goals and track your progress |
| 🏆 **Gamification** | Earn XP, level up (1-15), maintain streaks, compete on leaderboards |
| 📈 **Analytics** | Interactive charts and detailed carbon footprint reports |
| 🧮 **Calculator** | Estimate your annual carbon footprint with our interactive calculator |
| 🌙 **Dark/Light Mode** | Toggle between themes for comfortable viewing |
| 👤 **Profile Management** | Editable profile with username/email validation |

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/AbhiramK01/CarbonWise.git
cd CarbonWise

# Install dependencies
npm install

# Create environment file
echo "PORT=3000\nJWT_SECRET=your_secret_key_here" > .env

# Start the server
npm start

# Open in browser
open http://localhost:3000
```

---

## 🎮 Demo

Want to explore without creating an account? Use our pre-seeded demo users:

```bash
# Seed the database with demo users
node seed-users.js
```

| User | Email | Profile |
|------|-------|---------|
| 🚗 Alex | `alex.commuter@demo.com` | Heavy commuter, high transport emissions |
| 🍔 Bella | `bella.foodie@demo.com` | Food enthusiast, high diet emissions |
| 🏠 Charlie | `charlie.homebody@demo.com` | Homebody, high energy usage |
| ⚖️ Diana | `diana.average@demo.com` | Balanced, typical lifestyle |
| 🌿 Evan | `evan.green@demo.com` | Eco-warrior, low footprint |

> **Password for all demo accounts:** `demo123`

---

## 🛠 Tech Stack

<table>
<tr>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=nodejs" width="48" height="48" alt="Node.js" />
<br>Node.js
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=express" width="48" height="48" alt="Express" />
<br>Express
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=sqlite" width="48" height="48" alt="SQLite" />
<br>SQLite
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=js" width="48" height="48" alt="JavaScript" />
<br>JavaScript
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=html" width="48" height="48" alt="HTML5" />
<br>HTML5
</td>
<td align="center" width="100">
<img src="https://skillicons.dev/icons?i=css" width="48" height="48" alt="CSS3" />
<br>CSS3
</td>
</tr>
</table>

**Additional Technologies:**
- **Chart.js** - Interactive data visualizations
- **JWT** - Secure authentication
- **Ollama** - Local AI/LLM for personalized insights
- **bcryptjs** - Password hashing

---

## 📖 Documentation

For detailed technical documentation, API reference, database schema, and more:

📄 **[View Full Specification →](SPECIFICATION.md)**

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | - | **Required.** Secret key for JWT tokens |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3.1:8b` | LLM model for AI insights |

### AI Insights (Optional)

CarbonWise uses [Ollama](https://ollama.ai/) for AI-powered insights. Install it for the full experience:

```bash
# macOS
brew install ollama

# Pull the model
ollama pull llama3.1:8b

# Start the server
ollama serve
```

> **Note:** The app works without Ollama—it falls back to rule-based insights.

---

## 📂 Project Structure

```
CarbonWise/
├── server.js           # Express server
├── seed-users.js       # Demo data seeder
├── database/           # SQLite database
├── routes/             # API endpoints
├── middleware/         # Auth middleware
├── utils/              # Gamification, insights, Ollama
└── public/             # Frontend (SPA)
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/awesome`)
3. Commit your changes (`git commit -m 'Add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">
  Made with 💚 for a sustainable future
</p>
