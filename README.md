# HillingOne

**The AI-powered front door for Hillingdon Council's community space bookings.**

Built for the Hillingdon × Brunel Hackathon, 29 April 2026.

---

## What this is

A complete, working full-stack application:

- **Backend:** Python FastAPI + PostgreSQL + SQLAlchemy async
- **Frontend:** React 18 + Vite + Tailwind CSS
- **AI:** Google Gemini 2.5 Flash with native function calling (genuine agentic AI)
- **Deployment:** Docker Compose — one command to run locally, or deploy free to Render + Vercel + Neon

Until now, residents and staff have had to navigate **17 different fragmented interfaces** to find and book community spaces across Hillingdon. HillingOne replaces those 17 frontends with one intelligent layer powered by four autonomous AI agents.

---

## The four-tier cancellation model

This is the trust framework at the core of HillingOne.

| Tier | When | What happens |
|------|------|--------------|
| 1. User cancellation | Resident cancels their own booking | Always allowed |
| 2. Agent-mediated swap | Staff/councillor needs a confirmed slot | Agent asks resident with an alternative + 20% goodwill credit. Resident decides. |
| 3. Legitimate operational override | Room damage, safety issue, mandatory closure | Staff can cancel — but must give a documented reason. Alternative offered, credit applied, full audit trail. |
| 4. Force majeure | Building-wide emergency | System cancels, alternatives proposed, full audit |

**Staff get priority on availability. Residents get priority on certainty.**
**Trust is not built by saying never. It is built by saying always — with transparency.**

---

## The four AI agents

### Agent 1 — Conflict Resolution Agent (on-demand)
Genuine agentic AI using Gemini 2.5 Flash function calling. Receives a goal, has 6 tools available, and autonomously decides which to call:

1. `search_inventory` — find candidate alternative spaces
2. `check_availability` — verify a candidate is free
3. `score_alternative` — rate how well it matches the original booking
4. `send_swap_request` — propose a polite swap with goodwill credit
5. `escalate_to_staff` — when no suitable alternative exists
6. `log_decision` — write a full record to the audit trail

Each step streams live to the **AI Reasoning Panel** in the staff dashboard so you can watch the agent think in real time.

### Agent 2 — Demand Sensing Agent (every 15 minutes)
Analyses recent search queries and booking patterns. Produces a natural-language report of what residents are searching for, which wards have unmet demand, and where new inventory would have the most impact.

### Agent 3 — Booking Conversation Agent (per search)
Parses free-text and voice booking requests into structured intent (location, capacity, time, accessibility needs). Powers the main search experience.

### Agent 4 — Inventory Optimisation Agent (every 30 minutes)
Reviews all assets for utilisation patterns. Identifies underused or overbooked spaces and generates actionable recommendations for staff.

---

## How to run locally

### Step 1: Get a Gemini API key (free)

Go to https://aistudio.google.com → **Get API key** → copy it.

### Step 2: Configure environment

```bash
cp .env.example .env
# Open .env and paste your Gemini key into GEMINI_API_KEY
```

### Step 3: Start the backend and database

```bash
docker compose up
```

This will:
1. Start PostgreSQL
2. Run database migrations (Alembic)
3. Seed 25 real Hillingdon community assets, 2 demo users, and 6 realistic bookings
4. Start the FastAPI backend on http://localhost:8000

### Step 4: Start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

### Step 5: Open the app

Visit **http://localhost:5173**

---

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Resident | jawad@hillingdon.gov.uk | demo1234 |
| Staff | staff@hillingdon.gov.uk | staff1234 |

Or click **Demo: Resident** / **Demo: Staff** on the login screen — no password needed.

---

## Demo flow

### Scenario 1 — Resident books in plain English

1. Click **Demo: Resident** to log in
2. Type or speak a request: *"I need a room for 20 children every Tuesday afternoon in Hayes, with a kitchen"*
3. The AI parses the intent and shows matched spaces with scores and reasoning
4. Click **Book this** → a 60-second hold timer starts
5. Click **Confirm booking** → booking is confirmed and protected
6. Download the calendar invite (.ics) from the booking

