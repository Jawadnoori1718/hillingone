"""Async SQLAlchemy database setup.

Defaults to SQLite for zero-config demo. Set DATABASE_URL env var to
postgresql+asyncpg://... to use PostgreSQL in production.
"""
import ssl
from urllib.parse import urlparse, urlencode, parse_qs, urlunparse
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


_is_sqlite = settings.database_url.startswith("sqlite")

if _is_sqlite:
    _db_url = settings.database_url
    _connect_args = {"check_same_thread": False}
    _extra = {}
else:
    # asyncpg doesn't accept sslmode/channel_binding as URL params — strip them
    # and pass SSL via connect_args instead so Neon and other managed PG providers work.
    parsed = urlparse(settings.database_url)
    qs = parse_qs(parsed.query)
    needs_ssl = "sslmode" in qs or "ssl" in qs
    qs_clean = {k: v for k, v in qs.items() if k not in ("sslmode", "ssl", "channel_binding")}
    _db_url = urlunparse(parsed._replace(query=urlencode(qs_clean, doseq=True)))
    _connect_args = {"ssl": ssl.create_default_context()} if needs_ssl else {}
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
