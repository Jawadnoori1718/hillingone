"""Agent router: trigger autonomous Conflict Resolution Agent."""
import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.schemas.search import AgentTriggerRequest
from app.agents.conflict_agent import ConflictResolutionAgent
from app.models.agent_run import AgentRun

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/conflict-resolution")
async def trigger_agent(req: AgentTriggerRequest, db: AsyncSession = Depends(get_db)):
    """Run the agent and return the complete result (non-streaming)."""
    agent = ConflictResolutionAgent(db)
    result = await agent.resolve(
        confirmed_booking_id=req.confirmed_booking_id,
        priority_request_summary=req.priority_request_summary,
    )
    return result


@router.post("/conflict-resolution/stream")
async def trigger_agent_stream(req: AgentTriggerRequest, db: AsyncSession = Depends(get_db)):
    """Run the agent and stream each step as a Server-Sent Event.

    Each event is a JSON object:
      - Normal step:   {type, step, tool, args|result, timestamp}
      - Completion:    {type: "complete", final_decision, steps, goal_summary, ...}
      - Error:         {type: "error", message}
    """
    queue: asyncio.Queue = asyncio.Queue()

    async def on_step(step: dict) -> None:
        await queue.put(step)

    async def run_agent() -> None:
        try:
            agent = ConflictResolutionAgent(db, step_callback=on_step)
            result = await agent.resolve(
                confirmed_booking_id=req.confirmed_booking_id,
                priority_request_summary=req.priority_request_summary,
            )
            await queue.put({"type": "complete", **result})
        except Exception as exc:
            await queue.put({"type": "error", "message": str(exc)})
        finally:
            await queue.put(None)  # sentinel — closes the stream

    async def event_stream():
        task = asyncio.create_task(run_agent())
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=120.0)
                except asyncio.TimeoutError:
                    yield "data: " + json.dumps({"type": "error", "message": "Agent timed out"}) + "\n\n"
                    break
                if item is None:
                    break
                yield "data: " + json.dumps(item) + "\n\n"
        finally:
            task.cancel()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )


@router.get("/runs/recent")
async def recent_runs(limit: int = 20, db: AsyncSession = Depends(get_db)):
    stmt = select(AgentRun).order_by(desc(AgentRun.created_at)).limit(limit)
    result = await db.execute(stmt)
    return [r.to_dict() for r in result.scalars().all()]


@router.get("/runs/{run_id}")
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)):
    run = await db.get(AgentRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return run.to_dict()
