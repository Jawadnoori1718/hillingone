"""Async SQLAlchemy database setup.

Defaults to SQLite for zero-config demo. Set DATABASE_URL env var to
postgresql+asyncpg://... to use PostgreSQL in production.
"""
import ssl
import re
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


_is_sqlite = settings.database_url.startswith("sqlite")


def _prepare_pg_url(url: str):
    """Strip SSL/channel_binding params from URL and return (clean_url, needs_ssl)."""
    needs_ssl = any(p in url for p in ("sslmode=", "ssl=", "neon.tech", "supabase"))
    url = re.sub(r"[?&]sslmode=[^&]*", "", url)
    url = re.sub(r"[?&]ssl=[^&]*", "", url)
    url = re.sub(r"[?&]channel_binding=[^&]*", "", url)
    url = re.sub(r"\?&", "?", url)   # fix ?& → ?
    url = re.sub(r"[?&]$", "", url)  # strip trailing ? or &
    return url, needs_ssl


if _is_sqlite:
    _db_url = settings.database_url
    _connect_args = {"check_same_thread": False}
    _extra = {}
else:
    _db_url, _needs_ssl = _prepare_pg_url(settings.database_url)
    _connect_args = {"ssl": ssl.create_default_context()} if _needs_ssl else {}
    _extra = {"pool_pre_ping": True}

engine = create_async_engine(
    _db_url,
    echo=False,
    future=True,
    connect_args=_connect_args,
    **_extra,
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
