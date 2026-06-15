import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vedha International School Management System"
    ENVIRONMENT: str = Field("development", validation_alias="ENVIRONMENT")
    PORT: int = Field(8000, validation_alias="PORT")
    
    # DB URL - Fallback to local SQLite if DATABASE_URL is not set
    DATABASE_URL: str = Field(
        "sqlite:///./school.db",
        validation_alias="DATABASE_URL"
    )
    
    # JWT Auth Configuration
    JWT_SECRET: str = Field("supersecretchangeinproduction", validation_alias="JWT_SECRET")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(1440, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES") # 24 hours
    
    # AI Config
    GEMINI_API_KEY: str = Field("", validation_alias="GEMINI_API_KEY")
    
    # Academic Details
    SUBJECTS: list[str] = ["Telugu", "Hindi", "English", "Maths", "Science", "Social"]
    EXAMS: list[str] = ["FA-1", "FA-2", "SA-1", "FA-3", "FA-4", "SA-2"]

    # Class Configuration Groupings (Configurable mapping for Hall Tickets and classes list)
    # If "has_subjects" is True, we list the subjects on the hall ticket.
    CLASSES_MAP: dict[str, dict[str, bool | str]] = {
        "Nursery": {"has_subjects": False, "group": "Nursery/KG"},
        "LKG": {"has_subjects": False, "group": "Nursery/KG"},
        "UKG": {"has_subjects": False, "group": "Nursery/KG"},
        "Class 1": {"has_subjects": True, "group": "Primary"},
        "Class 2": {"has_subjects": True, "group": "Primary"},
        "Class 3": {"has_subjects": True, "group": "Primary"},
        "Class 4": {"has_subjects": True, "group": "Primary"},
        "Class 5": {"has_subjects": True, "group": "Primary"},
        "Class 6": {"has_subjects": True, "group": "Secondary"},
        "Class 7": {"has_subjects": True, "group": "Secondary"},
        "Class 8": {"has_subjects": True, "group": "Secondary"},
        "Class 9": {"has_subjects": True, "group": "Secondary"},
        "Class 10": {"has_subjects": True, "group": "Secondary"},
    }

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
