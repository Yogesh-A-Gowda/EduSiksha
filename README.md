# EduGuard

EduGuard is a child-safe AI tutoring platform. Kids chat with an AI tutor that answers only school-subject questions, can read uploaded study materials (PDFs, Word docs, images, Excel sheets, PowerPoints), and gives context-aware answers. Parents get a dashboard with session analytics, mastery scores, and AI-generated practice papers.

---

## Features

- **Kid chat** — Real-time AI tutor via Socket.IO, restricted to educational topics
- **Document Q&A** — Upload study files; the AI uses them as context (RAG). Supports English, Hindi, and Kannada OCR.
- **Parent dashboard** — Session analytics, mastery scores, multilingual summaries (English / Hindi / Kannada)
- **Practice papers** — AI-generated question paper + answer key PDF per session
- **Guardrails** — Off-topic queries are intercepted before reaching the LLM
- **Subscriptions** — Razorpay payment integration (INR)
- **Secure auth** — JWT stored in httpOnly cookies (not localStorage); server-side route protection via Next.js middleware

---

## Running locally (without Docker)

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.10+ | |
| Node.js | 18+ | |
| PostgreSQL | 14+ | Must have the **pgvector** extension installed |
| Tesseract OCR | 5+ | Windows: install from [UB Mannheim builds](https://github.com/UB-Mannheim/tesseract/wiki) |
| Poppler | — | Windows: download and add `bin/` to PATH; needed for scanned PDF support |

#### Install pgvector

```sql
-- Run in psql after creating your database
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Install Tesseract language packs (Hindi + Kannada OCR)

**Windows:** During Tesseract installation, check **Hindi** and **Kannada** under "Additional language data" in the installer, or download `hin.traineddata` and `kan.traineddata` from the [tessdata repo](https://github.com/tesseract-ocr/tessdata) and place them in your Tesseract `tessdata/` folder.

**Linux:**
```bash
sudo apt-get install tesseract-ocr-hin tesseract-ocr-kan
```

**Mac:**
```bash
brew install tesseract-lang
```

---

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / Mac

# Install dependencies
pip install -r requirements.txt

# Create the environment file
copy .env.example .env       # Windows
# cp .env.example .env       # Linux / Mac
# Edit .env and fill in the required values (see Configuration section below)

# Install Alembic (first time only — then pin the version: pip freeze | grep alembic)
pip install alembic

# New deployment — run migrations to create all tables
alembic upgrade head

# (Existing deployment — tables already exist) Mark the baseline as applied without touching the DB
# alembic stamp head

# (Once, after tables are created) Create the HNSW vector index for fast similarity search
python create_vector_index.py

# Start the development server
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

---

### 2. Frontend

```bash
cd frontend

npm install

# Create the environment file
copy .env.local.example .env.local   # Windows
# cp .env.local.example .env.local   # Linux / Mac
# Default contents: NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

Visit `http://localhost:3000`.

---

## Running with Docker

Docker handles PostgreSQL (with pgvector), the backend (including Tesseract with Hindi/Kannada packs), and the frontend in one command.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

### Start everything

```bash
# From the project root (where docker-compose.yml lives)
docker compose up --build
```

First build takes a few minutes (downloads Python/Node images and installs dependencies). Subsequent starts are fast.

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

### One-time setup after first start

```bash
# Run database migrations (creates all tables on a fresh DB)
docker compose exec backend alembic upgrade head

# Create the HNSW vector index (run once; makes similarity search fast at scale)
docker compose exec backend python create_vector_index.py
```

### Stop

```bash
docker compose down          # stops containers, keeps database volume
docker compose down -v       # stops containers AND deletes database volume (fresh start)
```

### Rebuild after code changes

```bash
docker compose up --build
```

---

## Configuration

### Backend — `backend/.env`

Copy `backend/.env.example` and fill in the values:

```ini
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eduguard

# JWT — generate a secure key: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=replace_this_with_a_secure_random_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080   # 7 days; token is stored in httpOnly cookie

# Cookie security — set to true in production (requires HTTPS)
COOKIE_SECURE=false

# CORS — comma-separated list of allowed frontend origins
CORS_ORIGINS=http://localhost:3000

# Groq API (required for AI chat, analytics, and PDF generation)
# Get a free key at https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# Razorpay (required for subscription payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# RAG tuning (optional — defaults shown)
RAG_DISTANCE_THRESHOLD=0.5   # chunks with cosine distance >= this are ignored as irrelevant
RAG_TOP_K=2                  # max number of document chunks injected per response
```

> **Docker note:** `DATABASE_URL` is overridden in `docker-compose.yml` to point at the `db` service. You do not need to change it for local Docker use.

### Frontend — `frontend/.env.local`

```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Change this to your backend's public HTTPS URL when deploying to production.

---

## How authentication works

JWT tokens are stored in **httpOnly cookies**, not `localStorage`. This means:

- The token is invisible to JavaScript — XSS attacks cannot steal it.
- The browser sends it automatically on every HTTP request and WebSocket upgrade.
- `localStorage` holds only non-sensitive identity info (`user_id`, `user_type`) for client-side routing checks.
- Next.js middleware reads the cookie server-side and enforces role-based route access before pages load.
- Logout calls `POST /auth/logout` which clears the cookie server-side.
- Set `COOKIE_SECURE=true` in production (cookie will only be sent over HTTPS).

---

## Production deployment checklist

- [ ] **Rotate credentials immediately** — if `backend/.env` was ever committed to git or used to build a Docker image before `.dockerignore` was added, treat the Neon DB password, Groq key, and Razorpay secret as compromised. Rotate them in their respective dashboards before deploying.
- [ ] Set `SECRET_KEY` to a cryptographically random value: `python -c "import secrets; print(secrets.token_hex(32))"`
- [ ] Set `COOKIE_SECURE=true` (requires HTTPS — put nginx or Cloudflare in front)
- [ ] Set `CORS_ORIGINS` to your actual frontend domain
- [ ] Set `GROQ_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- [ ] Run `create_vector_index.py` once after DB creation
- [ ] Mount `uploads/` and `static/reports/` on a persistent volume (already wired in `docker-compose.yml`)
- [ ] Set `NEXT_PUBLIC_API_URL` to the backend's public HTTPS URL before building the frontend image
- [ ] Confirm `.env` and `.env.local` are in `.gitignore` and not in git history

---

## Project structure

```
EduGuard/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (auth, chat, data, payment)
│   │   ├── core/         # JWT, rate limiting, structured logging
│   │   ├── db/           # SQLAlchemy engine (connection pooled), ORM models
│   │   └── services/     # AI/RAG, document processing, PDF generation, WebSocket
│   ├── create_vector_index.py   # Run once after DB creation (HNSW index)
│   ├── init_db.py               # Creates tables and enables pgvector extension
│   ├── gunicorn.conf.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # SocketProvider (WebSocket context)
│   ├── lib/              # Axios client (withCredentials), i18n helpers
│   ├── middleware.ts      # Server-side cookie-based route protection
│   ├── Dockerfile
│   └── next.config.ts
├── docker-compose.yml
└── EDU_GUARD_ARCHITECTURAL_GUIDE.md   # Full technical reference
```

For a deep-dive into how every component works, see **[EDU_GUARD_ARCHITECTURAL_GUIDE.md](EDU_GUARD_ARCHITECTURAL_GUIDE.md)**.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI, Gunicorn + Uvicorn workers |
| Real-time | Socket.IO (python-socketio + socket.io-client) |
| Database | PostgreSQL 16 + pgvector |
| Embeddings | SentenceTransformer `all-mpnet-base-v2` (local, CPU) |
| LLM | Groq API — Llama 3.3 70B |
| Payments | Razorpay |
| Auth | JWT in httpOnly cookies, Argon2 password hashing |
| OCR | Tesseract (eng + hin + kan) + pdfplumber + pdf2image |
| Rate limiting | slowapi (per-IP) |
