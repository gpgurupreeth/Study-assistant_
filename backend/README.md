---
title: AI Study Assistant API
emoji: 📚
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# AI Study Assistant — Backend API

FastAPI backend for the AI Study Assistant application. See the root project
README for full setup, environment variable, and deployment instructions.

Quick local run:

```bash
pip install -r requirements.txt
cp .env.example .env   # then fill in GROQ_API_KEY and SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

API docs available at `/docs` once running.
