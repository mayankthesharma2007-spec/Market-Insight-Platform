import os
import json
from datetime import datetime, timezone, timedelta
from urllib.parse import quote
from fastapi import APIRouter, HTTPException, status
import feedparser
from google import genai
from dotenv import load_dotenv

from models import HeadlineSentiment, NewsResponse
from database import db

load_dotenv()

router = APIRouter(prefix="/news", tags=["News & Sentiment"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

news_cache_collection = db["ai_cache"]
CACHE_TTL_HOURS = 3


@router.get("/{symbol}", response_model=NewsResponse)
async def get_news_with_sentiment(symbol: str):
    """
    Fetch top 5 Google News headlines for a stock symbol,
    then use Gemini to label each headline with sentiment.
    Results are cached in MongoDB for 3 hours to reduce Gemini API usage.
    """
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API key not configured",
            )

        symbol_upper = symbol.upper().strip()

        # ── Cache check ───────────────────────────────────────────────────────
        now_utc = datetime.now(timezone.utc)
        cache_cutoff = now_utc - timedelta(hours=CACHE_TTL_HOURS)
        cached_doc = await news_cache_collection.find_one(
            {"symbol": symbol_upper, "type": "news"}
        )
        if cached_doc and cached_doc.get("cached_at") and cached_doc["cached_at"].replace(tzinfo=timezone.utc) > cache_cutoff:
            results = [
                HeadlineSentiment(
                    headline=item["headline"],
                    sentiment=item["sentiment"],
                )
                for item in cached_doc["data"]
            ]
            return NewsResponse(symbol=symbol_upper, results=results, cached=True)
        # ─────────────────────────────────────────────────────────────────────

        # Fetch headlines from Google News RSS
        query = quote(f"{symbol_upper} share price")
        rss_url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
        feed = feedparser.parse(rss_url)

        if not feed.entries:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No news found for symbol: {symbol_upper}",
            )

        # Take top 5 headlines
        headlines = [entry.title for entry in feed.entries[:5]]

        # Build Gemini prompt for sentiment analysis
        headlines_text = "\n".join(
            [f"{i + 1}. {h}" for i, h in enumerate(headlines)]
        )

        prompt = f"""You are a financial sentiment analyst. Analyze each of the following stock news headlines and classify the sentiment as exactly one of: "positive", "negative", or "neutral".

Headlines:
{headlines_text}

Respond ONLY with a valid JSON array where each element is an object with:
- "headline": the exact headline text
- "sentiment": one of "positive", "negative", or "neutral"

Do NOT include any text outside the JSON array. Do NOT use markdown formatting."""

        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        response_text = response.text.strip()

        # Remove markdown code fences if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            response_text = "\n".join(lines)

        sentiment_data = json.loads(response_text)

        # Validate and build response
        results = []
        cache_data = []
        for item in sentiment_data:
            sentiment = item.get("sentiment", "neutral").lower()
            if sentiment not in ("positive", "negative", "neutral"):
                sentiment = "neutral"

            headline_text = item.get("headline", "Unknown")
            results.append(
                HeadlineSentiment(
                    headline=headline_text,
                    sentiment=sentiment,
                )
            )
            cache_data.append({"headline": headline_text, "sentiment": sentiment})

        # ── Upsert into cache ─────────────────────────────────────────────────
        await news_cache_collection.update_one(
            {"symbol": symbol_upper, "type": "news"},
            {"$set": {
                "symbol": symbol_upper,
                "type": "news",
                "data": cache_data,
                "cached_at": now_utc.replace(tzinfo=None),  # store as naive UTC
            }},
            upsert=True,
        )
        # ─────────────────────────────────────────────────────────────────────

        return NewsResponse(symbol=symbol_upper, results=results, cached=False)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to parse AI sentiment response. Please try again.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"News sentiment analysis failed: {str(e)}",
        )
