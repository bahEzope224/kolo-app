from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, members, payments, tontines, notifications, users, admin, transfer

app = FastAPI(
    title="Kolo API",
    version="1.0.0",
    description="API pour la gestion de tontines collectives",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kolo-app-two.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tontines.router)
app.include_router(members.router)
app.include_router(payments.router)
app.include_router(notifications.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(transfer.router)


@app.get("/health", tags=["Système"])
def health():
    return {"status": "ok", "app": "Kolo", "version": "1.0.0"}