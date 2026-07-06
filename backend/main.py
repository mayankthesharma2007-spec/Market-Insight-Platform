import sys
import os

# Ensure the backend directory is on sys.path so that route files
# can use plain imports like "from models import ..." regardless of
# how the app is launched (e.g. `uvicorn main:app` from the backend
# dir, or from a parent directory).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth_routes import router as auth_router
from routes.watchlist_routes import router as watchlist_router
from routes.stock_routes import router as stock_router
from routes.ai_routes import router as ai_router
from routes.news_routes import router as news_router

# ── App Initialization ──────────────────────────────────────────────────────

app = FastAPI(
    title="Market Insight Platform API",
    description="Backend API for the Stock Market Insight Platform — real-time stock data, AI-powered analysis, and news sentiment.",
    version="1.0.0",
)

# ── CORS Middleware ──────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://market-insight-platform.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(watchlist_router)
app.include_router(stock_router)
app.include_router(ai_router)
app.include_router(news_router)


# ── Root Health Check ────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok"}
