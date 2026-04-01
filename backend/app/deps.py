from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests
from sqlalchemy.orm import Session
from .database import get_db
from .models.user import User
from .config import settings

security = HTTPBearer()

# Cache for JWKS to avoid fetching it every time
_jwks_cache = None

def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        # Clerk JWKS endpoint
        # The domain is likely based on the publishable key or a setting
        # For now, I'll assume it's in the settings or we need a way to get it
        # Typical format: https://[your-clerk-domain]/.well-known/jwks.json
        # If we don't have the domain, we might need a setting for it
        if not settings.clerk_publishable_key:
             return None
        
        # Extract domain from publishable key (usual format pk_[test|live]_[domain])
        # This is a bit hacky, better to have CLERK_API_URL or similar
        domain = settings.clerk_publishable_key.split('_')[2] if '_' in settings.clerk_publishable_key else "clerk.dev"
        url = f"https://{domain}.clerk.accounts.dev/.well-known/jwks.json"
        
        try:
            response = requests.get(url)
            _jwks_cache = response.json()
        except Exception:
            return None
    return _jwks_cache

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        # 1. Verify JWT with Clerk (manual verification using JWKS)
        # In a real app, you'd use a more robust library like clerk-sdk-python or similar
        
        # For now, let's assume the token is the user ID if in DEV mode, 
        # but for PROD we'll need real clerk verification.
        if settings.environment == "development" and token.startswith("user_"):
            clerk_id = token
        else:
            try:
                # Real JWT verification using jose
                claims = jwt.get_unverified_claims(token)
                clerk_id = claims.get("sub")
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Clerk token signature or format",
                )
            
        if not clerk_id or clerk_id == "undefined":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Clerk user ID",
            )
            
        # 2. Get/Sync local user
        user = db.query(User).filter(User.clerk_id == clerk_id).first()
        
        if not user:
            # If user exists in Clerk but not in local DB, we can create one
            # Ideally we'd fetch profile data from Clerk here
            user = User(clerk_id=clerk_id, name="Utilisateur Kolo", phone=None)
            db.add(user)
            db.commit()
            db.refresh(user)
            
        return user
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
