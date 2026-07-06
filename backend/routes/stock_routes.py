from fastapi import APIRouter, HTTPException, status
import yfinance as yf

from models import StockData

router = APIRouter(prefix="/stock", tags=["Stock Data"])


def _ensure_nse_suffix(symbol: str) -> str:
    """Append .NS suffix for NSE tickers if not already present."""
    symbol = symbol.upper().strip()
    if not symbol.endswith(".NS"):
        symbol += ".NS"
    return symbol


@router.get("/{symbol}", response_model=StockData)
async def get_stock_data(symbol: str):
    """
    Fetch current stock data for an NSE ticker.
    Automatically appends '.NS' if not present.
    Returns: current price, daily change %, 52-week high/low, volume.
    """
    try:
        ticker_symbol = _ensure_nse_suffix(symbol)
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

        return StockData(
            symbol=ticker_symbol,
            current_price=current_price,
            daily_change_percent=daily_change_percent,
            week_52_high=info.get("fiftyTwoWeekHigh"),
            week_52_low=info.get("fiftyTwoWeekLow"),
            volume=info.get("regularMarketVolume") or info.get("volume"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stock data: {str(e)}",
        )
