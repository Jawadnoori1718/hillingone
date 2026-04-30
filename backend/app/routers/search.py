"""Search router: parse intent + rank matches.

Speed improvements:
  1. parse_intent runs concurrently with the initial asset DB fetch.
  2. Ward/capacity filters applied in Python after both results arrive.
  3. Availability check via single subquery instead of N+1 loop.
  4. Slim asset payload sent to rank_matches (fewer tokens → faster Gemini).
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.asset import Asset
from app.models.booking import Booking
from app.models.search_log import SearchLog
from app.schemas.search import SearchRequest
from app.services.gemini_client import parse_intent, rank_matches, _get_client
from app.config import settings

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("")
async def search(req: SearchRequest, db: AsyncSession = Depends(get_db)):
    # ── Parallelise: start Gemini parse_intent while fetching all active assets ─
    parse_task = asyncio.create_task(parse_intent(req.query))

    stmt = select(Asset).where(Asset.is_active == True)  # noqa: E712
    asset_result = await db.execute(stmt)
    all_assets = list(asset_result.scalars().all())

    intent = await parse_task  # wait for Gemini now that DB fetch is done

    # ── Apply intent filters in Python (no extra DB round-trip) ──────────────
    candidates = all_assets

    if intent.get("capacity"):
        candidates = [a for a in candidates if a.capacity >= intent["capacity"]]

    loc = (intent.get("location") or "").strip().lower()
    if loc and loc not in ("anywhere", "any", ""):
        candidates = [
            a for a in candidates
            if loc in a.ward.lower() or a.ward.lower() in loc
        ]

    # ── Resolve search time window ─────────────────────────────────────────────
    base = datetime.utcnow() + timedelta(days=2)
    tod = intent.get("time_of_day", "afternoon")
    hour_map = {"morning": 10, "afternoon": 14, "evening": 18}
    base = base.replace(hour=hour_map.get(tod, 14), minute=0, second=0, microsecond=0)
    duration = intent.get("duration_hours") or 2
    end = base + timedelta(hours=duration)

    # ── Availability: single subquery instead of N+1 loop ─────────────────────
    booked_stmt = (
        select(Booking.asset_id)
        .where(
            Booking.state.in_(["confirmed", "held", "swap_pending"]),
            Booking.start_time < end,
            Booking.end_time > base,
        )
        .distinct()
    )
    booked_ids = set((await db.execute(booked_stmt)).scalars().all())
    available = [a for a in candidates if a.id not in booked_ids]

    # ── Rank via Gemini — slim payload, cap at 8 assets ───────────────────────
    slim = [
        {
            "id": str(a.id),
            "name": a.name,
            "ward": a.ward,
            "category": a.category,
            "capacity": a.capacity,
            "description": (a.description or "")[:120],
            "accessibility": a.accessibility or {},
            "amenities": {"kitchen": (a.amenities or {}).get("kitchen", False)},
        }
        for a in available[:8]
    ]
    matches = await rank_matches(intent, slim)

    # Attach full asset data to matches
    full_by_id = {str(a.id): a.to_dict() for a in available}
    for m in matches:
        m["asset"] = full_by_id.get(m.get("asset_id"), {})

    # ── Log ───────────────────────────────────────────────────────────────────
    sl = SearchLog(
        id=uuid.uuid4(),
        user_id=req.user_id if req.user_id else None,
        raw_query=req.query,
        parsed_intent=intent,
        results_count=len(matches),
    )
    db.add(sl)
    await db.commit()

    return {
        "intent": intent,
        "matches": matches,
        "total_inventory_searched": len(candidates),
        "search_log_id": str(sl.id),
        "search_window": {"start": base.isoformat(), "end": end.isoformat()},
    }


IMAGE_PROMPT = """You are helping a resident of Hillingdon Council book a community space.
They have uploaded an image. Look at the image carefully and extract any booking-related information:
- What type of space or facility they might need
- How many people (if visible)
- Any specific requirements (accessibility, equipment, etc.)
- Any text visible in the image (notices, flyers, letters, screenshots of booking requests)

Return a natural language search query (in British English) that this person could use to find
the right council space. Be concise and specific — one or two sentences maximum.
If the image contains text (e.g. a letter or flyer), extract the relevant booking details from it.
If you cannot determine a useful booking query from the image, return:
UNCLEAR: <brief explanation>"""


@router.post("/image")
async def search_by_image(file: UploadFile = File(...)):
    """Accept an uploaded image and use Gemini Vision to extract a booking query from it."""
    # Validate file type
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are accepted.")

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 10 MB).")

    client = _get_client()
    if client is None:
        return {
            "query": None,
            "message": "Image understanding requires a Gemini API key. Please type your booking request instead.",
        }

    try:
        from google.genai import types
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=content_type),
                IMAGE_PROMPT,
            ],
            config=types.GenerateContentConfig(temperature=0.3),
        )
        text = (response.text or "").strip()
        if text.startswith("UNCLEAR:"):
            return {"query": None, "message": text[8:].strip()}
        return {"query": text, "message": None}
    except Exception as exc:
        err_str = str(exc)
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
            return {
                "query": None,
                "message": "The AI is busy right now — please wait a moment and try again, or just type your request.",
            }
        return {
            "query": None,
            "message": "Could not read the image. Please type your booking request instead.",
        }
