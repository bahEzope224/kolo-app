from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, members, payments, tontines, notifications
from .routers import auth, members, payments, tontines, notifications, users


app = FastAPI(
    title="Kolo API",
    version="1.0.0",
    description="API pour la gestion de tontines collectives",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tontines.router)
app.include_router(members.router)
app.include_router(payments.router)
app.include_router(notifications.router)
app.include_router(users.router)


@app.get("/health", tags=["Système"])
def health():
    return {"status": "ok", "app": "Kolo", "version": "1.0.0"}
