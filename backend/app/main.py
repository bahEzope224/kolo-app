from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import members, payments, tontines, notifications, users, admin, transfer

app = FastAPI(
    title="Kolo API",
    version="1.0.0",
    description="API pour la gestion de tontines collectives",
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if "http://localhost:5173" not in origins:
    origins.append("http://localhost:5173")
if "http://localhost:3000" not in origins:
    origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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