from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

connect_args: dict = {}
engine_kwargs: dict = {"echo": False}

if "supabase" in settings.DATABASE_URL:
    connect_args["prepared_statement_cache_size"] = 0
    connect_args["ssl"] = "require"
    engine_kwargs["poolclass"] = NullPool

engine = create_async_engine(
    settings.DATABASE_URL, connect_args=connect_args, **engine_kwargs
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass
