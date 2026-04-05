from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests
import base64
import json
from sqlalchemy.orm import Session
from .database import get_db
from .models.user import User
from .config import settings

security = HTTPBearer()

# Cache pour JWKS
_jwks_cache = None

def get_jwks():
    global _jwks_cache
    if _jwks_cache is None:
        url = None
        
        # 1. Priorité à la configuration explicite
        if settings.clerk_jwt_issuer:
            url = f"{settings.clerk_jwt_issuer.rstrip('/')}/.well-known/jwks.json"
            
        # 2. Sinon, on tente de décoder la Publishable Key (format pk_test_XXXX)
        elif settings.clerk_publishable_key:
             try:
                 parts = settings.clerk_publishable_key.split('_')
                 if len(parts) >= 3:
                     # Le domaine est dans la 3ème partie, encodé en base64
                     encoded_domain = parts[2]
                     # On ajoute du padding si nécessaire pour base64
                     padding = '=' * (4 - len(encoded_domain) % 4)
                     decoded_domain = base64.b64decode(encoded_domain + padding).decode('utf-8')
                     # Parfois fini par $, on nettoie
                     domain = decoded_domain.replace('$', '')
                     url = f"https://{domain}/.well-known/jwks.json"
             except Exception as e:
                 print(f"Erreur lors du décodage de la clef Clerk: {e}")

        # 3. Fallback ultime (souvent faux, mais évite le None)
        if not url:
            url = "https://clerk.accounts.dev/.well-known/jwks.json"
        
        try:
            print(f"INFO: Récupération des JWKS depuis {url}")
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            _jwks_cache = response.json()
        except Exception as e:
            if "clerk.accounts.dev" not in url:
                print(f"Erreur lors de la récupération des JWKS Clerk: {e}")
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
        clerk_id = None
        
        # 🟢 MODE DÉVELOPPEMENT : On accepte les IDs directs pour faciliter les tests
        if settings.environment == "development" and token.startswith("user_"):
            clerk_id = token
        else:
            # 🔴 MODE PRODUCTION : Vérification réelle du JWT
            jwks = get_jwks()
            if not jwks:
                # Si on n'arrive pas à charger les clés, on tente une vérification non signée
                # SEULEMENT si on est encore en transition, sinon erreur 500/401
                if settings.environment == "development":
                    claims = jwt.get_unverified_claims(token)
                    clerk_id = claims.get("sub")
                else:
                    raise HTTPException(status_code=500, detail="Impossible de vérifier l'identité (Clerk Service Unavailable)")
            else:
                try:
                    # Extraction du header pour trouver la clé (kid)
                    unverified_header = jwt.get_unverified_header(token)
                    rsa_key = {}
                    for key in jwks["keys"]:
                        if key["kid"] == unverified_header["kid"]:
                            rsa_key = {
                                "kty": key["kty"],
                                "kid": key["kid"],
                                "use": key["use"],
                                "n": key["n"],
                                "e": key["e"]
                            }
                    
                    if rsa_key:
                        payload = jwt.decode(
                            token,
                            rsa_key,
                            algorithms=["RS256"],
                            # On laisse open pour l'instant l'issuer/audience car dépend de l'instance
                            options={"verify_at_hash": False, "verify_aud": False}
                        )
                        clerk_id = payload.get("sub")
                    else:
                        raise HTTPException(status_code=401, detail="Clé de signature introuvable")
                except Exception as e:
                    print(f"JWT Decode Error: {e}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Invalid Clerk token: {str(e)}",
                    )
            
        if not clerk_id or clerk_id == "undefined":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Clerk user ID",
            )
            
        # 2. Synchronisation / Récupération de l'utilisateur local
        user = db.query(User).filter(User.clerk_id == clerk_id).first()
        
        if not user:
            # Création automatique de l'utilisateur s'il existe chez Clerk mais pas chez nous
            user = User(clerk_id=clerk_id, name="Nouvel utilisateur", phone=None)
            db.add(user)
            db.commit()
            db.refresh(user)
            
        return user
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )
