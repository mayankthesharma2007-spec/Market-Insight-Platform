from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime

from models import WatchlistAddRequest
from auth import get_current_user
from database import watchlist_collection

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


@router.get("", response_model=dict)
async def get_watchlist(current_user: dict = Depends(get_current_user)):
    """Get the authenticated user's watchlist."""
    try:
        doc = await watchlist_collection.find_one({"email": current_user["email"]})
        if not doc or "symbols" not in doc:
            return {"symbols": []}

        return {"symbols": doc["symbols"]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch watchlist: {str(e)}",
        )


@router.post("/add", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    request: WatchlistAddRequest,
    current_user: dict = Depends(get_current_user),
):
    """Add a stock symbol to the user's watchlist."""
    try:
        symbol = request.symbol.upper().strip()

        # Ensure user has a watchlist document
        doc = await watchlist_collection.find_one({"email": current_user["email"]})

        if doc:
            # Check for duplicates
            existing_symbols = [item["symbol"] for item in doc.get("symbols", [])]
            if symbol in existing_symbols:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{symbol} is already in your watchlist",
                )

            await watchlist_collection.update_one(
                {"email": current_user["email"]},
                {
                    "$push": {
                        "symbols": {
                            "symbol": symbol,
                            "added_at": datetime.utcnow().isoformat(),
                        }
                    }
                },
            )
        else:
            await watchlist_collection.insert_one(
                {
                    "email": current_user["email"],
                    "symbols": [
                        {
                            "symbol": symbol,
                            "added_at": datetime.utcnow().isoformat(),
                        }
                    ],
                }
            )

        return {"message": f"{symbol} added to watchlist"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add to watchlist: {str(e)}",
        )


@router.delete("/remove/{symbol}", response_model=dict)
async def remove_from_watchlist(
    symbol: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove a stock symbol from the user's watchlist."""
    try:
        symbol = symbol.upper().strip()

        result = await watchlist_collection.update_one(
            {"email": current_user["email"]},
            {"$pull": {"symbols": {"symbol": symbol}}},
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{symbol} not found in your watchlist",
            )

        return {"message": f"{symbol} removed from watchlist"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove from watchlist: {str(e)}",
        )
