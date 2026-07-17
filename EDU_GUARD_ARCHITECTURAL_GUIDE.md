# EduGuard — Complete Technical Architecture Guide

> Last updated: June 2026. Reflects all production hardening applied in this session including socket authentication, RAG scoping, connection pooling, rate limiting, structured logging, background file processing, and Docker deployment.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Repository Layout](#2-repository-layout)
3. [Database Layer](#3-database-layer)
4. [Authentication & Security Model](#4-authentication--security-model)
5. [Document Processing Pipeline](#5-document-processing-pipeline)
6. [RAG (Retrieval-Augmented Generation)](#6-rag-retrieval-augmented-generation)
7. [Real-Time Chat — WebSocket Layer](#7-real-time-chat--websocket-layer)
8. [REST API Endpoints](#8-rest-api-endpoints)
9. [Analytics & PDF Report Generation](#9-analytics--pdf-report-generation)
10. [Payment Integration (Razorpay)](#10-payment-integration-razorpay)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Logging & Observability](#13-logging--observability)
14. [Configuration Reference](#14-configuration-reference)
15. [End-to-End Data Flows](#15-end-to-end-data-flows)
16. [Known Limitations & Future Work](#16-known-limitations--future-work)

---

## 1. System Overview

EduGuard is a child-safe AI tutoring platform. Parents create accounts, add child profiles, and manage access. Children interact with an AI tutor via a real-time chat interface, uploading their study materials (PDFs, images, Word docs, Excel sheets, PowerPoints) for context-aware Q&A. Parents review session analytics and download AI-generated practice papers.

### Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Next.js Frontend  (port 3000)                                          │
│  - Chat UI (kids)          - Dashboard (parents)                        │
│  - Socket.IO client        - Axios REST client (JWT Bearer)             │
└────────────────────────┬────────────────────────────────────────────────┘
                         │  HTTP + WebSocket
┌────────────────────────▼────────────────────────────────────────────────┐
│  FastAPI + Socket.IO ASGI App  (port 8000)                              │
│  Served by Gunicorn (uvicorn.workers.UvicornWorker, cpu_count×2)        │
│                                                                          │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  auth.py     │  │  data.py       │  │  chat.py   │  │ payment.py │  │
│  │  JWT login   │  │  dashboard     │  │  upload    │  │ Razorpay   │  │
│  │  signup      │  │  history       │  │  (async)   │  │ orders     │  │
│  └──────────────┘  └────────────────┘  └────────────┘  └────────────┘  │
│                                                                          │
│  ┌─────────────────────────┐   ┌──────────────────────────────────────┐ │
│  │  websocket.py           │   │  ai.py                               │ │
│  │  Socket.IO server       │   │  SentenceTransformer (all-mpnet-v2)  │ │
│  │  JWT connect auth       │   │  RAG query (kid-scoped)              │ │
│  │  chat_message handler   │   │  Groq llama-3.3-70b-versatile        │ │
│  └─────────────────────────┘   └──────────────────────────────────────┘ │
└──────────────┬─────────────────────────────────┬───────────────────────┘
               │ SQLAlchemy (pool_size=10)        │ HTTPS
┌──────────────▼──────────────┐    ┌─────────────▼──────────┐
│  PostgreSQL 16 + pgvector   │    │  Groq Cloud API        │
│  - Connection pool (10+20)  │    │  llama-3.3-70b         │
│  - HNSW index on embeddings │    └────────────────────────┘
│  6 tables, JSONB analytics  │
└─────────────────────────────┘
```

### Technology stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend framework | FastAPI (Python), Uvicorn ASGI, Gunicorn |
| Real-time | python-socketio (AsyncServer), socket.io-client v4 |
| Database | PostgreSQL 16 + pgvector extension |
| ORM | SQLAlchemy (sync, connection-pooled) |
| Embeddings | SentenceTransformer `all-mpnet-base-v2` (768-dim, local CPU) |
| LLM | Groq API — `llama-3.3-70b-versatile` |
| Auth | JWT (python-jose), Argon2 password hashing (passlib) |
| OCR | Tesseract (pytesseract), pdf2image, pdfplumber |
| Document formats | PDF, DOCX, XLSX, PPTX, TXT, PNG/JPG/TIFF |
| Payments | Razorpay (INR) |
| PDF generation | ReportLab |
| Rate limiting | slowapi (per-IP, per-endpoint) |
| Container | Docker, docker-compose |
| i18n | English, Hindi, Kannada |

---

## 2. Repository Layout

```
EduGuard/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py          # JWT login/signup for parents and kids
│   │   │   ├── chat.py          # File upload endpoint (auth + background processing)
│   │   │   ├── data.py          # Dashboard, chat history, analytics endpoints
│   │   │   ├── payment.py       # Razorpay order creation and verification
│   │   │   └── decrypt.py       # Dev utility — generates Argon2 password hashes
│   │   ├── core/
│   │   │   ├── logger.py        # Structured logging (get_logger factory)
│   │   │   ├── rate_limit.py    # slowapi Limiter singleton
│   │   │   └── security.py      # JWT creation, password hashing helpers
│   │   ├── db/
│   │   │   ├── base.py          # SQLAlchemy engine (connection pooled), SessionLocal
│   │   │   └── models.py        # ORM models: User, Kid, ChatSession, Message, Document, ChatAnalytics
│   │   ├── services/
│   │   │   ├── ai.py            # Embedding model, RAG query, Groq call, file cleanup
│   │   │   ├── document_processor.py  # OCR + text extraction for all supported formats
│   │   │   ├── pdf_generator.py       # ReportLab practice paper generator
│   │   │   ├── payment.py             # Razorpay client wrapper
│   │   │   └── websocket.py           # Socket.IO server, JWT auth, chat handler
│   │   └── main.py              # App factory, CORS, rate limiter, startup task
│   ├── create_vector_index.py   # One-time HNSW index migration (run after DB creation)
│   ├── gunicorn.conf.py         # Gunicorn worker config
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── login/page.tsx       # Auth forms (parent + kid tabs)
│   │   ├── signup/page.tsx      # Parent registration
│   │   ├── chat/page.tsx        # Kid chat UI
│   │   └── dashboard/
│   │       ├── layout.tsx       # Parent auth guard + layout
│   │       ├── page.tsx         # Kids list + access toggles
│   │       ├── kid/[id]/page.tsx         # Per-kid activity view
│   │       └── chat/[id]/page.tsx        # Session inspector + report download
│   ├── components/
│   │   └── SocketProvider.tsx   # Socket.IO client context (passes JWT auth token)
│   ├── lib/
│   │   ├── api.ts               # Axios instance (Bearer token injected automatically)
│   │   └── i18n.ts              # Translation strings (English / Hindi / Kannada)
│   ├── middleware.ts             # Next.js route guard (redirects unauthenticated users)
│   ├── .env.local               # NEXT_PUBLIC_API_URL (not committed to git)
│   ├── next.config.ts           # output: standalone (for Docker)
│   └── Dockerfile
└── docker-compose.yml           # PostgreSQL + pgvector, backend, frontend
```

---

## 3. Database Layer

### Connection pool — `backend/app/db/base.py`

```python
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=10,        # steady-state connections kept open
    max_overflow=20,     # burst headroom (total max = 30)
    pool_pre_ping=True,  # test connection liveness before use
    pool_recycle=1800,   # recycle connections every 30 min to avoid stale sockets
)
```

The `get_db()` generator yields a session per request and always closes it in the `finally` block. WebSocket handlers create their own sessions via `SessionLocal()` directly (not through the generator) and close them in a `try/finally`.

### Schema — `backend/app/db/models.py`

```
users
  id          PK
  email       UNIQUE
  phone       nullable
  password_hash (Argon2)
  created_at

kids
  id          PK
  parent_id   FK → users.id
  username    UNIQUE
  password_hash (Argon2)
  subscription_status   BOOLEAN
  subscription_expiry   nullable
  is_active_access      BOOLEAN   ← parental toggle for chat access
  created_at

chat_sessions
  id          PK
  kid_id      FK → kids.id
  title       (first 30 chars of opening message)
  created_at
  expires_at  nullable
  is_active   BOOLEAN

messages
  id          PK
  session_id  FK → chat_sessions.id
  role        'user' | 'ai'
  content     TEXT
  timestamp

documents
  id          PK
  session_id  FK → chat_sessions.id
  file_path   (disk path in uploads/)
  file_name
  content     TEXT   ← one chunk of extracted text
  embedding   Vector(768)   ← pgvector column
  created_at
  is_active   BOOLEAN   ← set False after 15 days

chat_analytics
  id          PK
  session_id  FK → chat_sessions.id  UNIQUE
  mastery_score  INT (0–100)
  topics      JSONB   ← array of 5 topic strings
  summary     TEXT
  language    STRING  ← English | Hindi | Kannada
  last_updated
```

### HNSW vector index

After first DB creation, run once:

```bash
cd backend
python create_vector_index.py
```

This creates a non-blocking HNSW index on `documents.embedding` using cosine ops (`m=16, ef_construction=64`). Without it the RAG query is a full table scan. With it, lookup is O(log n).

---

## 4. Authentication & Security Model

### Two user types

EduGuard has two distinct principals with separate login flows:

| Type | Login endpoint | JWT `type` claim | Primary scope |
|---|---|---|---|
| Parent | `POST /auth/parent/login` | `"parent"` | Dashboard, kid management, analytics |
| Kid | `POST /auth/kid/login` | `"kid"` | Chat interface only |

### JWT structure

```json
{
  "sub": "<email or username>",
  "type": "parent" | "kid",
  "id": <integer user or kid id>,
  "exp": <unix timestamp>
}
```

Tokens expire in 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES` env var). Signed with HS256 using `SECRET_KEY`.

### Route protection

FastAPI dependencies `get_current_user_id` and `get_current_kid_id` in `auth.py` decode the Bearer token from the `Authorization` header and enforce the `type` claim. If the token is missing, expired, or has the wrong type, a `401` is returned.

### Socket.IO authentication

This is enforced at connection time, not message time.

**Frontend** (`SocketProvider.tsx`):
```typescript
io(API_URL, { auth: { token: localStorage.getItem('token') } })
```

**Backend** (`websocket.py`):
```python
@sio.event
async def connect(sid, environ, auth):
    payload = jwt.decode(auth['token'], SECRET_KEY, algorithms=[ALGORITHM])
    kid_id  = payload.get("id")
    type_   = payload.get("type")
    if not kid_id or type_ != "kid":
        return False          # connection rejected
    authenticated_kids[sid] = kid_id   # server-side mapping: sid → kid_id
```

The `chat_message` handler reads `kid_id = authenticated_kids.get(sid)` — client-supplied `kid_id` fields in the payload are ignored. A connection with no token, an expired token, or a parent token is rejected before the handshake completes.

### Rate limiting

Login endpoints are capped at **10 requests/minute per IP** via `slowapi`:

```python
@router.post("/parent/login")
@limiter.limit("10/minute")
def login_parent(request: Request, ...):
```

The upload endpoint is capped at **5 requests/minute per IP**.

The `Limiter` singleton lives in `core/rate_limit.py` and is registered on the FastAPI app in `main.py`. A `429 Too Many Requests` response is returned automatically on breach.

### CORS

Origins are read from the `CORS_ORIGINS` environment variable (comma-separated):

```python
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")
```

For production set `CORS_ORIGINS=https://app.eduguard.com`. Methods are locked to `GET, POST, PUT, DELETE` — not wildcard.

### Password hashing

Argon2 via `passlib[argon2]`. `CryptContext(schemes=["argon2"], deprecated="auto")`. All password comparisons go through `verify_password()` in `core/security.py`.

### Data isolation

The RAG query in `ai.py` is scoped to the requesting kid's own documents by joining through `ChatSession`:

```python
db.query(Document)
  .join(ChatSession, Document.session_id == ChatSession.id)
  .filter(ChatSession.kid_id == kid_id, Document.is_active == True)
  .order_by(Document.embedding.cosine_distance(query_vec))
  .limit(2)
```

A kid can never receive document context from another kid's sessions.

---

## 5. Document Processing Pipeline

### Upload flow

1. `POST /chat/upload` receives a multipart file + `session_id` form field.
2. The endpoint verifies the JWT and checks that `session_id` belongs to the authenticated kid (403 otherwise).
3. The file is saved to `uploads/<timestamp>_<filename>`.
4. A FastAPI `BackgroundTask` is queued — the HTTP response returns `{"status": "processing"}` immediately.
5. In the background, `_run_processing(file_path, session_id)` opens its own DB session and calls `process_file_upload()`.

### Text extraction — `document_processor.py`

| File type | Extractor |
|---|---|
| `.png` `.jpg` `.jpeg` `.bmp` `.tiff` | Tesseract OCR (`pytesseract`, English) |
| `.pdf` | `pdfplumber` text extraction; falls back to `pdf2image` + Tesseract OCR if extracted text < 100 chars (scanned PDF) |
| `.xlsx` `.xls` | `pandas.read_excel` — all sheets converted to string tables |
| `.pptx` | `python-pptx` — slide titles and all shape text |
| `.docx` | `python-docx` — paragraphs + table cells |
| `.txt` | Direct `open().read()` |

### Chunking — `smart_chunk()`

After extraction, text is split into ~500-character chunks with a 50-character overlap. The algorithm:

1. Split on `\n\n` (paragraph boundaries first).
2. If a paragraph fits in the current chunk, append it.
3. If it doesn't fit, flush the current chunk and start a new one seeded with the last `overlap` words of the previous chunk.
4. If a single paragraph exceeds 500 characters, split further on `. ` (sentence boundaries). Force-split at 500 chars if a single sentence is still too long.

### Embedding and storage — `ai.py`

Each chunk is encoded by `SentenceTransformer('all-mpnet-base-v2')` into a 768-dimensional float vector. A `Document` row is inserted for each chunk with:
- `session_id` — ownership anchor
- `content` — the chunk text
- `embedding` — the pgvector column
- `is_active = True`

### Cleanup

A daily background `asyncio` task in `main.py` calls `cleanup_expired_files()`. Documents older than 15 days have their disk file deleted, `embedding` set to `None`, and `is_active` set to `False`. This is a child privacy measure.

---

## 6. RAG (Retrieval-Augmented Generation)

### `generate_response(kid_id, message, chat_history, db)` — `ai.py`

**Step 1 — Embed the query**
```python
query_vec = embed_model.encode(message).tolist()
```
The same `all-mpnet-base-v2` model used at index time is used at query time, ensuring vector space alignment.

**Step 2 — Scoped cosine similarity search**
```python
results = (
    db.query(Document)
    .join(ChatSession, Document.session_id == ChatSession.id)
    .filter(ChatSession.kid_id == kid_id, Document.is_active == True)
    .order_by(Document.embedding.cosine_distance(query_vec))
    .limit(2)
    .all()
)
```
The HNSW index (when created) handles this efficiently. Without it, pgvector falls back to a sequential scan.

**Step 3 — Prompt assembly**
```
[system] GUARDRAIL_PROMPT (educational scope enforcement)
[system] "Use this context to answer if relevant:\n<top 2 chunks>"
[user/ai] ... last 20 messages of chat history ...
[user] <current message>
```

**Step 4 — Groq call**
Model: `llama-3.3-70b-versatile`, temperature `0.5`, max tokens `500`.

**GUARDRAIL_PROMPT** restricts responses to school subjects. Off-topic queries (entertainment, illicit content) receive a canned redirect. Code is wrapped in code blocks.

---

## 7. Real-Time Chat — WebSocket Layer

### Connection lifecycle — `websocket.py`

```
Frontend                              Backend (websocket.py)
   │                                        │
   │  io(url, { auth: { token } })          │
   │ ──────────────────────────────────────>│
   │                                        │  jwt.decode(token) → kid_id
   │                                        │  authenticated_kids[sid] = kid_id
   │  connected ack                         │
   │ <──────────────────────────────────────│
   │                                        │
   │  emit('chat_message', {                │
   │    message: "...",                     │
   │    session_id: 123                     │
   │  })                                    │
   │ ──────────────────────────────────────>│
   │                                        │  kid_id = authenticated_kids[sid]
   │                                        │  verify session.kid_id == kid_id
   │                                        │  save user Message to DB
   │                                        │  fetch last 20 messages (context)
   │                                        │  generate_response(kid_id, ...)
   │                                        │  save AI Message to DB
   │  emit('response', {data, session_id})  │
   │ <──────────────────────────────────────│
```

### Session management

- If `session_id` is provided and belongs to the kid, messages are appended to that session.
- If `session_id` is `null` (new chat), a new `ChatSession` is created with `title = message[:30]`.
- The `disconnect` event removes the `sid` from `authenticated_kids`.

### Key invariants

- `kid_id` is **never** read from the client payload — only from the server-side `authenticated_kids` dict.
- Connections without a valid kid-type JWT are rejected at `connect` time (`return False`).
- Chat history fed to the LLM is capped at 20 messages to bound token cost.

---

## 8. REST API Endpoints

### Auth — `/auth`

| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | `/auth/parent/signup` | No | Register a parent account |
| POST | `/auth/parent/login` | No (rate: 10/min) | Parent JWT login |
| POST | `/auth/kid/create` | Parent JWT | Create a kid profile under this parent |
| POST | `/auth/kid/login` | No (rate: 10/min) | Kid JWT login |

### Chat — `/chat`

| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | `/chat/upload` | Kid JWT (rate: 5/min) | Upload a study file; triggers background OCR + embedding |

### Data — (no prefix)

| Method | Path | Auth required | Description |
|---|---|---|---|
| GET | `/parent/dashboard/kids` | Parent JWT | List all kids under this parent |
| GET | `/kid/chats` | Kid JWT | List this kid's chat sessions |
| GET | `/parent/kid/{kid_id}/chats` | Parent JWT | List a kid's sessions (ownership enforced) |
| GET | `/kid/chats/{chat_id}/messages` | Kid JWT | Paginated message history (`?limit=100&offset=0`) |
| GET | `/parent/chat/{chat_id}/stats` | — | AI-generated mastery score, topics, summary (cached) |
| POST | `/parent/chat/{chat_id}/stats/refresh` | — | Force-regenerate analytics cache |
| POST | `/reports/generate/{chat_id}` | — | Generate practice paper + answer key PDFs |

### Payment — `/payment`

| Method | Path | Auth required | Description |
|---|---|---|---|
| POST | `/payment/create-order` | Parent JWT | Create a Razorpay order (default 499 INR) |
| POST | `/payment/verify` | Parent JWT | Verify Razorpay HMAC signature post-payment |

### Utility

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Liveness probe for load balancers |
| GET | `/` | No | API status |
| GET | `/static/reports/{file}` | No | Serve generated PDFs |

---

## 9. Analytics & PDF Report Generation

### Session analytics — `data.py`

`GET /parent/chat/{chat_id}/stats` sends the session's student questions to Groq with a structured prompt requesting:

```json
{
  "mastery_score": 0-100,
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "summary": "Paragraph in requested language..."
}
```

Evaluation criteria: question quality, depth of inquiry, conceptual understanding. Results are cached in `chat_analytics` (unique per session). Re-calling the endpoint returns cached data unless `POST /stats/refresh` is called first or the language parameter changes.

Supported report languages: English, Hindi, Kannada (passed as `?language=Hindi`).

### Practice paper generation — `pdf_generator.py`

`POST /reports/generate/{chat_id}` sends the full chat history to Groq requesting 10–15 progressively harder questions. Two PDFs are generated via ReportLab:

- `static/reports/{chat_id}_qp.pdf` — question paper (no answers)
- `static/reports/{chat_id}_key.pdf` — answer key

Both are served as static files at `/static/reports/`.

---

## 10. Payment Integration (Razorpay)

`services/payment.py` wraps the Razorpay Python SDK:

- `create_order(amount, currency="INR")` — creates an order; amount is in paisa (499 INR = 49900 paisa).
- `verify_payment_signature(order_id, payment_id, signature)` — validates the HMAC-SHA256 signature sent by the Razorpay frontend widget to confirm the payment is authentic and untampered.

The `payment.py` API router requires a parent JWT on both endpoints. After successful payment verification, the subscribing kid's `subscription_status`, `subscription_expiry`, and `is_active_access` fields should be updated — this activation step is not yet implemented and is called out in [Known Limitations](#16-known-limitations--future-work).

---

## 11. Frontend Architecture

### Pages

**`app/page.tsx`** — Public landing page. Features list, pricing tiers, guardrail descriptions.

**`app/login/page.tsx`** — Tabbed login form (Parent / Kid). On success, stores `access_token` in `localStorage` under key `token` and stores `user_type` (`parent` or `kid`). Decodes the JWT client-side with `atob(token.split('.')[1])` to extract the user's `id`.

**`app/signup/page.tsx`** — Parent registration form, calls `POST /auth/parent/signup`.

**`app/chat/page.tsx`** — Kid chat interface.
- On mount: reads `token` from `localStorage`, decodes `kid_id`, fetches past sessions from `/kid/chats`.
- Sidebar: lists past sessions, "New Chat" button sets `activeChatId = null`.
- File attachment: sends `FormData` to `/chat/upload`, displays a "processing" status toast.
- Messages: sent via `socket.emit('chat_message', { message, session_id })`.
- Responses: received via `socket.on('response', handler)`.

**`app/dashboard/page.tsx`** — Parent dashboard. Loads `/parent/dashboard/kids`. Shows subscription badges, access toggle buttons, and links to each kid's detail page.

**`app/dashboard/kid/[id]/page.tsx`** — Per-kid activity. Lists chat sessions, total message counts, learning timeline.

**`app/dashboard/chat/[id]/page.tsx`** — Session inspector.
- Mastery score gauge.
- Subject topic breakdown cards.
- Multi-language AI summary (language selector triggers `/stats?language=...`).
- Transcript viewer showing the full chat log.
- "Generate Report" button → `POST /reports/generate/{id}` → downloads PDFs.

### Key frontend modules

**`components/SocketProvider.tsx`** — React Context Provider. Creates one Socket.IO connection per session, passing the JWT token in `auth`. Exposes the socket instance via `useSocket()` hook. Catches and logs `connect_error` events.

**`lib/api.ts`** — Axios instance. `baseURL` reads from `process.env.NEXT_PUBLIC_API_URL` (falls back to `http://localhost:8000`). A request interceptor injects `Authorization: Bearer <token>` from `localStorage` automatically on every call.

**`lib/i18n.ts`** — Simple translation dictionary. Used in the parent dashboard to display analytics summaries in English, Hindi, or Kannada.

**`middleware.ts`** — Next.js middleware that redirects unauthenticated requests away from protected routes. Because tokens are in `localStorage` (not cookies), the middleware cannot read them server-side; it handles basic route-level redirects only.

### Environment variables

`frontend/.env.local` (not committed to git):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
Change this to your production backend URL before building. The `NEXT_PUBLIC_` prefix makes it available in the browser bundle.

---

## 12. Infrastructure & Deployment

### Docker

```bash
# Build and start everything
docker compose up --build

# Run HNSW index migration (once, after first start)
docker compose exec backend python create_vector_index.py
```

**`docker-compose.yml`** brings up:

| Service | Image / Build | Exposes | Notes |
|---|---|---|---|
| `db` | `pgvector/pgvector:pg16` | 5432 | pgvector extension pre-installed; data on named volume `pgdata` |
| `backend` | `./backend/Dockerfile` | 8000 | Waits for `db` healthcheck; uploads + reports on named volumes |
| `frontend` | `./frontend/Dockerfile` | 3000 | Sets `NEXT_PUBLIC_API_URL=http://localhost:8000` |

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim
RUN apt-get install -y tesseract-ocr poppler-utils   # OCR system deps
COPY requirements.txt . && pip install -r requirements.txt
CMD ["gunicorn", "app.main:socket_app", "--config", "gunicorn.conf.py"]
```

### Gunicorn config — `gunicorn.conf.py`

```python
workers      = multiprocessing.cpu_count() * 2
worker_class = "uvicorn.workers.UvicornWorker"
bind         = "0.0.0.0:8000"
timeout      = 120   # OCR on large PDFs can be slow
```

Each Gunicorn worker is a full uvicorn ASGI process. Socket.IO connections are pinned to a worker for the duration of the session (no cross-worker state with the current in-memory `authenticated_kids` dict).

### Frontend Dockerfile

Multi-stage build: Node 20 builder → standalone Next.js output → minimal runtime image. `next.config.ts` sets `output: "standalone"`.

### Non-Docker local dev

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Production deployment checklist

- [ ] Set `SECRET_KEY` to a cryptographically random 32-byte hex string
- [ ] Set `CORS_ORIGINS` to your actual frontend domain
- [ ] Set `GROQ_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- [ ] Run `create_vector_index.py` once after DB creation
- [ ] Put a TLS-terminating reverse proxy (nginx / Cloudflare) in front of port 8000
- [ ] Store `uploads/` and `static/reports/` on persistent volume (not container ephemeral storage)
- [ ] Set `NEXT_PUBLIC_API_URL` to the backend's public HTTPS URL before building the frontend image

---

## 13. Logging & Observability

### Structured logging — `core/logger.py`

All modules use `get_logger(__name__)` which returns a `logging.Logger` writing to stdout in the format:

```
2026-06-18T14:32:01 INFO app.services.websocket: Kid 42 connected: abc123
2026-06-18T14:32:05 INFO app.services.ai: Processed 14 chunks from uploads/1718718725.1_notes.pdf
2026-06-18T14:32:10 ERROR app.services.ai: Groq API error: Connection timeout
```

`logger.exception()` is used in catch blocks — this logs the full traceback alongside the message.

### Health endpoint

`GET /health` returns `{"status": "ok"}`. Wire this to your load balancer or container health probe.

### What is not yet instrumented

- No distributed tracing (OpenTelemetry / Jaeger)
- No metrics export (Prometheus)
- No APM integration (Sentry, Datadog)
- No request ID propagation across the WebSocket → DB → Groq call chain

---

## 14. Configuration Reference

All backend configuration is via environment variables, loaded from `backend/.env` by `python-dotenv`.

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/eduguard` | PostgreSQL connection string |
| `SECRET_KEY` | `replace_this_with_a_secure_random_key` | **Change this in production** |
| `ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT TTL |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:8000` | Comma-separated allowed origins |
| `GROQ_API_KEY` | — | Required for LLM + analytics + PDF generation |
| `RAZORPAY_KEY_ID` | — | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | — | Razorpay secret (used for HMAC verification) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Retained from earlier dev iteration; not actively used |

Frontend variable (in `frontend/.env.local`):

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL; baked into browser bundle at build time |

---

## 15. End-to-End Data Flows

### A. Kid uploads a study file and asks a question

```
Kid browser
  │
  ├─ 1. POST /chat/upload  (multipart, JWT in header)
  │       backend: verify JWT → verify session ownership → save file to disk
  │       background task: extract text → chunk → embed → INSERT Document rows
  │       response: { "status": "processing" }  ← returns immediately
  │
  ├─ 2. socket.emit('chat_message', { message: "Explain photosynthesis", session_id: 42 })
  │       backend: kid_id from authenticated_kids[sid]
  │                verify session 42 belongs to kid
  │                INSERT Message(role='user')
  │                fetch last 20 messages
  │                embed query → cosine search Documents WHERE kid owns session
  │                assemble prompt → Groq API
  │                INSERT Message(role='ai')
  │       socket.emit('response', { data: "...", session_id: 42 })
  │
  └─ 3. Kid sees AI answer in UI
```

### B. Parent views session analytics

```
Parent browser
  │
  ├─ GET /parent/chat/42/stats
  │       backend: check ChatAnalytics cache for session 42
  │       if cached and same language → return cached
  │       else: SELECT messages WHERE session_id=42
  │             send student questions to Groq → JSON {mastery_score, topics, summary}
  │             UPSERT ChatAnalytics
  │             return response
  │
  ├─ POST /reports/generate/42
  │       backend: SELECT all messages for session 42
  │               send to Groq → JSON array of 10-15 Q&A pairs
  │               write static/reports/42_qp.pdf (no answers)
  │               write static/reports/42_key.pdf (with answers)
  │               return { qp_url, key_url }
  │
  └─ Parent downloads PDFs from /static/reports/42_qp.pdf
```

### C. Parent subscribes

```
Parent browser
  │
  ├─ POST /payment/create-order  (amount=49900)
  │       backend: Razorpay.order.create → returns { order_id, amount, key_id }
  │
  ├─ Razorpay checkout widget runs in browser
  │       user completes payment
  │       Razorpay returns { order_id, payment_id, signature }
  │
  ├─ POST /payment/verify  (order_id, payment_id, signature)
  │       backend: HMAC-SHA256 verification via Razorpay SDK
  │       returns { "status": "success" }
  │
  └─ (TODO) update kid.subscription_status, is_active_access in DB
```

---

## 16. Known Limitations & Future Work

### Immediate / high priority

**Payment activation not wired up.** `POST /payment/verify` confirms the payment signature but does not update `kid.subscription_status` or `kid.is_active_access`. Subscriptions never activate. This needs a DB write after successful verification.

**Socket.IO CORS is still wildcard.** `cors_allowed_origins='*'` in the `AsyncServer` constructor. Should be changed to the same `CORS_ORIGINS` env var as the FastAPI middleware.

**Upload endpoint returns no completion signal.** The background task finishes asynchronously; the frontend has no way to know when indexing is done (no polling endpoint or WebSocket event). Until a completion signal is added, there can be a window where a kid asks about a file that hasn't been indexed yet.

**`/parent/chat/{chat_id}/stats` has no parent ownership check.** Any authenticated user (parent or kid, via direct API call) can retrieve analytics for any `chat_id`. Should filter by `ChatSession.kid.parent_id == current_parent_id`.

**`/reports/generate/{chat_id}` has no auth.** Same issue — no ownership enforcement.

### Medium priority

**Background tasks are in-process.** FastAPI `BackgroundTasks` runs OCR/embedding in the same Gunicorn worker. A large PDF can saturate one worker for 30+ seconds. The production upgrade path is Celery + Redis: replace `background_tasks.add_task(...)` with `process_document_task.delay(...)` and run a separate `celery worker` process (see `docker-compose.yml` for the skeleton).

**No horizontal Socket.IO scaling.** The `authenticated_kids` dict is in memory per worker. Deploying multiple Gunicorn workers or multiple backend containers means a kid connected to worker A won't be reachable via `notify_kid()` called from worker B. Fix: replace `authenticated_kids` with Redis-backed Socket.IO adapter (`python-socketio[redis]`).

**Single Tesseract language.** OCR is English-only (`lang='eng'`). Hindi and Kannada materials will produce garbage text. Tesseract supports `hin` and `kan` language packs — add them to the Dockerfile and pass `lang='eng+hin+kan'`.

**Chat history cap is only in the WebSocket path.** The REST `GET /kid/chats/{id}/messages` endpoint loads up to the `limit` parameter (default 100) for display. This is fine. But `GET /parent/chat/{chat_id}/stats` loads all messages with no limit before truncating at 6000 characters for the LLM call. Add `.limit(500)` to those queries as a safety cap.

### Long term

- Refresh tokens (current 30-minute JWTs require re-login)
- Real-time upload completion event via Socket.IO
- Prometheus metrics + Grafana dashboard
- OpenTelemetry request tracing
- Alembic DB migrations (currently schema is created once by SQLAlchemy on startup)
- CDN for static report PDFs
- Multi-tenancy / school accounts above the parent tier
