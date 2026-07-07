import os
import yfinance as yf
from datetime import datetime, timezone
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client.get_default_database("market_insight")
cache = db["ai_cache"]

SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR",
    "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK", "LT", "BAJFINANCE",
    "AXISBANK", "ASIANPAINT", "MARUTI", "SUNPHARMA", "TITAN", "ULTRACEMCO",
    "WIPRO", "NESTLEIND", "ADANIENT", "TATAMOTORS", "TATASTEEL", "POWERGRID",
    "NTPC", "HCLTECH", "M&M", "BAJAJFINSV", "TECHM", "ONGC",
    "COALINDIA", "GRASIM", "JSWSTEEL", "INDUSINDBK", "DIVISLAB", "DRREDDY",
    "CIPLA", "EICHERMOT", "BRITANNIA", "APOLLOHOSP", "HEROMOTOCO", "BPCL",
    "SBILIFE", "HDFCLIFE", "TATACONSUM", "ADANIPORTS", "UPL", "BAJAJ-AUTO",
    "SHREECEM", "HINDALCO",
]

for sym in SYMBOLS:
    ticker_symbol = f"{sym}.NS"
    ticker = yf.Ticker(ticker_symbol)
    info = ticker.info

    current_price = info.get("regularMarketPrice") or info.get("currentPrice")
    previous_close = info.get("regularMarketPreviousClose") or info.get("previousClose")
    daily_change_percent = None
    if current_price and previous_close and previous_close != 0:
        daily_change_percent = round(((current_price - previous_close) / previous_close) * 100, 2)

    payload = {
        "symbol": ticker_symbol,
        "current_price": current_price,
        "daily_change_percent": daily_change_percent,
        "week_52_high": info.get("fiftyTwoWeekHigh"),
        "week_52_low": info.get("fiftyTwoWeekLow"),
        "volume": info.get("regularMarketVolume") or info.get("volume"),
    }

    cache.update_one(
        {"symbol": ticker_symbol, "type": "stock"},
        {"$set": {
            "symbol": ticker_symbol,
            "type": "stock",
            "data": payload,
            "cached_at": datetime.now(timezone.utc).replace(tzinfo=None),
        }},
        upsert=True,
    )
    print(f"Seeded {ticker_symbol}: {payload}")

print("Done.")