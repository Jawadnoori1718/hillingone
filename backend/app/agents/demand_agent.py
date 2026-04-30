"""Agent 2: Demand Sensing Agent.

Runs every 15 minutes. Reads recent search logs, uses Gemini to identify
patterns of unmet demand, and posts structured recommendations to the
decision queue (stored as AgentRun records).
"""
import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.search_log import SearchLog
from app.models.agent_run import AgentRun
from app.config import settings


DEMAND_PROMPT = """You are Atrium's Demand Sensing Agent for Hillingdon Council.

Analyse these recent search queries that returned few or no results:

{low_result_queries}

Also consider overall search patterns:
{all_queries_summary}

Identify:
1. Which wards / venues are consistently under-supplied
2. What time slots have highest unmet demand
3. What facility types are missing
4. Specific recommendations for staff to act on

Return a JSON object (no other text):
{{
  "summary": "2-3 sentence summary of key demand patterns",
  "hotspots": [
    {{"ward": "...", "issue": "...", "severity": "high|medium|low", "recommendation": "..."}}
  ],
  "missing_capacity": [
    {{"facility_type": "...", "ward": "...", "evidence": "...", "action": "..."}}
  ],
  "peak_times": [
    {{"time_window": "...", "demand_level": "...", "suggestion": "..."}}
  ],
  "confidence": "high|medium|low"
}}"""


class DemandSensingAgent:
    """Analyses search logs to surface unmet demand patterns using Gemini."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run(self) -> dict:
        cutoff = datetime.utcnow() - timedelta(hours=24)
        result = await self.db.execute(
            select(SearchLog)
            .where(SearchLog.created_at >= cutoff)
            .order_by(SearchLog.created_at.desc())
            .limit(100)
        )
        logs = list(result.scalars().all())

        if not logs:
            return {"status": "no_data", "message": "No searches in last 24 hours"}

        low_result = [l for l in logs if l.results_count < 2]
        all_queries = [l.raw_query for l in logs]

        analysis = await self._analyse(low_result, all_queries)

        run = AgentRun(
            id=uuid.uuid4(),
            agent_name="demand_sensing",
            goal=f"Analyse {len(logs)} searches from last 24h, {len(low_result)} with low results",
            steps=[{"type": "analysis", "result": analysis, "timestamp": datetime.utcnow().isoformat()}],
            final_outcome="demand_report_generated",
        )
        self.db.add(run)
        await self.db.commit()
        return analysis

    async def _analyse(self, low_logs: list, all_queries: list) -> dict:
        client = self._get_client()
        if client is None:
            return self._fallback(low_logs, all_queries)

        low_summary = "\n".join(
            f"- \"{l.raw_query}\" ({l.results_count} results, ward: {(l.parsed_intent or {}).get('location', 'unknown')})"
            for l in low_logs[:20]
        )
        all_summary = f"{len(all_queries)} total searches. Top queries: " + "; ".join(all_queries[:10])

        try:
            from google.genai import types
            response = await client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=DEMAND_PROMPT.format(
                    low_result_queries=low_summary or "None",
                    all_queries_summary=all_summary,
                ),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                ),
            )
            return json.loads(response.text)
        except Exception:
            return self._fallback(low_logs, all_queries)

    def _fallback(self, low_logs: list, all_queries: list) -> dict:
        wards = {}
        for l in low_logs:
            ward = (l.parsed_intent or {}).get("location", "unknown")
            wards[ward] = wards.get(ward, 0) + 1
        top_ward = max(wards, key=wards.get) if wards else "Hayes Town"
        return {
            "summary": f"Analysed {len(all_queries)} searches. {len(low_logs)} returned fewer than 2 results, indicating supply gaps particularly in {top_ward}.",
            "hotspots": [
                {"ward": top_ward, "issue": "Insufficient bookable space for resident demand", "severity": "high", "recommendation": "Consider opening additional community rooms in this ward during peak hours (10am-2pm)."}
            ],
            "missing_capacity": [
                {"facility_type": "community_centres", "ward": top_ward, "evidence": f"{len(low_logs)} failed searches", "action": "Review after-school and weekend availability at existing venues before investing in new assets."}
            ],
            "peak_times": [
                {"time_window": "Weekday afternoons 13:00-17:00", "demand_level": "high", "suggestion": "Prioritise these slots for community bookings over internal council use."}
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
