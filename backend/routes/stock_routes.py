import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status
import requests

from models import StockData
from database import db

router = APIRouter(prefix="/stock", tags=["Stock Data"])

stock_cache_collection = db["ai_cache"]
CACHE_TTL_MINUTES = 5

TWELVE_DATA_API_KEY = os.getenv("TWELVE_DATA_API_KEY")
TWELVE_DATA_BASE_URL = "https://api.twelvedata.com/quote"


def _ensure_nse_suffix(symbol: str) -> str:
    """Append .NS suffix for NSE tickers if not already present (for display/storage consistency)."""
    symbol = symbol.upper().strip()
    if not symbol.endswith(".NS"):
        symbol += ".NS"
    return symbol


def _stock_data_from_doc(doc: dict) -> StockData:
    """Reconstruct a StockData response from a cached document's data payload."""
    payload = doc["data"]
    return StockData(
        symbol=payload["symbol"],
        current_price=payload.get("current_price"),
        daily_change_percent=payload.get("daily_change_percent"),
        week_52_high=payload.get("week_52_high"),
        week_52_low=payload.get("week_52_low"),
        volume=payload.get("volume"),
    )


@router.get("/{symbol}", response_model=StockData)
async def get_stock_data(symbol: str):
    """
    Fetch current stock data for an NSE ticker using the Twelve Data API.
    Automatically appends '.NS' for display consistency.
    Returns: current price, daily change %, 52-week high/low, volume.
    Results are cached in MongoDB for 5 minutes to reduce API load.
    If Twelve Data fails, stale cache is returned as a fallback.
    """
    bare_symbol = symbol.upper().strip().replace(".NS", "")
    ticker_symbol = _ensure_nse_suffix(symbol)

    # ── Cache check ───────────────────────────────────────────────────────────
    now_utc = datetime.now(timezone.utc)
    cache_cutoff = now_utc - timedelta(minutes=CACHE_TTL_MINUTES)
    cached_doc = await stock_cache_collection.find_one(
        {"symbol": ticker_symbol, "type": "stock"}
    )
    if (
        cached_doc
        and cached_doc.get("cached_at")
        and cached_doc["cached_at"].replace(tzinfo=timezone.utc) > cache_cutoff
    ):
        return _stock_data_from_doc(cached_doc)
    # ─────────────────────────────────────────────────────────────────────────

    try:
        if not TWELVE_DATA_API_KEY:
            raise Exception("TWELVE_DATA_API_KEY is not configured on the server.")

        response = requests.get(
            TWELVE_DATA_BASE_URL,
            params={
                "symbol": bare_symbol,
                "exchange": "NSE",
                "apikey": TWELVE_DATA_API_KEY,
            },
            timeout=10,
        )
        info = response.json()

        if info.get("status") == "error" or info.get("code"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No data found for symbol: {ticker_symbol}. {info.get('message', '')}",
            )

        current_price = float(info["close"]) if info.get("close") else None
        daily_change_percent = (
            round(float(info["percent_change"]), 2)
            if info.get("percent_change") is not None
            else None
        )
        fifty_two_week = info.get("fifty_two_week") or {}
        week_52_high = float(fifty_two_week["high"]) if fifty_two_week.get("high") else None
        week_52_low = float(fifty_two_week["low"]) if fifty_two_week.get("low") else None
        volume = int(info["volume"]) if info.get("volume") else None

        result_payload = {
            "symbol": ticker_symbol,
            "current_price": current_price,
            "daily_change_percent": daily_change_percent,
            "week_52_high": week_52_high,
            "week_52_low": week_52_low,
            "volume": volume,
        }

        # ── Upsert into cache ─────────────────────────────────────────────────
        await stock_cache_collection.update_one(
            {"symbol": ticker_symbol, "type": "stock"},
            {"$set": {
                "symbol": ticker_symbol,
                "type": "stock",
                "data": result_payload,
                "cached_at": now_utc.replace(tzinfo=None),
            }},
            upsert=True,
        )
        # ─────────────────────────────────────────────────────────────────────

        return StockData(**result_payload)

    except HTTPException:
        raise
    except Exception as e:
        # ── Stale-cache fallback ──────────────────────────────────────────────
        if cached_doc:
            return _stock_data_from_doc(cached_doc)
        # ─────────────────────────────────────────────────────────────────────
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stock data: {str(e)}",
        )