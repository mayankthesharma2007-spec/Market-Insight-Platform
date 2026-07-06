from fastapi import APIRouter, HTTPException, status

from models import UserRegister, UserLogin, UserResponse
from auth import hash_password, verify_password, create_access_token
from database import users_collection

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user: UserRegister):
    """Register a new user."""
    try:
        # Check if email already exists
        existing_user = await users_collection.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Check if username already exists
        existing_username = await users_collection.find_one({"username": user.username})
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

        # Hash password and store user
        hashed = hash_password(user.password)
        user_doc = {
            "username": user.username,
            "email": user.email,
            "hashed_password": hashed,
        }
        await users_collection.insert_one(user_doc)

        return {"message": "User registered successfully", "username": user.username}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}",
        )


@router.post("/login", response_model=dict)
async def login(user: UserLogin):
    """Authenticate user and return JWT token."""
    try:
        db_user = await users_collection.find_one({"email": user.email})
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not verify_password(user.password, db_user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        token = create_access_token(data={"sub": db_user["email"]})

        return {
            "access_token": token,
            "token_type": "bearer",
            "username": db_user["username"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}",
        )


@router.post("/logout", response_model=dict)
async def logout():
    """
    Logout endpoint.
    Since JWT is stateless, the client simply discards the token.
    This endpoint exists for API completeness.
    """
    return {"message": "Logged out successfully. Please discard your token."}
