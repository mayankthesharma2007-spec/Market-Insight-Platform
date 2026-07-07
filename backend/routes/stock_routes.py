from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status
import yfinance as yf

from models import StockData
from database import db

router = APIRouter(prefix="/stock", tags=["Stock Data"])

stock_cache_collection = db["ai_cache"]
CACHE_TTL_MINUTES = 5


def _ensure_nse_suffix(symbol: str) -> str:
    """Append .NS suffix for NSE tickers if not already present."""
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
    Fetch current stock data for an NSE ticker.
    Automatically appends '.NS' if not present.
    Returns: current price, daily change %, 52-week high/low, volume.
    Results are cached in MongoDB for 5 minutes to reduce yfinance load.
    If yfinance fails, stale cache is returned as a fallback.
    """
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
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info

        if not info or info.get("regularMarketPrice") is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No data found for symbol: {ticker_symbol}",
            )

        current_price = info.get("regularMarketPrice") or info.get("currentPrice")
        previous_close = info.get("regularMarketPreviousClose") or info.get("previousClose")

        daily_change_percent = None
        if current_price and previous_close and previous_close != 0:
            daily_change_percent = round(
                ((current_price - previous_close) / previous_close) * 100, 2
            )

        result_payload = {
            "symbol": ticker_symbol,
            "current_price": current_price,
            "daily_change_percent": daily_change_percent,
            "week_52_high": info.get("fiftyTwoWeekHigh"),
            "week_52_low": info.get("fiftyTwoWeekLow"),
            "volume": info.get("regularMarketVolume") or info.get("volume"),
        }

        # ── Upsert into cache ─────────────────────────────────────────────────
        await stock_cache_collection.update_one(
            {"symbol": ticker_symbol, "type": "stock"},
            {"$set": {
                "symbol": ticker_symbol,
                "type": "stock",
                "data": result_payload,
                "cached_at": now_utc.replace(tzinfo=None),  # store as naive UTC
            }},
            upsert=True,
        )
        # ─────────────────────────────────────────────────────────────────────

        return StockData(**result_payload)

    except HTTPException:
        raise
    except Exception as e:
        # ── Stale-cache fallback ──────────────────────────────────────────────
        # If yfinance failed (rate-limited, network issue, etc.) but we have
        # ANY cached entry for this symbol (even expired), return it so the
        # app stays usable rather than surfacing a hard error.
        if cached_doc:
            return _stock_data_from_doc(cached_doc)
        # ─────────────────────────────────────────────────────────────────────
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stock data: {str(e)}",
        )

