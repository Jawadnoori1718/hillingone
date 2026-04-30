"""Priority scoring and booking-window enforcement.

Two mechanisms:
  A) Tiered booking windows — how far ahead each tier can book.
  B) Weighted priority score — used by the conflict-resolution agent to decide
     whose booking is least disruptive to move.
"""
from datetime import datetime

# Days ahead each tier can book. Staff/councillor are unrestricted.
BOOKING_WINDOW_DAYS: dict[str, int] = {
    "staff":       365,
    "councillor":  365,
    "elderly":     21,   # 3 weeks — early access for older residents
    "disabled":    21,
    "community":   14,   # 2 weeks for recognised community groups
    "resident":     7,   # 1 week for general public
}

# Base scores for conflict resolution: higher = harder to displace
ROLE_BASE_SCORES: dict[str, int] = {
    "staff":      100,
    "councillor":  90,
    "resident":    50,
}

# Purpose keywords that bump priority
_HEALTH_KEYWORDS   = {"health", "welfare", "medical", "carer", "disabled", "nhs", "therapy"}
_EDUCATION_KEYWORDS = {"education", "youth", "children", "school", "learning", "training"}


def get_booking_window_days(user) -> int:
    """Return how many days ahead this user is allowed to book."""
    tier = getattr(user, "priority_tier", "resident") or "resident"
    return BOOKING_WINDOW_DAYS.get(tier, BOOKING_WINDOW_DAYS["resident"])


def compute_priority_score(
    user,
    purpose: str | None,
    start_time: datetime,
    recent_confirmed_count: int,
) -> int:
    """Compute 0-100 priority score for a booking.

    Higher score = this booking is more important / harder to ask to move.
    Used by the conflict-resolution agent to decide whose booking to touch.

    Factors:
      + Role base score
      + Accessibility bonus      (+20 if user has registered accessibility needs)
      + Priority tier bonus      (+15 for elderly/disabled tier)
      + Purpose bonus            (+15 health/welfare, +10 education/youth)
      + Lead-time bonus          (+5 if booked 7+ days ahead — planned use)
      - Frequency penalty        (-5 per booking in last 30 days, max -25)
    """
    score: int = ROLE_BASE_SCORES.get(getattr(user, "role", "resident"), 50)

    if getattr(user, "accessibility_needs", False):
        score += 20

    tier = getattr(user, "priority_tier", "resident") or "resident"
    if tier in ("elderly", "disabled"):
        score += 15

    purpose_words = set((purpose or "").lower().split())
    if purpose_words & _HEALTH_KEYWORDS:
        score += 15
    elif purpose_words & _EDUCATION_KEYWORDS:
        score += 10

    days_ahead = (start_time - datetime.utcnow()).days
    if days_ahead >= 7:
        score += 5

    penalty = min(recent_confirmed_count * 5, 25)
    score -= penalty

    return max(0, min(100, score))
