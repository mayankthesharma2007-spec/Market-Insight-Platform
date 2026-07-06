import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/market_insight")

client = AsyncIOMotorClient(MONGO_URI)
db = client.get_default_database("market_insight")

# Collections
users_collection = db["users"]
watchlist_collection = db["watchlists"]


async def ping_db():
    """Check if MongoDB is reachable."""
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False
