import os
import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status
import yfinance as yf
from google import genai
from dotenv import load_dotenv

from models import AIInsightRequest, AIInsightResponse
from database import db

load_dotenv()

router = APIRouter(prefix="/ai", tags=["AI Insights"])

# Configure Gemini client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

ai_cache_collection = db["ai_cache"]
CACHE_TTL_HOURS = 3


def _ensure_nse_suffix(symbol: str) -> str:
    symbol = symbol.upper().strip()
    if not symbol.endswith(".NS"):
        symbol += ".NS"
    return symbol


@router.post("/insight", response_model=AIInsightResponse)
async def get_ai_insight(request: AIInsightRequest):
    """
    Generate AI-powered stock insight using Gemini.
    Fetches recent price data via yfinance, then sends a structured prompt
    to Gemini asking for trend, risks, and key observations.
    Results are cached in MongoDB for 3 hours to reduce Gemini API usage.
    """
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API key not configured",
            )

        ticker_symbol = _ensure_nse_suffix(request.symbol)

        # ── Cache check ───────────────────────────────────────────────────────
        now_utc = datetime.now(timezone.utc)
        cache_cutoff = now_utc - timedelta(hours=CACHE_TTL_HOURS)
        cached_doc = await ai_cache_collection.find_one(
            {"symbol": ticker_symbol, "type": "insight"}
        )
        if cached_doc and cached_doc.get("cached_at") and cached_doc["cached_at"].replace(tzinfo=timezone.utc) > cache_cutoff:
            payload = cached_doc["data"]
            return AIInsightResponse(
                symbol=ticker_symbol,
                trend=payload["trend"],
                risks=payload["risks"],
                observations=payload["observations"],
                cached=True,
            )
        # ─────────────────────────────────────────────────────────────────────

        ticker = yf.Ticker(ticker_symbol)

        # Fetch recent price history (last 30 days)
        hist = ticker.history(period="1mo")
        if hist.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No historical data found for {ticker_symbol}",
            )

        # Build price summary for the prompt
        recent_data = hist.tail(10)
        price_summary = []
        for date, row in recent_data.iterrows():
            price_summary.append(
                f"Date: {date.strftime('%Y-%m-%d')}, "
                f"Open: {row['Open']:.2f}, High: {row['High']:.2f}, "
                f"Low: {row['Low']:.2f}, Close: {row['Close']:.2f}, "
                f"Volume: {int(row['Volume'])}"
            )

        price_text = "\n".join(price_summary)
        info = ticker.info
        company_name = info.get("shortName", ticker_symbol)

        prompt = f"""You are a financial analyst. Analyze the following recent stock data for {company_name} ({ticker_symbol}) and provide insights.

Recent Price Data (last 10 trading days):
{price_text}

Current Price: {info.get('regularMarketPrice', 'N/A')}
52-Week High: {info.get('fiftyTwoWeekHigh', 'N/A')}
52-Week Low: {info.get('fiftyTwoWeekLow', 'N/A')}

Respond ONLY with a valid JSON object containing exactly these three keys:
- "trend": A concise paragraph describing the recent price trend and momentum
- "risks": A concise paragraph describing potential risks and concerns
- "observations": A concise paragraph with key observations and notable patterns

Do NOT include any text outside the JSON object. Do NOT use markdown formatting."""

        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        # Parse the response
        response_text = response.text.strip()

        # Remove markdown code fences if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first and last lines (``` markers)
            lines = [l for l in lines if not l.strip().startswith("```")]
            response_text = "\n".join(lines)

        insight_data = json.loads(response_text)

        result_payload = {
            "trend": insight_data.get("trend", "No trend data available"),
            "risks": insight_data.get("risks", "No risk assessment available"),
            "observations": insight_data.get("observations", "No observations available"),
        }

        # ── Upsert into cache ─────────────────────────────────────────────────
        await ai_cache_collection.update_one(
            {"symbol": ticker_symbol, "type": "insight"},
            {"$set": {
                "symbol": ticker_symbol,
                "type": "insight",
                "data": result_payload,
                "cached_at": now_utc.replace(tzinfo=None),  # store as naive UTC
            }},
            upsert=True,
        )
        # ─────────────────────────────────────────────────────────────────────

        return AIInsightResponse(
            symbol=ticker_symbol,
            trend=result_payload["trend"],
            risks=result_payload["risks"],
            observations=result_payload["observations"],
            cached=False,
        )

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to parse AI response. Please try again.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI insight generation failed: {str(e)}",
        )
