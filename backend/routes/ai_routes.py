import os
import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status
from google import genai
from dotenv import load_dotenv

from models import AIInsightRequest, AIInsightResponse
from database import db

load_dotenv()

router = APIRouter(prefix="/ai", tags=["AI Insights"])

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
    Reuses cached/seeded stock price data (from the /stock endpoint's cache)
    instead of calling yfinance directly, avoiding Render's IP rate limiting.
    Results are cached in MongoDB for 3 hours to reduce Gemini API usage.
    """
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API key not configured",
            )

        ticker_symbol = _ensure_nse_suffix(request.symbol)

        # ── Insight cache check ──────────────────────────────────────────────
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

        # ── Get underlying stock data from the stock cache (populated by
        #    /stock/{symbol} or the seed script) instead of calling yfinance ──
        stock_doc = await ai_cache_collection.find_one(
            {"symbol": ticker_symbol, "type": "stock"}
        )
        if not stock_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    f"No price data available yet for {ticker_symbol}. "
                    "Please view the stock's price details first, then try AI insight again."
                ),
            )
        stock_data = stock_doc["data"]
        # ─────────────────────────────────────────────────────────────────────

        prompt = f"""You are a financial analyst. Analyze the following stock data for {ticker_symbol} and provide insights.

Current Price: {stock_data.get('current_price', 'N/A')}
Daily Change: {stock_data.get('daily_change_percent', 'N/A')}%
52-Week High: {stock_data.get('week_52_high', 'N/A')}
52-Week Low: {stock_data.get('week_52_low', 'N/A')}
Volume: {stock_data.get('volume', 'N/A')}

Respond ONLY with a valid JSON object containing exactly these three keys:
- "trend": A concise paragraph describing the likely recent price trend and momentum, based on where the current price sits relative to its 52-week range and today's change
- "risks": A concise paragraph describing potential risks and concerns based on this data
- "observations": A concise paragraph with key observations and notable patterns

Do NOT include any text outside the JSON object. Do NOT use markdown formatting."""

        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        response_text = response.text.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            response_text = "\n".join(lines)

        insight_data = json.loads(response_text)

        result_payload = {
            "trend": insight_data.get("trend", "No trend data available"),
            "risks": insight_data.get("risks", "No risk assessment available"),
            "observations": insight_data.get("observations", "No observations available"),
        }

        await ai_cache_collection.update_one(
            {"symbol": ticker_symbol, "type": "insight"},
            {"$set": {
                "symbol": ticker_symbol,
                "type": "insight",
                "data": result_payload,
                "cached_at": now_utc.replace(tzinfo=None),
            }},
            upsert=True,
        )

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