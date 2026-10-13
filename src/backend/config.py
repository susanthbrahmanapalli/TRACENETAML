"""
TraceNet Configuration Module
Centralized configuration loaded from environment variables with safe defaults.
"""
import os

class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "TraceNet")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "t")
    API_PREFIX: str = "/api/v1"
    
    # Server Binding
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    
    # CORS
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./tracenet.db")
    
    # Localization & Currency
    DEFAULT_CURRENCY: str = os.getenv("DEFAULT_CURRENCY", "INR")
    CURRENCY_SYMBOL: str = os.getenv("CURRENCY_SYMBOL", "₹")
    COUNTRY_CODE: str = os.getenv("COUNTRY_CODE", "IN")
    
    # Risk Engine Defaults (Illustrative)
    DEFAULT_RISK_THRESHOLD: float = float(os.getenv("DEFAULT_RISK_THRESHOLD", "55.0"))
    HIGH_RISK_THRESHOLD: float = float(os.getenv("HIGH_RISK_THRESHOLD", "75.0"))
    CRITICAL_RISK_THRESHOLD: float = float(os.getenv("CRITICAL_RISK_THRESHOLD", "90.0"))
    RULES_VERSION: str = os.getenv("RULES_VERSION", "1.0.0")
    
    # Graph Limits
    MAX_GRAPH_HOP_DEPTH: int = int(os.getenv("MAX_GRAPH_HOP_DEPTH", "3"))
    MAX_NEIGHBORHOOD_NODES: int = int(os.getenv("MAX_NEIGHBORHOOD_NODES", "100"))
    MAX_CYCLE_LENGTH: int = int(os.getenv("MAX_CYCLE_LENGTH", "5"))

settings = Settings()
