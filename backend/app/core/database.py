from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Determine database engine arguments
connect_args = {}
# SQLite database checks same thread by default, need to disable this for FastAPI multi-thread
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif settings.DATABASE_URL.startswith("postgres://") or settings.DATABASE_URL.startswith("postgresql://"):
    # Ensure pg8000 is used for PostgreSQL connection
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
    if not settings.DATABASE_URL.startswith("postgresql+pg8000://"):
        settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
