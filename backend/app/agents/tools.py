"""Tools available to the autonomous Conflict Resolution Agent.

Each tool has two parts: a FunctionDeclaration that describes it to Gemini,
and a real implementation in AgentTools that performs the action.

When Gemini decides which tool to call, our agent loop dispatches to the
matching method on AgentTools. This is genuine function-calling agentic AI.
"""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.asset import Asset
from app.models.booking import Booking


def build_gemini_tools():
    """Build Gemini Tool objects for function calling.

    Uses google.genai.types.Schema with uppercase string types
    as required by google-genai 0.3.x (types.Type is a Literal, not an enum).
    """
    from google.genai import types

    S = types.Schema

    return [types.Tool(function_declarations=[
        types.FunctionDeclaration(
            name="search_inventory",
            description=(
                "Search Hillingdon Council's bookable asset inventory for venues "
                "matching given criteria. Returns up to ten matching assets."
            ),
            parameters=S(
                type="OBJECT",
                properties={
                    "ward": S(type="STRING", description="Hillingdon ward name, or 'any' for borough-wide."),
                    "min_capacity": S(type="INTEGER", description="Minimum capacity required."),
                    "category": S(type="STRING", description="Asset category or 'any'."),
                    "wheelchair_required": S(type="BOOLEAN"),
                    "kitchen_required": S(type="BOOLEAN"),
                },
                required=["min_capacity"],
            ),
        ),
        types.FunctionDeclaration(
            name="check_availability",
            description="Check whether a specific asset is available during a given time window.",
            parameters=S(
                type="OBJECT",
                properties={
                    "asset_id": S(type="STRING"),
                    "start_time_iso": S(type="STRING", description="ISO 8601 datetime e.g. 2026-05-12T14:00:00"),
                    "end_time_iso": S(type="STRING", description="ISO 8601 datetime"),
                },
                required=["asset_id", "start_time_iso", "end_time_iso"],
            ),
        ),
        types.FunctionDeclaration(
            name="score_alternative",
            description="Score how well an alternative asset matches the original booking (0-100).",
            parameters=S(
                type="OBJECT",
                properties={
                    "alternative_asset_id": S(type="STRING"),
                    "original_booking_id": S(type="STRING"),
                },
                required=["alternative_asset_id", "original_booking_id"],
            ),
        ),
        types.FunctionDeclaration(
            name="send_swap_request",
            description="Send a polite swap request to the resident. Resident retains full right to decline.",
            parameters=S(
                type="OBJECT",
                properties={
                    "booking_id": S(type="STRING"),
                    "alternative_asset_id": S(type="STRING"),
                    "swap_message": S(type="STRING", description="Warm, polite British English message. Max 70 words."),
                    "flexibility_credit_percent": S(type="INTEGER"),
                },
                required=["booking_id", "alternative_asset_id", "swap_message", "flexibility_credit_percent"],
            ),
        ),
        types.FunctionDeclaration(
            name="escalate_to_staff",
            description="Escalate to a human staff officer when no good alternative exists.",
            parameters=S(
                type="OBJECT",
                properties={
                    "booking_id": S(type="STRING"),
                    "reason": S(type="STRING"),
                    "recommendation": S(type="STRING"),
                },
                required=["booking_id", "reason", "recommendation"],
            ),
        ),
        types.FunctionDeclaration(
            name="log_decision",
            description="Log the agent's final decision for the immutable audit trail. Always call last.",
            parameters=S(
                type="OBJECT",
                properties={
                    "booking_id": S(type="STRING"),
                    "decision": S(type="STRING", description="One of: swap_proposed, escalated, no_alternative, completed."),
                    "reasoning": S(type="STRING"),
                },
                required=["booking_id", "decision", "reasoning"],
            ),
        ),
    ])]


# Category mapping (Gemini might pass either form)
CATEGORY_ALIASES = {
    "community_centre": "community_centres",
    "community_centres": "community_centres",
    "library_space": "library_spaces",
    "library_spaces": "library_spaces",
    "childrens_centre": "childrens_centres",
    "childrens_centres": "childrens_centres",
    "sports_leisure": "sports_leisure",
    "council_building": "council_buildings",
    "council_buildings": "council_buildings",
    "outdoor_space": "outdoor_spaces",
    "outdoor_spaces": "outdoor_spaces",
    "equipment": "equipment",
}


class AgentTools:
    """Real implementations of the tools the agent can call.

    Every method here is invoked when Gemini decides to call the corresponding
    function. The agent loop dispatches based on tool name.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def search_inventory(
        self,
        min_capacity: int = 1,
        ward: str = "any",
        category: str = "any",
        wheelchair_required: bool = False,
        kitchen_required: bool = False,
    ) -> dict:
        normalised_category = CATEGORY_ALIASES.get(category.lower() if category else "any", "any")

        stmt = select(Asset).where(
            Asset.is_active == True,  # noqa: E712
            Asset.capacity >= min_capacity,
        )
        if ward and ward.lower() != "any":
            stmt = stmt.where(Asset.ward.ilike(f"%{ward}%"))
        if normalised_category != "any":
            stmt = stmt.where(Asset.category == normalised_category)

        result = await self.db.execute(stmt)
        assets = result.scalars().all()

        out = []
        for a in assets:
            access = a.accessibility or {}
            amen = a.amenities or {}
            if wheelchair_required and not access.get("wheelchair_access"):
                continue
            if kitchen_required and not amen.get("kitchen"):
                continue
            out.append({
                "id": str(a.id),
                "name": a.name,
                "ward": a.ward,
                "capacity": a.capacity,
                "category": a.category,
                "wheelchair_access": access.get("wheelchair_access", False),
                "kitchen": amen.get("kitchen", False),
            })
        return {"matches_found": len(out), "assets": out[:10]}

    async def check_availability(
        self,
        asset_id: str,
        start_time_iso: str,
        end_time_iso: str,
    ) -> dict:
        try:
            start = datetime.fromisoformat(start_time_iso.replace("Z", "+00:00")).replace(tzinfo=None)
            end = datetime.fromisoformat(end_time_iso.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError as exc:
            return {"available": False, "error": f"Invalid datetime: {exc}"}

        stmt = select(Booking).where(
            and_(
                Booking.asset_id == asset_id,
                Booking.state.in_(["confirmed", "held"]),
                Booking.start_time < end,
                Booking.end_time > start,
            )
        )
        result = await self.db.execute(stmt)
        conflicts = result.scalars().all()
        return {
            "available": len(conflicts) == 0,
            "conflict_count": len(conflicts),
            "asset_id": asset_id,
        }

    async def score_alternative(
        self,
        alternative_asset_id: str,
        original_booking_id: str,
    ) -> dict:
        alt = await self.db.get(Asset, alternative_asset_id)
        original_booking = await self.db.get(Booking, original_booking_id)
        if not alt or not original_booking:
            return {"score": 0, "reasoning": "Asset or booking not found"}

        original_asset = await self.db.get(Asset, original_booking.asset_id)

        score = 100
        reasons = []

        attendees = original_booking.attendee_count or 0
        if alt.capacity < attendees:
            score -= 30
            reasons.append(f"smaller capacity ({alt.capacity} vs {attendees})")
        elif alt.capacity > attendees * 3 and attendees > 0:
            score -= 5
            reasons.append("oversized for the group")

        if original_asset and alt.ward != original_asset.ward:
            score -= 15
            reasons.append(f"different ward ({alt.ward} vs {original_asset.ward})")

        original_amenities = (original_asset.amenities or {}) if original_asset else {}
        alt_amenities = alt.amenities or {}
        if original_amenities.get("kitchen") and not alt_amenities.get("kitchen"):
            score -= 20
            reasons.append("no kitchen")

        original_access = (original_asset.accessibility or {}) if original_asset else {}
        alt_access = alt.accessibility or {}
        if original_access.get("wheelchair_access") and not alt_access.get("wheelchair_access"):
            score -= 30
            reasons.append("less accessible")

        return {
            "score": max(0, score),
            "asset_name": alt.name,
            "ward": alt.ward,
            "capacity": alt.capacity,
            "reasoning": ", ".join(reasons) if reasons else "matches all key criteria",
        }

    async def send_swap_request(
        self,
        booking_id: str,
        alternative_asset_id: str,
        swap_message: str,
        flexibility_credit_percent: int,
    ) -> dict:
        booking = await self.db.get(Booking, booking_id)
        if not booking:
            return {"success": False, "error": "Booking not found"}
        booking.state = "swap_pending"
        booking.alternative_offered_id = alternative_asset_id
        booking.swap_message = swap_message
        booking.goodwill_credit_applied = flexibility_credit_percent
        await self.db.commit()
        return {
            "success": True,
            "booking_id": booking_id,
            "status": "swap_request_sent",
            "message_preview": swap_message[:80],
        }

    async def escalate_to_staff(
        self,
        booking_id: str,
        reason: str,
        recommendation: str,
    ) -> dict:
        from app.models.audit_log import AuditLog
        import uuid as _uuid
        log = AuditLog(
            id=_uuid.uuid4(),
            booking_id=booking_id if booking_id else None,
            action="agent_escalated_to_staff",
            reason=reason,
            ai_reasoning=recommendation,
        )
        self.db.add(log)
        await self.db.commit()
        return {
            "success": True,
            "escalated": True,
            "queued_for_staff_review": True,
        }

    async def log_decision(
        self,
        booking_id: str,
        decision: str,
        reasoning: str,
    ) -> dict:
        from app.models.audit_log import AuditLog
        import uuid as _uuid
        log = AuditLog(
            id=_uuid.uuid4(),
            booking_id=booking_id if booking_id else None,
            action=f"agent_decision_{decision}",
            ai_reasoning=reasoning,
        )
        self.db.add(log)
        await self.db.commit()
        return {"success": True, "logged": True, "decision": decision}
