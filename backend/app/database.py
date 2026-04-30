"""Async SQLAlchemy database setup.

Defaults to SQLite for zero-config demo. Set DATABASE_URL env var to
postgresql+asyncpg://... to use PostgreSQL in production.
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


_is_sqlite = settings.database_url.startswith("sqlite")

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    **({"connect_args": {"check_same_thread": False}} if _is_sqlite else {"pool_pre_ping": True}),
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
