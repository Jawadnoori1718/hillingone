"""Seed data: real Hillingdon assets, demo users, realistic bookings."""
import asyncio
import uuid
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.user import User
from app.models.asset import Asset
from app.models.booking import Booking


CATEGORY_IMAGES = {
    "community_centres":  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&auto=format",
    "library_spaces":     "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop&auto=format",
    "childrens_centres":  "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=400&h=300&fit=crop&auto=format",
    "sports_leisure":     "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop&auto=format",
    "council_buildings":  "https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=400&h=300&fit=crop&auto=format",
    "outdoor_spaces":     "https://images.unsplash.com/photo-1560716460-cb7a51ead15d?w=400&h=300&fit=crop&auto=format",
    "equipment":          "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop&auto=format",
}

ASSETS_DATA = [
    ("Botwell Green Community Centre", "community_centres", "Botwell", 80, True, True, 51.5083, -0.4189),
    ("Hayes End Community Centre", "community_centres", "Hayes Town", 60, True, True, 51.5147, -0.4275),
    ("Yiewsley Community Centre", "community_centres", "Yiewsley", 50, True, True, 51.5119, -0.4708),
    ("Northwood Community Centre", "community_centres", "Northwood", 70, True, False, 51.6116, -0.4242),
    ("Uxbridge Library Meeting Room", "library_spaces", "Uxbridge", 20, True, False, 51.5429, -0.4781),
    ("Manor Farm Library Study Pod", "library_spaces", "Manor", 8, True, False, 51.5721, -0.4189),
    ("Northwood Library Hall", "library_spaces", "Northwood", 35, True, False, 51.6113, -0.4233),
    ("Ruislip Manor Library Group Room", "library_spaces", "Ruislip", 15, True, False, 51.5746, -0.4150),
    ("Hayes Children's Centre Activity Room A", "childrens_centres", "Hayes Town", 25, True, True, 51.5142, -0.4263),
    ("Hayes Children's Centre Activity Room B", "childrens_centres", "Hayes Town", 25, True, True, 51.5142, -0.4263),
    ("Yiewsley Children's Centre Family Room", "childrens_centres", "Yiewsley", 20, True, True, 51.5125, -0.4710),
    ("Northwood Children's Centre Sensory Room", "childrens_centres", "Northwood", 12, True, False, 51.6118, -0.4240),
    ("Botwell Green Sports Centre Hall", "sports_leisure", "Botwell", 120, True, False, 51.5085, -0.4193),
    ("Highgrove Pool Function Room", "sports_leisure", "Ruislip", 60, True, True, 51.5752, -0.4145),
    ("Hillingdon Sports Complex Meeting Room", "sports_leisure", "Hillingdon East", 30, True, False, 51.5448, -0.4485),
    ("Civic Centre Committee Room A", "council_buildings", "Uxbridge", 30, True, False, 51.5466, -0.4790),
    ("Civic Centre Committee Room B", "council_buildings", "Uxbridge", 25, True, False, 51.5466, -0.4790),
    ("Civic Centre Public Meeting Hall", "council_buildings", "Uxbridge", 200, True, True, 51.5466, -0.4790),
    ("Yiewsley Recreation Ground Pavilion", "outdoor_spaces", "Yiewsley", 40, False, False, 51.5132, -0.4720),
    ("Hillingdon Court Park Pavilion", "outdoor_spaces", "Hillingdon East", 50, True, False, 51.5398, -0.4388),
    ("Manor Farm Outdoor Terrace", "outdoor_spaces", "Manor", 60, True, False, 51.5725, -0.4187),
    ("Audio Visual Loan Kit", "equipment", "Uxbridge", 1, True, False, 51.5466, -0.4790),
    ("Portable PA System", "equipment", "Uxbridge", 1, True, False, 51.5466, -0.4790),
    ("Marquee for Community Events", "equipment", "Uxbridge", 1, True, False, 51.5466, -0.4790),
    ("Projector and Screen Bundle", "equipment", "Uxbridge", 1, True, False, 51.5466, -0.4790),
]

