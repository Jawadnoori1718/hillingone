"""Agent 4: Inventory Optimisation Agent.

Runs every 30 minutes. Analyses utilisation patterns over the last 30 days,
identifies chronically underused and oversubscribed assets, and uses Gemini
to generate strategic capacity recommendations posted as AgentRun records.
"""
import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.asset import Asset
from app.models.booking import Booking
from app.models.agent_run import AgentRun
from app.config import settings


INVENTORY_PROMPT = """You are Atrium's Inventory Optimisation Agent for Hillingdon Council.

Analyse these asset utilisation patterns over the last 30 days:

UNDERUSED ASSETS (< 30% utilisation):
{underused}

OVERSUBSCRIBED ASSETS (> 80% utilisation):
{oversubscribed}

HEALTHY ASSETS (30-80% utilisation):
{healthy_summary}

Total assets monitored: {total_assets}
Analysis window: last 30 days

Provide strategic recommendations to optimise the council's asset portfolio.
Consider: opening underused slots to new user categories, demand-shifting incentives
for oversubscribed assets, potential repurposing, and pricing/access policy changes.

Return a JSON object (no other text):
{{
  "summary": "2-3 sentence executive summary of the portfolio health",
  "underused_actions": [
    {{"asset": "...", "ward": "...", "utilisation_pct": 0, "recommendation": "...", "impact": "high|medium|low"}}
  ],
  "oversubscribed_actions": [
    {{"asset": "...", "ward": "...", "utilisation_pct": 0, "recommendation": "...", "impact": "high|medium|low"}}
  ],
  "portfolio_health_score": 0,
  "priority_actions": ["...", "...", "..."],
  "confidence": "high|medium|low"
}}"""


class InventoryOptimisationAgent:
    """Watches utilisation trends and generates strategic capacity recommendations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self) -> dict:
        cutoff = datetime.utcnow() - timedelta(days=30)

        assets_result = await self.db.execute(
            select(Asset).where(Asset.is_active == True)  # noqa: E712
        )
        assets = list(assets_result.scalars().all())
        if not assets:
            return {"status": "no_data", "message": "No active assets found"}

        # Available hours per asset over 30 days (assume 12h/day)
        available_hours = 12 * 30

        asset_stats = []
        for asset in assets:
            count_result = await self.db.execute(
                select(func.count()).select_from(Booking).where(
                    Booking.asset_id == asset.id,
                    Booking.state.in_(["confirmed", "completed"]),
                    Booking.start_time >= cutoff,
                )
            )
            booking_count = count_result.scalar() or 0
            # Estimate hours booked: assume average 2h per booking
            hours_booked = booking_count * 2
            utilisation_pct = min(100, round((hours_booked / available_hours) * 100))
            asset_stats.append({
                "asset": asset,
                "booking_count": booking_count,
                "utilisation_pct": utilisation_pct,
            })

        underused = [s for s in asset_stats if s["utilisation_pct"] < 30]
        oversubscribed = [s for s in asset_stats if s["utilisation_pct"] > 80]
        healthy = [s for s in asset_stats if 30 <= s["utilisation_pct"] <= 80]

        analysis = await self._analyse(underused, oversubscribed, healthy, len(assets))

        run = AgentRun(
            id=uuid.uuid4(),
            agent_name="inventory_optimisation",
            goal=(
                f"Analyse {len(assets)} assets over 30 days: "
                f"{len(underused)} underused, {len(oversubscribed)} oversubscribed, "
                f"{len(healthy)} healthy"
            ),
            steps=[{
                "type": "analysis",
                "result": analysis,
                "timestamp": datetime.utcnow().isoformat(),
                "stats": {
                    "total": len(assets),
                    "underused": len(underused),
                    "oversubscribed": len(oversubscribed),
                    "healthy": len(healthy),
                },
            }],
            final_outcome="inventory_report_generated",
        )
        self.db.add(run)
        await self.db.commit()
        return analysis

    async def _analyse(
        self,
        underused: list,
        oversubscribed: list,
        healthy: list,
        total_assets: int,
    ) -> dict:
        client = self._get_client()
        if client is None:
            return self._fallback(underused, oversubscribed, healthy, total_assets)

        def fmt(stats_list: list) -> str:
            if not stats_list:
                return "None"
            return "\n".join(
                f"- {s['asset'].name} ({s['asset'].ward}): "
                f"{s['utilisation_pct']}% utilised, {s['booking_count']} bookings"
                for s in stats_list[:10]
            )

        healthy_summary = f"{len(healthy)} assets operating at healthy utilisation (30-80%)"
        if healthy:
            healthy_summary += f": {', '.join(s['asset'].name for s in healthy[:5])}"
            if len(healthy) > 5:
                healthy_summary += f" and {len(healthy) - 5} more"

        try:
            from google.genai import types
            response = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=INVENTORY_PROMPT.format(
                    underused=fmt(underused),
                    oversubscribed=fmt(oversubscribed),
                    healthy_summary=healthy_summary,
                    total_assets=total_assets,
                ),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                ),
            )
            return json.loads(response.text)
        except Exception:
            return self._fallback(underused, oversubscribed, healthy, total_assets)

    def _fallback(
        self,
        underused: list,
        oversubscribed: list,
        healthy: list,
        total_assets: int,
    ) -> dict:
        health_score = int(
            (len(healthy) / total_assets * 100) if total_assets else 50
        )
        underused_actions = []
        for s in underused[:3]:
            a = s["asset"]
            underused_actions.append({
                "asset": a.name,
                "ward": a.ward,
                "utilisation_pct": s["utilisation_pct"],
                "recommendation": (
                    f"Open {a.name} to community groups and voluntary organisations "
                    f"during off-peak hours. Consider a subsidised-rate pilot for "
                    f"after-school activities to stimulate demand."
                ),
                "impact": "medium",
            })

        oversubscribed_actions = []
        for s in oversubscribed[:3]:
            a = s["asset"]
            oversubscribed_actions.append({
                "asset": a.name,
                "ward": a.ward,
                "utilisation_pct": s["utilisation_pct"],
                "recommendation": (
                    f"{a.name} is near capacity. Introduce a waitlist system and "
                    f"offer flexibility credits to residents who shift their bookings "
                    f"to off-peak slots. Explore whether a neighbouring facility can "
                    f"absorb overflow demand."
                ),
                "impact": "high",
            })

        top_underused_name = underused[0]["asset"].name if underused else "several assets"
        top_over_name = oversubscribed[0]["asset"].name if oversubscribed else "key venues"

        return {
            "summary": (
                f"Portfolio health score: {health_score}/100. "
                f"{len(underused)} of {total_assets} assets are underutilised (<30%), "
                f"representing idle public resource. "
                f"{len(oversubscribed)} assets are oversubscribed (>80%), indicating "
                f"unmet demand that could be redistributed."
            ),
            "underused_actions": underused_actions,
            "oversubscribed_actions": oversubscribed_actions,
            "portfolio_health_score": health_score,
            "priority_actions": [
                f"Run a demand-activation campaign for {top_underused_name} targeting community groups",
                f"Introduce demand-shift incentives at {top_over_name} to reduce peak pressure",
                f"Review pricing policy for underused assets — consider subsidised community rates",
            ],
            "confidence": "medium",
        }

    def _get_client(self):
        if not settings.gemini_api_key or settings.gemini_api_key.startswith("paste_"):
            return None
        try:
            from google import genai
            return genai.Client(api_key=settings.gemini_api_key)
        except ImportError:
            return None