### Scenario 2 — The autonomous agent (the moment that wins)

1. Log in as **Demo: Staff**
2. Go to **Bookings** → find any confirmed booking → click **Resolve**
3. The AI Reasoning Panel opens
4. Watch each step stream live:
   - Searching inventory in the relevant ward
   - Checking availability of the best candidate
   - Scoring the alternative against the original
   - Sending a polite swap request with goodwill credit
   - Logging the full decision
5. Final decision: `swap_proposed`
6. The resident can accept or decline — if declined, their booking stays

### Scenario 3 — Legitimate override

1. In the staff dashboard, open the **Demo Controller**
2. Click **Run override: flooded room**
3. Staff cancels a confirmed booking with reason `room_damage`
4. Resident is notified with full reason + alternative offer + 20% goodwill credit
5. Audit log entry created automatically

---

## API endpoints

```
GET    /health                                   Health check
POST   /api/auth/login                           Authenticate user
POST   /api/auth/register                        Register new user
POST   /api/auth/demo                            Demo login (no password)
POST   /api/search                               Parse intent + rank matches
POST   /api/search/image                         Extract booking query from image (Gemini Vision)
POST   /api/bookings/hold                        Create a 60s held booking
POST   /api/bookings/{id}/confirm                Resident confirms booking
DELETE /api/bookings/{id}                        User cancels (Tier 1)
GET    /api/bookings/{id}/ics                    Download calendar invite
POST   /api/agent/conflict-resolution/stream     Trigger autonomous agent (SSE stream)
GET    /api/agent/runs/recent                    Recent agent run history
POST   /api/staff/override                       Tier 3 override
GET    /api/staff/dashboard                      Live stats + agent feed
GET    /api/staff/all-bookings                   All bookings
GET    /api/staff/agents/demand                  Latest demand sensing report
GET    /api/staff/agents/inventory               Latest inventory optimisation report
GET    /api/assets                               List all assets
POST   /api/demo/scenario/agent-swap-request     Trigger agent demo scenario
POST   /api/demo/scenario/legitimate-override    Trigger override demo scenario
POST   /api/demo/reset                           Reset demo data
```

Full interactive API docs: http://localhost:8000/docs

---

## Deploying for free

| Service | What it hosts | Free tier |
|---------|--------------|-----------|
| **Vercel** | Frontend (React/Vite) | Unlimited, global CDN |
| **Render** | Backend (FastAPI) | 750 hrs/month — sleeps after 15 min idle |
| **Neon** | PostgreSQL database | 0.5 GB, never expires |

See the deployment guide in the project documentation for step-by-step instructions.

---

## Troubleshooting

**Backend can't connect to Postgres:**
Wait a few seconds for the health check to resolve. Or run `docker compose down -v && docker compose up` for a clean start.

**Gemini API errors / "The AI is busy":**
Check that `GEMINI_API_KEY` is set in `.env`. The free tier allows 20 requests/minute — if you hit this limit, wait 60 seconds. The app falls back gracefully so the demo still works without a key.

**Frontend can't reach backend:**
Make sure the backend is running on port 8000. The Vite dev server proxies `/api` → `http://localhost:8000` automatically.

**Image upload not processing:**
Requires a valid Gemini API key. If the rate limit is hit you'll see a clear message. You can always type your request instead.

---

## The pitch lines

> "Until now, residents and staff had to navigate seventeen different booking interfaces. We replaced all seventeen with one intelligent layer."

> "Staff get priority on availability. Residents get priority on certainty."

> "When a conflict arises, our agent runs autonomously — searches inventory, checks availability, scores alternatives, and proposes a swap with a personalised message. You can watch it reason on screen, live."

> "Trust is not built by saying never. It is built by saying always — with transparency."

> "The agent suggests. The human decides."

---

Built by Team Falcon, Brunel Computer Science.