DEMO_USERS = [
    ("demo.resident@hillingdon.gov.uk", "Jawad Noori",  "resident", "Hayes Town", "resident", False, True),
    ("demo.staff@hillingdon.gov.uk",    "Danny Beales", "staff",    None,         "staff",    False, True),
]


def _amenities(has_kitchen: bool) -> dict:
    return {"kitchen": has_kitchen, "wifi": True, "projector": True, "whiteboard": True}


def _accessibility(wheelchair: bool) -> dict:
    return {"wheelchair_access": wheelchair, "hearing_loop": wheelchair, "accessible_toilet": wheelchair}


def _ref() -> str:
    return f"ATR-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"


async def seed(db: AsyncSession) -> None:
    """Populate the database with demo data. Skips if already seeded."""
    existing = (await db.execute(select(Asset))).scalars().first()
    if existing:
        print("[seed] Already seeded, skipping.")
        return

    users = []
    for email, name, role, ward, priority_tier, accessibility_needs, is_demo in DEMO_USERS:
        u = User(
            id=uuid.uuid4(),
            email=email, name=name, role=role, ward=ward,
            flexibility_credits=0,
            priority_tier=priority_tier,
            accessibility_needs=accessibility_needs,
            is_demo=is_demo,
        )
        db.add(u)
        users.append(u)

    assets = []
    for name, category, ward, capacity, wheelchair, kitchen, lat, lng in ASSETS_DATA:
        a = Asset(
            id=uuid.uuid4(),
            name=name, category=category, ward=ward, capacity=capacity,
            description=f"{name} — a well-equipped {category.replace('_', ' ')} in {ward}, Hillingdon. Capacity {capacity} people.",
            accessibility=_accessibility(wheelchair),
            amenities=_amenities(kitchen),
            hourly_rate=0,
            latitude=lat, longitude=lng,
            image_url=CATEGORY_IMAGES.get(category, CATEGORY_IMAGES["community_centres"]),
            co2_per_visit=round(0.3 + random.random() * 0.7, 2),
            is_active=True,
        )
        db.add(a)
        assets.append(a)

    await db.commit()
    for u in users: await db.refresh(u)
    for a in assets: await db.refresh(a)

    residents = [u for u in users if u.role == "resident"]
    all_actors = users

    now = datetime.utcnow()
    purpose_pool = [
        "Community after-school club", "Weekly book group", "Local councillor surgery",
        "Sports training session", "Mother and baby group", "Community choir rehearsal",
        "Local business networking", "Adult learning course", "Charity fundraising meeting",
        "Resident association meeting",
    ]

    # Create a small, realistic set of bookings for the demo resident (Jawad Noori)
    resident = residents[0] if residents else all_actors[0]
    DEMO_BOOKINGS = [
        # (asset_index, day_offset, hour, duration_h, purpose, state)
        (0,  2,  9, 2, "Resident association meeting",    "confirmed"),
        (4,  3, 10, 2, "Weekly book group",               "confirmed"),
        (8,  5, 14, 2, "Mother and baby group",           "confirmed"),
        (12, 1, 11, 3, "Sports training session",         "confirmed"),
        (16, 7, 10, 2, "Local councillor surgery",        "confirmed"),
        (3,  0, 12, 1, "Community choir rehearsal",       "completed"),
    ]
    bookings_created = 0
    for asset_i, day_off, hour, dur, purpose, state in DEMO_BOOKINGS:
        asset = assets[asset_i % len(assets)]
        start = (now + timedelta(days=day_off)).replace(hour=hour, minute=0, second=0, microsecond=0)
        end = start + timedelta(hours=dur)
        b = Booking(
            id=uuid.uuid4(),
            asset_id=asset.id, user_id=resident.id,
            state=state,
            start_time=start, end_time=end,
            purpose=purpose,
            attendee_count=random.randint(5, 25),
            confirmed_at=now if state in ("confirmed", "completed") else None,
            reference=_ref(),
        )
        db.add(b)
        bookings_created += 1

    await db.commit()
    print(f"[seed] Created {len(users)} demo users, {len(assets)} assets, {bookings_created} bookings.")


if __name__ == "__main__":
    from app.database import AsyncSessionLocal

    async def _run():
        async with AsyncSessionLocal() as db:
            await seed(db)

    asyncio.run(_run())
