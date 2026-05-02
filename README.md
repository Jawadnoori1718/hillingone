# HillingOne 🏛️

*AI-powered council space booking system for Hillingdon — residents book community spaces in plain English while autonomous AI agents handle conflicts, analyse demand, and optimise usage across the borough.*

---

## ✨ Key Features

- **Natural Language Booking** — Residents describe what they need in plain English (or voice) and the AI finds the best match across all council spaces
- **Autonomous AI Agents** — Four Gemini 2.5 Flash agents run in the background: conflict resolution, demand sensing, booking conversation, and inventory optimisation
- **Live Agent Reasoning Panel** — Watch the AI reason step-by-step in real time as it resolves booking conflicts
- **Staff Dashboard** — Full overview of all bookings, utilisation stats, unmet demand alerts, and one-click agent triggers
- **Trust Framework** — A four-tier cancellation model with full audit trails, goodwill credits, and alternative offers so residents always feel protected
- **Fully Responsive** — Works seamlessly on mobile, tablet, and desktop with a native-style bottom nav on small screens

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python FastAPI + SQLAlchemy (async) |
| Database | PostgreSQL (Neon) / SQLite (local) |
| AI | Google Gemini 2.5 Flash (function calling) |
| Auth | JWT-based authentication |
| Deployment | Docker · Render · Vercel · Neon |

---

## 📁 Project Structure

```
HillingOne/
├── frontend/          # React 18 + Vite frontend
│   └── src/
│       ├── views/     # ResidentView, StaffView, BookingConfirmation
│       └── components/# AssetCard, SearchBox, AgentReasoningPanel
├── backend/
│   └── app/
│       ├── routers/   # API route handlers
│       ├── agents/    # Gemini AI agents (conflict, demand, inventory)
│       ├── models/    # SQLAlchemy ORM models
│       └── seed/      # 25 real Hillingdon assets + demo data
└── docker-compose.yml
```

---

## 🚀 Getting Started

### Requirements

- Python 3.11+
- Node.js 18+
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com)

### Run locally

**Terminal 1 — Backend**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Resident | amara@hillingdon.gov.uk | password123 |
| Staff | staff@hillingdon.gov.uk | staffpass123 |

Or click **Demo: Resident** / **Demo: Staff** on the login screen — no password needed.

---

## 🤖 The Four AI Agents

| Agent | Trigger | What it does |
|-------|---------|--------------|
| Conflict Resolution | On demand | Autonomously finds an alternative space and proposes a polite swap to the resident |
| Booking Conversation | Per search | Parses free-text requests into structured booking intent |
| Demand Sensing | Every 15 min | Identifies which wards have unmet demand and recommends new inventory |
| Inventory Optimisation | Every 30 min | Flags underused and overbooked spaces with actionable staff recommendations |

---

## 🌍 Live Demo

| Service | URL |
|---------|-----|
| Frontend | https://hillingone.vercel.app |
| Backend API | https://hillingone-backend.onrender.com |
| API Docs | https://hillingone-backend.onrender.com/docs |

> The backend is on Render's free tier and may take 30–50 seconds to wake up on first visit.

---

## 👨‍💻 Author

**Jawad Noori**  
Computer Science Student & Aspiring Software Engineer  
GitHub: https://github.com/Jawadnoori1718
