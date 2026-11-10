"""
AI Study Assistant - FastAPI backend entrypoint.

Run locally:
    uvicorn app.main:app --reload --port 8000

Deployed on HuggingFace Spaces via the Dockerfile in this directory.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine
from app.models import *  # noqa: F401,F403 - ensures all models are registered on Base.metadata
from app.routers import ai, auth, dashboard, history, notes, planner, subjects

# Create all database tables on startup (SQLite - simple, no migrations needed for this scale)
Base.metadata.create_all(bind=engine)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="AI Study Assistant API",
    description=(
        "Backend API for the AI Study Assistant application. Lets students upload "
        "lecture notes and generate summaries, quizzes, flashcards, mock papers, "
        "study plans, and get grounded Q&A over their own notes."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(notes.router)
app.include_router(ai.router)
app.include_router(planner.router)
app.include_router(history.router)
app.include_router(dashboard.router)

if os.path.isdir(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "service": "AI Study Assistant API",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
