"""Atrium FastAPI application entry point."""
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import AsyncSessionLocal, engine, Base

logger = logging.getLogger("atrium")


async def _init_db() -> None:
    """Create all tables and seed demo data (used for SQLite / fresh DB)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        from app.seed.seed_data import seed
        await seed(db)


async def _background_tasks() -> None:
    """Periodic background worker: expires stale holds, processes reminders, runs demand agent."""
    while True:
        await asyncio.sleep(30)
        try:
            async with AsyncSessionLocal() as db:
                from app.services.booking_service import BookingService
                expired = await BookingService(db).expire_holds()
                if expired:
                    logger.info("Expired %d stale holds", expired)
        except Exception as exc:
            logger.warning("expire_holds error: %s", exc)

        try:
            async with AsyncSessionLocal() as db:
                from app.services.reminder_service import ReminderService
                sent = await ReminderService(db).process_due_reminders()
                if sent:
                    logger.info("Processed %d due reminders", sent)
        except Exception as exc:
            logger.warning("process_reminders error: %s", exc)


async def _demand_sensing_loop() -> None:
    """Agent 2: run Demand Sensing Agent every 15 minutes."""
    await asyncio.sleep(60)  # initial delay so app is fully up
    while True:
        try:
            async with AsyncSessionLocal() as db:
                from app.agents.demand_agent import DemandSensingAgent
                agent = DemandSensingAgent(db)
                await agent.run()
                logger.info("Demand Sensing Agent completed")
        except Exception as exc:
            logger.warning("demand_sensing error: %s", exc)
        await asyncio.sleep(900)  # 15 minutes


async def _inventory_optimisation_loop() -> None:
    """Agent 4: run Inventory Optimisation Agent every 30 minutes."""
    await asyncio.sleep(120)  # initial delay
    while True:
        try:
            async with AsyncSessionLocal() as db:
                from app.agents.inventory_agent import InventoryOptimisationAgent
                agent = InventoryOptimisationAgent(db)
                await agent.run()
                logger.info("Inventory Optimisation Agent completed")
        except Exception as exc:
            logger.warning("inventory_optimisation error: %s", exc)
        await asyncio.sleep(1800)  # 30 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _init_db()
    bg = asyncio.create_task(_background_tasks())
    demand = asyncio.create_task(_demand_sensing_loop())
    inventory = asyncio.create_task(_inventory_optimisation_loop())
    try:
        yield
    finally:
        for t in (bg, demand, inventory):
            t.cancel()
            try:
                await t
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title="Atrium",
    description="The intelligent agentic front door for Hillingdon Council bookings.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import search, bookings, agent, staff, assets, reminders, demo, auth
app.include_router(auth.router)
app.include_router(search.router)
app.include_router(bookings.router)
app.include_router(agent.router)
app.include_router(staff.router)
app.include_router(assets.router)
app.include_router(reminders.router)
app.include_router(demo.router)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "atrium",
        "version": "2.0.0",
        "database": "sqlite" if settings.database_url.startswith("sqlite") else "postgresql",
        "agents": {
            "agent_1": "Conflict Resolution Agent — Gemini 2.5 Flash function calling",
            "agent_2": "Demand Sensing Agent — runs every 15 min",
            "agent_3": "Booking Conversation Agent — multi-turn Gemini dialogue",
            "agent_4": "Inventory Optimisation Agent — runs every 30 min",
        },
    }
