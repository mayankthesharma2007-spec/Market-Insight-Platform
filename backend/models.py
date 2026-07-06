from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ── Auth Models ──────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: str
    password: str


class UserInDB(BaseModel):
    username: str
    email: str
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserResponse(BaseModel):
    username: str
    email: str


# ── Watchlist Models ─────────────────────────────────────────────────────────

class WatchlistItem(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    added_at: datetime = Field(default_factory=datetime.utcnow)


class WatchlistAddRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)


# ── Stock Models ─────────────────────────────────────────────────────────────

class StockData(BaseModel):
    symbol: str
    current_price: Optional[float] = None
    daily_change_percent: Optional[float] = None
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    volume: Optional[int] = None


# ── AI Models ────────────────────────────────────────────────────────────────

class AIInsightRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)


class AIInsightResponse(BaseModel):
    symbol: str
    trend: str
    risks: str
    observations: str
    cached: bool = False


# ── News Models ──────────────────────────────────────────────────────────────

class HeadlineSentiment(BaseModel):
    headline: str
    sentiment: str  # "positive", "negative", or "neutral"


class NewsResponse(BaseModel):
    symbol: str
    results: list[HeadlineSentiment]
    cached: bool = False
