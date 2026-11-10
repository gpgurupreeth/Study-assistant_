# AI Study Assistant — Complete Build & Architecture Guide

> Reverse-engineering document. Read this to understand **how this app was
> built, why each choice was made, and how it's deployed** — well enough to
> explain any part of it in an interview or rebuild it from scratch.

---

## Table of Contents

1. [What This App Is](#1-what-this-app-is)
2. [Tech Stack & Why Each Choice](#2-tech-stack--why-each-choice)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Backend Deep Dive](#4-backend-deep-dive)
5. [Frontend Deep Dive](#5-frontend-deep-dive)
6. [The Complete Request Lifecycle (End-to-End)](#6-the-complete-request-lifecycle-end-to-end)
7. [Docker Explained](#7-docker-explained)
8. [Deployment Explained](#8-deployment-explained)
9. [Security Model](#9-security-model)
10. [Design Decisions & Trade-offs](#10-design-decisions--trade-offs)
11. [Interview Q&A Cheat Sheet](#11-interview-qa-cheat-sheet)
12. [Local Setup & Deployment Walkthrough](#12-local-setup--deployment-walkthrough)

---

## 1. What This App Is

AI Study Assistant is a **full-stack web application** for students. The core
problem it solves: students accumulate lecture notes (PDFs, DOCX, TXT) but
don't have time to manually turn them into exam-ready study material.

The app automates that transformation. A student:

1. **Registers an account** and logs in.
2. **Creates a subject** (e.g., "Organic Chemistry") to group related notes.
3. **Uploads a note file** — the backend extracts the text automatically.
4. **Triggers AI features** on that note: summaries, quizzes, flashcards,
   grounded Q&A, "explain simply," mock papers, and study plans.

Every AI output is **grounded in the student's own uploaded notes** — the LLM
is instructed to answer only from the note text. This is the key design
principle: the app doesn't hallucinate from general knowledge; it transforms
content the student already has.

---

## 2. Tech Stack & Why Each Choice

### Frontend

| Technology | What It Does Here | Why It Was Chosen |
|---|---|---|
| **React 18** | UI library — builds the SPA with components | Industry standard; component model fits a page-heavy CRUD+AI app |
| **Vite** | Build tool & dev server | Fast HMR (hot module replacement), simple config, modern default for React |
| **React Router v6** | Client-side routing between pages | Declarative route definitions; supports nested layouts and protected routes |
| **Axios** | HTTP client to call the backend | Request/response interceptors for attaching JWT and handling 401 globally — cleaner than `fetch` for this |
| **Tailwind CSS** | Utility-first styling | No separate CSS files; rapid UI; built-in dark mode via `class` strategy |
| **React Icons** | Icon set | Lightweight, tree-shakeable icon library |
| **react-hot-toast** | Toast notifications | Simple, declarative success/error toasts |

### Backend

| Technology | What It Does Here | Why It Was Chosen |
|---|---|---|
| **FastAPI** | Web framework — serves the REST API | Auto-generates OpenAPI/Swagger docs at `/docs`; async support; Pydantic-native validation; fast |
| **Pydantic v2** | Data validation (request/response schemas) | Defines strict types for every endpoint; auto-validates input; serializes ORM models to JSON |
| **pydantic-settings** | Loads config from `.env` | Type-safe settings with defaults; reads `.env` automatically |
| **SQLAlchemy 2.0** | ORM — maps Python classes to DB tables | Abstracts SQL; supports relationships, cascades, queries in Python |
| **SQLite** | Database (file-based, `study_assistant.db`) | Zero-config; no separate DB server; perfect for a single-user-scale app and easy deployment |
| **Uvicorn** | ASGI server that runs FastAPI | The standard FastAPI server; supports `--reload` for dev |
| **python-jose** | JWT creation & verification | Signs and decodes JSON Web Tokens for authentication |
| **passlib + bcrypt** | Password hashing | One-way hashes passwords so they're never stored in plaintext |
| **PyMuPDF (fitz)** | PDF text extraction | Reads text from PDF pages |
| **python-docx** | DOCX text extraction | Reads paragraphs and table cells from Word docs |
| **Groq SDK** | LLM API client | Calls the Groq-hosted `llama-3.3-70b-versatile` model |
| **python-dotenv** | Loads `.env` files | Reads environment variables from a `.env` file (used by pydantic-settings) |

### Infrastructure

| Technology | What It Does Here | Why It Was Chosen |
|---|---|---|
| **Docker** | Containerizes the backend | Reproducible builds; same environment everywhere; required by HuggingFace Spaces |
| **Vercel** | Hosts the frontend SPA | Free tier; perfect for static React builds; automatic HTTPS |
| **Railway / HuggingFace Spaces** | Hosts the backend API | Runs the Docker container; provides a public URL |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                         │
│  React SPA (Vite dev server :5173 / Vercel)              │
│  • Pages → call services → Axios → backend               │
│  • JWT stored in localStorage, attached to every request │
└────────────────────────┬────────────────────────────────┘
                         │  HTTPS / JSON (REST)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND API (FastAPI :8000)                  │
│  Routers (auth, subjects, notes, ai, planner, ...)        │
│  • Validates input with Pydantic schemas                  │
│  • Authenticates via JWT (get_current_user dependency)   │
│  • Enforces per-user ownership on every query            │
│                                                          │
│  Services layer:                                         │
│  • file_extraction.py  → PDF/DOCX/TXT → text             │
│  • ai_service.py       → builds prompts, calls Groq      │
│                                                          │
│  Database: SQLite (study_assistant.db)                   │
│  Tables: users, subjects, notes, note_summaries,         │
│          history_items                                    │
└────────────────────────┬────────────────────────────────┘
                         │  HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│              GROQ API (external LLM service)              │
│  Model: llama-3.3-70b-versatile                           │
│  Returns JSON-only responses (response_format=json_object)│
└─────────────────────────────────────────────────────────┘
```

**Key architectural principles:**

- **Two-tier client/server.** The frontend is a static SPA; the backend is a
  stateless REST API. The only state lives in the database and the JWT.
- **AI is synchronous.** There's no job queue. When you click "Generate Quiz,"
  the backend calls Groq and waits for the response in the same HTTP request.
  This is simple and works because LLM calls take a few seconds, not minutes.
- **Grounded AI.** The LLM is always given the note text in the prompt and
  instructed to answer only from it. The backend enforces this for Q&A by
  overriding the answer with a fallback string if the model says it's not
  grounded.
- **Per-user data isolation.** Every database query filters by `owner_id ==
  current_user.id`. A user can never see another user's data.

---

## 4. Backend Deep Dive

### 4.1 Project Structure

```
backend/
├── app/
│   ├── main.py              ← FastAPI app creation, router registration, startup
│   ├── core/
│   │   ├── config.py        ← Settings loaded from .env (pydantic-settings)
│   │   ├── database.py      ← SQLAlchemy engine, session, Base, get_db()
│   │   ├── security.py      ← bcrypt hashing, JWT create/decode
│   │   └── deps.py          ← get_current_user() dependency (JWT → User)
│   ├── models/              ← SQLAlchemy ORM models (the DB schema)
│   │   ├── user.py
│   │   ├── subject.py
│   │   ├── note.py
│   │   └── history.py
│   ├── schemas/             ← Pydantic request/response DTOs
│   │   ├── user.py
│   │   ├── subject.py
│   │   ├── note.py
│   │   ├── history.py
│   │   └── ai.py
│   ├── routers/             ← Route handlers (controllers)
│   │   ├── auth.py
│   │   ├── subjects.py
│   │   ├── notes.py
│   │   ├── ai.py
│   │   ├── planner.py
│   │   ├── history.py
│   │   └── dashboard.py
│   └── services/            ← Business logic
│       ├── ai_service.py    ← All Groq LLM calls + prompt engineering
│       └── file_extraction.py ← PDF/DOCX/TXT → plain text
├── uploads/                 ← Uploaded files (static mount at /uploads)
├── requirements.txt         ← Pinned Python dependencies
├── Dockerfile              ← Container build instructions
└── .env                     ← Environment config (NEVER committed)
```

**Layered architecture pattern:** `routers` (receive HTTP) → `services` (business
logic) → `models` (database). Routers stay thin; all logic lives in services.

### 4.2 Configuration (`core/config.py`)

All settings come from environment variables via `pydantic-settings`:

```python
class Settings(BaseSettings):
    SECRET_KEY: str = "insecure-dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440   # 24 hours
    DATABASE_URL: str = "sqlite:///./study_assistant.db"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    CORS_ORIGINS: str = "http://localhost:5173"
    MAX_UPLOAD_SIZE_MB: int = 15
    UPLOAD_DIR: str = "uploads"
    model_config = SettingsConfigDict(env_file=".env", ...)
```

- Every setting has a **sensible default**, so the app runs without a `.env`
  file (except `GROQ_API_KEY`, which is required for AI features).
- `get_settings()` is decorated with `@lru_cache`, so `.env` is parsed **once**
  at startup. This is why you must **restart the server** after changing `.env`.
- `cors_origins_list` is a computed property that splits the comma-separated
  `CORS_ORIGINS` string into a list. This is what allows the frontend origin
  to call the backend without browser CORS errors.

### 4.3 Database & Models (`core/database.py`, `models/`)

The database setup:

```python
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- `check_same_thread=False` is required for SQLite + FastAPI because FastAPI
  uses async (multiple threads), but SQLite defaults to single-thread access.
- `get_db()` is a **FastAPI dependency** — each request gets its own session,
  and it's automatically closed when the request ends. This prevents connection
  leaks.
- Tables are created on startup via `Base.metadata.create_all(bind=engine)` in
  `main.py`. **No migration tool** (like Alembic) is used — appropriate for a
  greenfield SQLite app, but means schema changes require manual DB resets.

**The four models and their relationships:**

```
User (1) ──< Subject (N) ──< Note (N) ──(1) NoteSummary
User (1) ──< HistoryItem (N)
Subject (1) ──< Note (N)
Note (1) ──< HistoryItem (N)  [optional FK]
```

| Model | Key Fields | Notes |
|---|---|---|
| `User` | id, full_name, email (unique), hashed_password, created_at | Owns subjects + history (cascade delete) |
| `Subject` | id, name, description, color, owner_id, created_at | Groups notes; owns notes (cascade delete) |
| `Note` | id, title, file_name, file_type, extracted_text, subject_id, owner_id, created_at | `extracted_text` stores the full parsed document inline |
| `NoteSummary` | id, note_id (unique), summary_text, key_points, definitions, formulas, exam_tips | One-to-one with Note; caches AI summary so it isn't regenerated. List fields stored as JSON strings |
| `HistoryItem` | id, owner_id, note_id, subject_id, type, title, content, created_at | Generic audit log of every AI action. `type` = summary/quiz/flashcards/question/mock_paper/study_plan/explain_simply. `content` = JSON string |

**Why `extracted_text` is stored in the DB:** So AI features can re-run
without re-parsing the file. The file is also saved to `uploads/` and mounted
statically, but the text is what the LLM needs.

**Why `HistoryItem.content` is a JSON string:** It's a generic log — a quiz
stores `{"questions": [...]}`, a Q&A stores `{"question": "...", "answer": "..."}`,
a study plan stores `{"days": [...]}`. Storing as a JSON `Text` column is a
deliberate trade-off: simple, flexible, but not queryable by content fields.

### 4.4 Authentication & Security (`core/security.py`, `core/deps.py`)

**Password hashing (bcrypt):**

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain, hashed) -> bool:
    return pwd_context.verify(plain, hashed)
```

Passwords are **never stored in plaintext**. `bcrypt` adds a random salt and
is intentionally slow, making rainbow-table attacks impractical.

**JWT tokens (python-jose):**

```python
def create_access_token(data: dict, expires_delta=None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=1440)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
```

- The token contains `{"sub": "<user_id>", "exp": <expiry>}`.
- `sub` (subject) is the user ID as a string.
- `exp` is the expiry timestamp. The token is invalid after 24 hours.
- It's signed with `SECRET_KEY` using `HS256` (HMAC-SHA256). If the secret is
  unknown, the token can't be forged.

**Auth dependency (`core/deps.py`):**

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)) -> User:
    payload = decode_access_token(token)     # verify signature + expiry
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    return user
```

This is the **single most important function in the app**. Every protected
endpoint uses `Depends(get_current_user)`. FastAPI:

1. Reads the `Authorization: Bearer <token>` header.
2. Decodes & verifies the JWT.
3. Loads the `User` from the DB.
4. Passes that `User` object to the route handler.

If the token is missing, invalid, expired, or the user doesn't exist, it
raises `401 Unauthorized`.

### 4.5 File Extraction (`services/file_extraction.py`)

When a student uploads a file, this service converts it to plain text:

```python
def extract_text(filename, file_bytes) -> tuple[str, str]:
    ext = get_file_extension(filename)   # validates .pdf/.txt/.docx
    if ext == "pdf":   text = extract_text_from_pdf(file_bytes)    # PyMuPDF
    elif ext == "docx": text = extract_text_from_docx(file_bytes)  # python-docx
    else:              text = extract_text_from_txt(file_bytes)    # UTF-8 decode
    if not text: raise HTTPException(422, "No readable text...")
    return text, ext
```

- **PDF**: opens the PDF in memory (`fitz.open(stream=...)`), iterates pages,
  concatenates `page.get_text()`.
- **DOCX**: reads all paragraphs + table cells (tables are common in lecture
  notes and would be missed by paragraph-only parsing).
- **TXT**: decodes UTF-8 with `errors="ignore"` (gracefully handles bad bytes).
- Returns `422` if no text can be extracted (e.g., scanned image-only PDF).

### 4.6 AI Service Layer (`services/ai_service.py`)

This is the heart of the app. It contains **7 AI workflows**, each with a
carefully engineered prompt. All share a common execution path:

```python
def _chat_json(system_prompt, user_prompt, temperature=0.4) -> dict:
    client = get_client()  # lazy-init Groq client
    completion = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        temperature=temperature,
        messages=[{"role": "system", "content": system_prompt},
                  {"role": "user",   "content": user_prompt}],
        response_format={"type": "json_object"},  # forces JSON output
    )
    raw = completion.choices[0].message.content
    return _extract_json(raw)
```

**Three critical defensive patterns:**

1. **`_truncate(text, max_chars=12000)`** — caps the note text sent to the LLM
   to stay within the model's context window. Without this, a 100-page PDF
   would blow the token limit. The `Explain Simply` feature uses a tighter
   4,000-char cap since it operates on selected text.

2. **`_extract_json(raw_text)`** — the model is told to return JSON, but LLMs
   sometimes wrap JSON in markdown fences (```` ```json ... ``` ````) or add
   prose. This function:
   - Strips markdown fences.
   - Tries `json.loads()` directly.
   - If that fails, regex-extracts the first `{...}` or `[...]` block and
     retries.
   - If all parsing fails, raises `502 Bad Gateway` with a friendly message.

3. **`response_format={"type": "json_object"}`** — tells the Groq API to
   constrain the model to valid JSON. This dramatically reduces parse failures.

**The 7 workflows:**

| # | Function | System Prompt Persona | Key Behavior |
|---|---|---|---|
| 1 | `generate_summary` | "Expert academic study assistant" | Returns summary text, key points, definitions, formulas, exam tips |
| 2 | `ask_question` | "Strict study assistant" | Answers **only** from the note. If not grounded, returns a fixed fallback string. Temperature 0.2 (low creativity = more faithful) |
| 3 | `generate_quiz` | "Expert exam question writer" | Generates exactly N MCQs with 4 options, correct answer, explanation |
| 4 | `generate_flashcards` | "Expert study coach" | Generates N Q/A cards for spaced repetition |
| 5 | `explain_simply` | "Friendly teacher" | Rewrites text for a 12-year-old with simple words + analogy |
| 6 | `generate_study_plan` | "Expert academic study planner" | Creates day-by-day schedule from exam date + hours/day |
| 7 | `generate_mock_paper` | "Experienced exam paper setter" | Generates short-answer + long-answer questions |

**Why temperature varies:** Q&A uses 0.2 (low — should be factual, not
creative). Summaries use 0.4 (balanced). Quizzes/flashcards use 0.5 (some
variety in questions). Explain Simply uses 0.6 (more creative analogies).

**The grounded Q&A enforcement (the most important prompt):**

```python
NOT_COVERED_MESSAGE = "This topic is not covered in the uploaded notes."

def ask_question(note_text, question):
    # ... prompt asks model to set "grounded": true/false ...
    data = _chat_json(system_prompt, user_prompt, temperature=0.2)
    grounded = bool(data.get("grounded", False))
    answer = data.get("answer") or NOT_COVERED_MESSAGE
    if not grounded:
        answer = NOT_COVERED_MESSAGE   # server overrides even if model lies
    return {"answer": answer, "grounded": grounded}
```

Even if the model returns `grounded: false` but still writes an answer, the
**server overrides it** with the fallback string. This is the key anti-
hallucination mechanism: the answer is guaranteed to come from the note.

### 4.7 Routers (All Endpoints)

**Auth (`/api/auth`)**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/register` | No | Create account, returns JWT + user |
| POST | `/login` | No | Verify credentials, returns JWT + user |
| GET | `/me` | Yes | Get current user profile |
| PUT | `/me` | Yes | Update name or password |

**Subjects (`/api/subjects`)**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `` | Yes | List user's subjects (with note count) |
| POST | `` | Yes | Create a subject |
| GET | `/{id}` | Yes | Get one subject |
| PUT | `/{id}` | Yes | Update subject |
| DELETE | `/{id}` | Yes | Delete subject (cascades to notes) |

**Notes (`/api/notes`)**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/upload` | Yes | Upload file (multipart), extract text, store note |
| GET | `` | Yes | List notes (optional `subject_id` filter) |
| GET | `/search?q=` | Yes | Search notes by title or content (`ILIKE`) |
| GET | `/{id}` | Yes | Get note detail (includes `extracted_text`) |
| DELETE | `/{id}` | Yes | Delete note |

**AI (`/api/ai`)**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/summary/{note_id}` | Yes | Get/cache summary (`force_regenerate` param) |
| POST | `/ask` | Yes | Grounded Q&A |
| POST | `/quiz` | Yes | Generate quiz (5-15 questions) |
| POST | `/flashcards` | Yes | Generate flashcards (5-30 cards) |
| POST | `/explain-simply` | Yes | Simplify text |
| POST | `/mock-paper` | Yes | Generate mock paper |

**Planner (`/api/planner`)**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/generate` | Yes | Generate day-by-day study plan from exam date + hours/day |

**History (`/api/history`)**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `` | Yes | List history items (optional `type` filter, limit 200) |
| GET | `/{id}` | Yes | Get one history item with full content |
| DELETE | `/{id}` | Yes | Delete history item |

**Dashboard (`/api/dashboard`)**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/stats` | Yes | Totals (subjects, notes, quizzes, flashcards) + 5 recent uploads |

**Every protected endpoint follows the same pattern:**

```python
@router.post("/quiz", response_model=QuizResponse)
def generate_quiz(payload: QuizRequest,
                  current_user: User = Depends(get_current_user),  # auth
                  db: Session = Depends(get_db)):
    note = _get_owned_note(payload.note_id, current_user, db)  # ownership
    result = ai_service.generate_quiz(note.extracted_text, payload.num_questions)
    _log_history(db, current_user.id, note.id, note.subject_id, "quiz", ...)
    return QuizResponse(note_id=note.id, questions=result["questions"])
```

1. `Depends(get_current_user)` authenticates.
2. `_get_owned_note` fetches the note **filtered by `owner_id`** — enforces
   that the user owns the resource.
3. Call the service layer.
4. Log to `HistoryItem`.
5. Return a typed Pydantic response.

### 4.8 Input Validation (Pydantic Schemas)

Every endpoint has a request schema with constraints:

```python
class QuizRequest(BaseModel):
    note_id: int
    num_questions: int = Field(default=5, ge=5, le=15)  # 5-15 inclusive

class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr                  # validated as a real email format
    password: str = Field(min_length=6, max_length=128)
```

FastAPI automatically returns `422 Unprocessable Entity` with a detailed error
message if validation fails. This happens **before** the route handler runs.

---

## 5. Frontend Deep Dive

### 5.1 Project Structure

```
frontend/src/
├── main.jsx              ← App entry; wraps in BrowserRouter + providers
├── App.jsx               ← Route definitions
├── index.css             ← Tailwind directives + global styles
├── context/
│   ├── AuthContext.jsx   ← Auth state (user, login, register, logout)
│   └── ThemeContext.jsx  ← Light/dark theme
├── components/
│   ├── ProtectedRoute.jsx ← Guards authenticated routes
│   ├── Sidebar.jsx        ← Navigation sidebar
│   ├── Topbar.jsx         ← Top bar (theme toggle, user menu)
│   └── Common.jsx         ← Shared UI components
├── layouts/
│   └── AppLayout.jsx      ← Shell with Sidebar + Topbar + <Outlet/>
├── pages/                ← 13 page components
│   ├── LandingPage.jsx
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── DashboardPage.jsx
│   ├── SubjectsPage.jsx
│   ├── UploadNotePage.jsx
│   ├── NoteDetailPage.jsx
│   ├── AIChatPage.jsx
│   ├── QuizPage.jsx
│   ├── FlashcardsPage.jsx
│   ├── StudyPlannerPage.jsx
│   ├── ProfilePage.jsx
│   └── NotFoundPage.jsx
└── services/
    ├── api.js            ← Axios instance + interceptors
    ├── authService.js    ← Auth API calls
    ├── noteService.js    ← Note API calls
    ├── subjectService.js ← Subject API calls
    ├── aiService.js      ← AI API calls
    └── historyService.js ← History + dashboard API calls
```

### 5.2 App Bootstrap (`main.jsx`)

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>        {/* React Router: enables client-side routing */}
      <ThemeProvider>     {/* Light/dark theme state */}
        <AuthProvider>    {/* User auth state */}
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

Provider nesting matters: `AuthProvider` is inside `ThemeProvider` (it could
use theme), and both are inside `BrowserRouter` (routing context available to
all). `App.jsx` then defines all routes.

### 5.3 Routing & Protected Routes (`App.jsx`)

Routes split into two groups:

```jsx
<Routes>
  {/* Public */}
  <Route path="/" element={<LandingPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />

  {/* Protected — wrapped in ProtectedRoute + AppLayout */}
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/subjects" element={<SubjectsPage />} />
    <Route path="/subjects/:subjectId/upload" element={<UploadNotePage />} />
    <Route path="/notes/:noteId" element={<NoteDetailPage />} />
    <Route path="/notes/:noteId/chat" element={<AIChatPage />} />
    <Route path="/notes/:noteId/quiz" element={<QuizPage />} />
    <Route path="/notes/:noteId/flashcards" element={<FlashcardsPage />} />
    <Route path="/planner" element={<StudyPlannerPage />} />
    <Route path="/profile" element={<ProfilePage />} />
  </Route>

  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

**ProtectedRoute** checks auth before rendering:

```jsx
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <Spinner />                  // show spinner while checking
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} />
  return children
}
```

**AppLayout** provides the shell (Sidebar + Topbar) and renders the matched
child route via `<Outlet />` — React Router's pattern for nested layouts.

### 5.4 Auth Context (`context/AuthContext.jsx`)

Manages the user state globally:

```jsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('asa_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('asa_token')
    if (!token) { setLoading(false); return }
    // Validate the stored token against the backend on app load
    getCurrentUser()
      .then(freshUser => { setUser(freshUser); /* persist */ })
      .catch(() => { /* clear stale token */ })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const data = await loginUser({ email, password })
    localStorage.setItem('asa_token', data.access_token)
    localStorage.setItem('asa_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }
  // register, logout, updateLocalUser ...
}
```

**Key design decisions:**

- On app load, it **validates the stored token** by calling `/api/auth/me`.
  If the token is expired/invalid, it clears localStorage and logs out. This
  prevents a stale-token "phantom login" where the UI thinks you're logged in
  but the API rejects you.
- The `loading` state prevents route flicker: `ProtectedRoute` shows a spinner
  until the validation completes.
- `login`/`register` store both the JWT (`asa_token`) and the user object
  (`asa_user`) in localStorage so the UI can render immediately without a
  re-fetch.

### 5.5 API Client (`services/api.js`)

```javascript
const api = axios.create({ baseURL: API_URL })

// Request interceptor: attach JWT to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('asa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: handle expired/invalid sessions globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('asa_token')
      localStorage.removeItem('asa_user')
      if (!window.location.pathname.startsWith('/login'))
        window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

**Why interceptors instead of per-call headers:**

- Every API call automatically includes the JWT — no service file has to
  remember to add it.
- A 401 anywhere in the app triggers a global logout + redirect, instead of
  each page handling it separately.
- `getErrorMessage()` is a shared helper that extracts a human-readable error
  message from any Axios error (used by all pages for toast notifications).

### 5.6 Service Layer

Each service module is a thin wrapper over the Axios instance:

```javascript
// noteService.js
export async function uploadNote({ subjectId, title, file, onProgress }) {
  const formData = new FormData()
  formData.append('subject_id', subjectId)
  formData.append('title', title)
  formData.append('file', file)
  const { data } = await api.post('/api/notes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total))
    },
  })
  return data
}
```

- **Separation of concerns**: pages call services; services call Axios. Pages
  never import Axios directly. This makes it easy to swap the HTTP client or
  mock the API.
- File uploads use `FormData` (multipart) and support an `onProgress` callback
  for upload progress bars.

### 5.7 Theme (`context/ThemeContext.jsx`)

```jsx
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('asa_theme')
    if (stored) return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('asa_theme', theme)
  }, [theme])
  // toggleTheme...
}
```

- Uses Tailwind's `class` dark-mode strategy: toggling the `dark` class on
  `<html>` switches all `dark:` variants.
- Respects the OS preference on first visit, then remembers the user's choice
  in localStorage (`asa_theme`).

---

## 6. The Complete Request Lifecycle (End-to-End)

Here's exactly what happens when a student uploads a note and generates a
quiz. This is the "story" you'd walk an interviewer through:

### Step 1: Register

```
Browser → POST /api/auth/register { full_name, email, password }
  → FastAPI validates with UserRegister schema (email format, password ≥ 6)
  → Checks if email exists → hashes password with bcrypt
  → Creates User row → creates JWT (sub=user.id, exp=+24h)
  → Returns { access_token, token_type, user }
Browser ← stores JWT + user in localStorage, sets AuthContext user
```

### Step 2: Create a Subject

```
Browser → POST /api/subjects { name, description, color }
  [Authorization: Bearer <jwt>]
  → get_current_user decodes JWT, loads User from DB
  → Creates Subject with owner_id = current_user.id
  → Returns subject (with note_count=0)
```

### Step 3: Upload a Note

```
Browser → POST /api/notes/upload  (multipart form: subject_id, title, file)
  → get_current_user authenticates
  → Verifies subject exists & belongs to user
  → Reads file bytes, checks size ≤ 15MB
  → extract_text(): PyMuPDF/python-docx/UTF-8 → plain text
  → Creates Note row with extracted_text, file_type, subject_id, owner_id
  → Returns NoteOut (id, title, file_type, ...)
```

### Step 4: Generate a Quiz

```
Browser → POST /api/ai/quiz { note_id, num_questions: 10 }
  → get_current_user authenticates
  → _get_owned_note: SELECT note WHERE id=note_id AND owner_id=user.id
  → ai_service.generate_quiz(note.extracted_text, 10):
      → _truncate(text, 12000)  — caps note to fit context window
      → _chat_json():
          → builds system prompt ("expert exam question writer")
          → builds user prompt (note text + JSON schema instructions)
          → Groq API call with response_format=json_object, temperature=0.5
          → _extract_json(): strips fences, parses JSON
      → returns { questions: [...] }
  → _log_history: inserts HistoryItem(type="quiz", content=JSON)
  → Returns { note_id, questions }
Browser ← renders quiz with 10 MCQs, options, correct answers, explanations
```

### Step 5: Ask AI (Grounded Q&A)

```
Browser → POST /api/ai/ask { note_id, question }
  → same auth + ownership check
  → ai_service.ask_question():
      → prompt instructs: answer ONLY from notes; set grounded=true/false
      → temperature=0.2 (low creativity = faithful)
      → if grounded=false → server overrides answer with fallback string
  → _log_history
  → Returns { answer, grounded }
```

---

## 7. Docker Explained

### What Is Docker?

Docker packages an application + all its dependencies (Python, libraries,
system tools) into a single **container image**. That image runs identically
on any machine that has Docker — your laptop, a cloud server, a CI pipeline.
It solves the "it works on my machine" problem.

**Analogy:** Docker is like shipping a product in a sealed container with all
its tools inside. The warehouse (server) doesn't need to install anything —
it just runs the container as-is.

### The Dockerfile, Line by Line

```dockerfile
# Base image: Python 3.11 running on a minimal Linux (Debian "slim")
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Install system-level build tools (needed to compile some Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements.txt first (Docker layer caching)
COPY requirements.txt .
# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create the uploads directory and make it writable by anyone
# (HuggingFace Spaces containers run as a non-root user)
RUN mkdir -p uploads && chmod -R 777 uploads

# Unbuffered Python output so logs appear immediately (not delayed by buffering)
ENV PYTHONUNBUFFERED=1

# The container listens on this port (HuggingFace Spaces requires 7860)
EXPOSE 7860

# The command that runs when the container starts
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
```

**Why each part matters:**

| Line | Why |
|---|---|
| `FROM python:3.11-slim` | `slim` is a smaller image (no full OS). Python 3.11 matches the dev version. |
| `WORKDIR /app` | All subsequent commands run in `/app` inside the container. |
| `apt-get build-essential` | PyMuPDF and bcrypt need a C compiler to build from source. Without it, `pip install` fails. |
| `COPY requirements.txt` before `COPY .` | **Layer caching**: if you change code but not dependencies, Docker reuses the cached `pip install` layer. This makes rebuilds fast. If you copied everything first, any code change would invalidate the pip install cache. |
| `rm -rf /var/lib/apt/lists/*` | Cleans the apt cache to keep the image small. |
| `mkdir uploads && chmod 777` | HuggingFace Spaces runs containers as a non-root user. If uploads/ isn't writable, file uploads crash at runtime. |
| `ENV PYTHONUNBUFFERED=1` | Without this, Python buffers stdout and logs appear delayed or not at all in container logging. |
| `EXPOSE 7860` | Documentation — tells the host which port to map. HuggingFace Spaces specifically requires the app to listen on 7860. |
| `CMD uvicorn --host 0.0.0.0` | `0.0.0.0` means "listen on all network interfaces" (not just localhost), so the port is reachable from outside the container. `--reload` is intentionally **omitted** in production — it's a dev-only feature that watches files and restarts. |

### Why Docker Here (Instead of Just Running Python)?

1. **Reproducibility**: the same image runs locally and in production. No
   "works on my machine" surprises.
2. **Isolation**: the app's Python, libraries, and system deps don't conflict
   with anything else on the server.
3. **HuggingFace Spaces requirement**: HF Spaces deploys from a Dockerfile.
   The `app_port: 7860` in the README's front matter tells HF which port to
   expose.
4. **Easy scaling**: run N containers behind a load balancer.

### Docker vs. Local Dev

| Local dev | Docker/Production |
|---|---|
| `uvicorn app.main:app --reload --port 8000` | `uvicorn app.main:app --host 0.0.0.0 --port 7860` |
| `--reload` watches files & auto-restarts | No `--reload` (stability > convenience) |
| `--port 8000` (matches frontend `.env`) | `--port 7860` (HF Spaces convention) |
| Runs on `127.0.0.1` (localhost only) | `0.0.0.0` (all interfaces, publicly reachable) |

---

## 8. Deployment Explained

The app is split into two deployments that talk to each other over HTTPS:

```
┌────────────────┐         HTTPS JSON          ┌──────────────────────┐
│  Vercel         │ ──────────────────────────► │  Backend (Railway    │
│  (Frontend SPA) │ ◄────────────────────────── │  or HF Spaces)       │
│  Static build   │                             │  Docker container    │
└────────────────┘                             │  FastAPI + SQLite     │
                                               └──────────┬───────────┘
                                                          │ HTTPS
                                                          ▼
                                               ┌──────────────────────┐
                                               │  Groq API (external)  │
                                               └──────────────────────┘
```

### 8.1 Frontend Deployment (Vercel)

**What Vercel does:** Vercel takes the React/Vite app, runs `npm run build`
(which produces static HTML/JS/CSS in `dist/`), and serves those files from a
global CDN. It's a **static site** — there's no server-side code.

**`vercel.json`** configures SPA routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Why this is needed:** A SPA has one HTML file (`index.html`). React Router
handles all paths client-side. But if a user navigates directly to
`/dashboard` (e.g., refreshes the page), the browser asks the server for
`/dashboard` — which doesn't exist as a file. The rewrite rule sends **all**
requests to `index.html`, and React Router takes over from there. Without
this, direct navigation/refresh on any route returns a 404.

**`vite.config.js`** sets the dev server port:

```javascript
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
```

**Environment variable:** `VITE_API_URL` is the only config the frontend needs.
It's baked into the build at compile time (Vite replaces `import.meta.env.VITE_API_URL`
with the value). For local dev it's `http://localhost:8000`; for production it's
the backend's public URL. This is why the frontend `.env` must be set **before**
`npm run build`.

**Deployment steps (Vercel):**
1. Push the repo to GitHub.
2. Import the repo on Vercel → set the root directory to `frontend`.
3. Set `VITE_API_URL` to the backend's public URL in Vercel's env settings.
4. Vercel auto-runs `npm install` + `npm run build` on every push.
5. You get a `https://<project>.vercel.app` URL.

### 8.2 Backend Deployment

The backend can deploy to any platform that runs Docker or Python. The README
mentions two options:

**Option A: Railway**
- Railway detects the `Dockerfile` (or `requirements.txt`) and builds it.
- You set environment variables (SECRET_KEY, GROQ_API_KEY, CORS_ORIGINS) in
  Railway's dashboard.
- Railway gives you a public URL like `https://<app>.up.railway.app`.
- **SQLite caveat:** Railway's filesystem is ephemeral — the container restarts
  and `study_assistant.db` is lost. For a real deployment, you'd attach a
  persistent volume or switch to a managed Postgres.

**Option B: HuggingFace Spaces**
- The `Dockerfile` + README front matter (`sdk: docker`, `app_port: 7860`)
  are configured for HF Spaces.
- HF Spaces runs the container on port 7860 (hence the Dockerfile's port).
- Free tier, but ephemeral storage (same SQLite caveat).

### 8.3 Connecting Frontend to Backend

1. Backend deploys → you get a public URL (e.g., `https://ai-study-api.up.railway.app`).
2. Set `CORS_ORIGINS` on the backend to include the Vercel frontend URL
   (e.g., `https://ai-study-assistant.vercel.app`).
3. Set `VITE_API_URL` on the frontend to the backend URL.
4. Redeploy both. They're now connected.

**Why CORS matters here:** The frontend is served from `vercel.app` but calls
the backend at `railway.app` — a **cross-origin** request. The browser blocks
cross-origin requests unless the backend explicitly allows the frontend's
origin. `CORSMiddleware` in `main.py` reads `settings.cors_origins_list` and
sends the `Access-Control-Allow-Origin` header. Without it, the browser
blocks every API call.

### 8.4 Environment Variables Summary

| Variable | Where | Purpose |
|---|---|---|
| `SECRET_KEY` | Backend | Signs JWTs. Must be a random secret in production. |
| `GROQ_API_KEY` | Backend | API key for the Groq LLM. Required for all AI features. |
| `GROQ_MODEL` | Backend | Which LLM model to use (`llama-3.3-70b-versatile`). |
| `DATABASE_URL` | Backend | SQLite path (or Postgres URL if switching). |
| `CORS_ORIGINS` | Backend | Comma-separated list of allowed frontend origins. |
| `MAX_UPLOAD_SIZE_MB` | Backend | Upload size limit (default 15). |
| `VITE_API_URL` | Frontend | Backend's public URL. Baked at build time. |

---

## 9. Security Model

| Concern | How It's Handled |
|---|---|
| **Password storage** | bcrypt one-way hash. Never stored or returned in plaintext. |
| **Authentication** | JWT (HS256) signed with SECRET_KEY. 24h expiry. Sent as `Authorization: Bearer <token>`. |
| **Authorization** | Every protected route uses `Depends(get_current_user)`. |
| **Data isolation** | Every DB query filters by `owner_id == current_user.id`. A user cannot access another user's subjects, notes, or history. The `_get_owned_note` / `_get_owned_subject` helpers enforce this. |
| **Input validation** | Pydantic schemas validate every request body (email format, min/max lengths, numeric ranges). Invalid input → 422 before handler runs. |
| **File upload safety** | Extension whitelist (pdf/txt/docx only), size cap (15MB), extracted text checked for emptiness. |
| **CORS** | Only configured origins can call the API. |
| **Secrets** | All secrets in `.env`, loaded via pydantic-settings. Never hardcoded. |

**Known limitations (honest for interviews):**
- No token refresh flow — when the 24h token expires, the user must log in again.
- No server-side token revocation (logout only clears client-side storage).
- `SECRET_KEY` has an insecure default; if not set in production, JWTs are signed with a known key.
- No rate limiting on AI endpoints (each call costs Groq tokens).

---

## 10. Design Decisions & Trade-offs

| Decision | Chosen | Alternative Considered | Why |
|---|---|---|---|
| Database | SQLite | PostgreSQL | Zero-config, single-file, fine for single-user scale. Postgres is better for concurrency + persistence in real prod. |
| Migrations | `create_all` on startup | Alembic | Simple for greenfield; acceptable because schema rarely changes. Alembic is the right choice for evolving schemas. |
| AI calls | Synchronous | Job queue (Celery/RQ) | LLM calls take seconds, not minutes. A queue adds complexity (Redis, worker, polling) for no real benefit yet. |
| Summary caching | `NoteSummary` table (one-to-one) | Regenerate every time | Saves Groq API calls; summary doesn't change unless the note changes. |
| History storage | JSON string in `Text` column | Separate tables per type | Flexible and simple; a quiz, a Q&A, and a study plan all fit in one table. Trade-off: not queryable by content fields. |
| Note text storage | Inline in DB (`extracted_text`) | File on disk only | Lets AI features run without re-parsing the file. Trade-off: duplicates storage. |
| Frontend state | React Context + localStorage | Redux/Zustand | App state is simple (auth + theme). Context is sufficient. Redux would be over-engineering. |
| Token storage | localStorage | HttpOnly cookie | localStorage is simple and works for SPAs. HttpOnly cookies are more XSS-resistant but add CSRF complexity. |
| JSON parsing | Regex fallback after `json.loads` | Trust model output | LLMs sometimes wrap JSON in fences or add prose. The fallback handles this gracefully. |

---

## 11. Interview Q&A Cheat Sheet

**Q: Walk me through the architecture.**
A: It's a two-tier app. The frontend is a React SPA (Vite + Tailwind) deployed
as a static site on Vercel. The backend is a FastAPI REST API running in a
Docker container, talking to a SQLite database and the Groq LLM API. The
frontend calls the backend over REST with JWT auth. Every AI feature sends the
student's note text to Groq with a strict JSON-output prompt, and the backend
parses and validates the response before returning it.

**Q: How does authentication work?**
A: On register/login, the backend hashes the password with bcrypt and issues
a JWT signed with HS256. The token contains the user ID as `sub` and an expiry
(24h). The frontend stores it in localStorage and attaches it as a Bearer
header on every request via an Axios interceptor. On the backend, every
protected endpoint uses `Depends(get_current_user)`, which decodes the JWT and
loads the user from the DB. A 401 interceptor on the frontend handles expired
tokens by clearing storage and redirecting to login.

**Q: How do you prevent users from accessing each other's data?**
A: Every database query filters by `owner_id == current_user.id`. I have
helper functions like `_get_owned_note` that fetch a note by ID **and** owner.
If the note exists but belongs to another user, the query returns None and the
endpoint returns 404. There's no admin role or shared data — everything is
strictly per-user.

**Q: How does the AI not hallucinate?**
A: Two mechanisms. First, every prompt includes the note text and instructs
the model to answer only from it. For Q&A specifically, the prompt asks the
model to set a `grounded` boolean. If the model says `grounded: false`, the
server overrides the answer with a fixed fallback string — even if the model
wrote an answer anyway. Second, I cap the note text at 12,000 characters with
`_truncate` to stay within context limits, which keeps the model focused on
the actual note content.

**Q: How do you handle LLM responses that aren't valid JSON?**
A: I use Groq's `response_format={"type": "json_object"}` to constrain output
to JSON. Then `_extract_json` strips markdown code fences, tries
`json.loads`, and if that fails, regex-extracts the first JSON object/array and
retries. If all parsing fails, I return a 502 with a friendly message. The
user never sees a raw parse error.

**Q: Why FastAPI?**
A: Three reasons: it auto-generates Swagger docs at `/docs` (great for dev and
for showing the API in an interview), it uses Pydantic for type-safe validation
so I define schemas once and get both validation and serialization, and it's
async-native which is a good fit if I later add streaming AI responses.

**Q: Why SQLite and not Postgres?**
A: For a single-user-scale app, SQLite is zero-config — no separate database
server, the entire DB is one file, and it deploys trivially. The trade-off is
concurrency (single writer) and persistence on container platforms (the file
resets on restart unless you mount a volume). If I were scaling this up, I'd
switch to Postgres with Alembic migrations.

**Q: What does the Dockerfile do and why use Docker?**
A: Docker packages the app with all its dependencies into a reproducible image.
The Dockerfile starts from `python:3.11-slim`, installs build tools (needed
for PyMuPDF and bcrypt), installs Python requirements, copies the app, creates
a writable uploads directory, and runs uvicorn on port 7860 (HuggingFace
Spaces convention). I copy `requirements.txt` before the app code for layer
caching — so code changes don't invalidate the pip install cache. Docker
ensures the app runs identically in dev and production.

**Q: Why is `vercel.json` needed?**
A: Because it's a single-page app. React Router handles all paths client-side,
but if a user refreshes on `/dashboard`, the browser asks the server for that
path — which doesn't exist as a file. The rewrite rule sends all requests to
`index.html`, and React Router renders the right page. Without it, any direct
navigation or refresh on a non-root path returns a 404.

**Q: How does CORS work in this app?**
A: The frontend is served from a Vercel domain, but API calls go to the
backend on a different domain — that's a cross-origin request. Browsers block
cross-origin requests unless the backend explicitly allows the origin. The
backend has `CORSMiddleware` that reads `CORS_ORIGINS` from `.env` and sends
the right `Access-Control-Allow-Origin` header. If I forget to add the
frontend URL to that list, every API call fails with a CORS error.

**Q: How would you scale this for production?**
A: Switch SQLite to Postgres with Alembic migrations and a persistent volume.
Add rate limiting on AI endpoints to control Groq costs. Add a token refresh
flow. Move AI generation to a job queue if response times grow. Add tests
(there are none currently). Add streaming for the chat feature so the user
sees the answer as it's generated.

**Q: What's the biggest weakness of this app?**
A: The lack of tests — there's no pytest suite or frontend tests, only ESLint.
For a production app I'd add unit tests for the AI JSON parsing and file
extraction, and integration tests for the auth + ownership flow. The second
weakness is no rate limiting on AI endpoints, which directly incurs LLM API
costs.

---

## 12. Local Setup & Deployment Walkthrough

### 12.1 Local Development

**Prerequisites:** Python 3.11+, Node.js 18+, a Groq API key.

**Backend:**
```bash
cd backend
python -m venv ../.venv
# Windows:  ..\.venv\Scripts\Activate.ps1
# macOS:    source ../.venv/bin/activate
pip install -r requirements.txt

# Create .env (see backend/.env template above):
#   SECRET_KEY=<random string>
#   GROQ_API_KEY=<your key from console.groq.com>
#   CORS_ORIGINS=http://localhost:5173

python -m uvicorn app.main:app --reload --port 8000
```
API docs at `http://localhost:8000/docs`.

**Frontend (new terminal):**
```bash
cd frontend
npm install

# Create .env:
#   VITE_API_URL=http://localhost:8000

npm run dev
```
App at `http://localhost:5173`.

**Important:** after changing `.env`, restart the server (uvicorn's `--reload`
watches Python files, not `.env`, and settings are cached via `lru_cache`).

### 12.2 Production Deployment

**Frontend → Vercel:**
1. Push repo to GitHub.
2. On Vercel: import repo, set root directory to `frontend`.
3. Set env var `VITE_API_URL` = your backend's public URL.
4. Deploy. You get `https://<project>.vercel.app`.

**Backend → Railway (or Render / HuggingFace Spaces):**
1. On Railway: new project from GitHub repo, set root to `backend`.
2. Railway detects the Dockerfile and builds it.
3. Set env vars: `SECRET_KEY`, `GROQ_API_KEY`, `CORS_ORIGINS` (your Vercel URL).
4. Deploy. You get `https://<app>.up.railway.app`.
5. For persistence: attach a persistent volume to `/app` so `study_assistant.db`
   survives restarts, or set `DATABASE_URL` to a managed Postgres.

**Connect them:**
1. Copy the backend URL into `VITE_API_URL` on Vercel. Redeploy frontend.
2. Copy the Vercel URL into `CORS_ORIGINS` on Railway. Redeploy backend.
3. Done. The frontend now talks to the backend over HTTPS.

---

*This document was reverse-engineered from the actual source code. Every
architecture decision, prompt design, and deployment step above corresponds to
real code in this repository.*
