"""Auth endpoints: login, register, and demo sign-in."""
import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{hashed}"


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, hashed = password_hash.split(":", 1)
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == hashed
    except Exception:
        return False


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "resident"
    ward: str | None = None


class DemoRequest(BaseModel):
    role: str  # "resident" or "staff"


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="No account found with that email address.")
    if not user.password_hash:
        raise HTTPException(status_code=401, detail="This is a demo account. Use the 'Try Demo' button instead.")
    if not _verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    return user.to_dict()


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    if req.role not in ("resident", "staff", "councillor"):
        raise HTTPException(status_code=400, detail="Role must be resident or staff.")
    import uuid
    user = User(
        id=uuid.uuid4(),
        email=req.email,
        name=req.name,
        role=req.role,
        ward=req.ward,
        flexibility_credits=0,
        priority_tier=req.role if req.role in ("staff", "councillor") else "resident",
        accessibility_needs=False,
        password_hash=_hash_password(req.password),
        is_demo=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user.to_dict()


@router.post("/demo")
async def demo_login(req: DemoRequest, db: AsyncSession = Depends(get_db)):
    role_filter = "staff" if req.role == "staff" else "resident"
    result = await db.execute(
        select(User).where(User.is_demo == True, User.role == role_filter)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No demo {role_filter} account found.")
    return user.to_dict()
