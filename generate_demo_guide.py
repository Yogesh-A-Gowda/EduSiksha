"""
Generates the EduGuard Demo Technical Guide as both .docx and .pdf
in the current folder. Plain/default styling (no iManage brand skill available).
Run with the backend venv:  backend/.venv/Scripts/python.exe generate_demo_guide.py
"""
import os

# ---------------------------------------------------------------------------
# CONTENT MODEL
# Each section is (heading_level, text) for headings, or ('p', text),
# ('bullet', text), ('code', text), ('table', [[...rows...]]) for body.
# ---------------------------------------------------------------------------

DOC_TITLE = "EduGuard - Demo Technical Guide"
DOC_SUBTITLE = "Backend + Frontend reference for answering technical questions during the demo"

# Tech stack table
STACK_ROWS = [
    ["Layer", "Technology", "Notes"],
    ["Frontend", "Next.js 16 (App Router), React 19, TypeScript", "frontend/"],
    ["Styling", "Tailwind CSS v4", "utility classes inline"],
    ["Realtime", "socket.io-client 4.8", "chat is over WebSockets"],
    ["HTTP client", "axios", "lib/api.ts, auto-injects JWT"],
    ["Markdown/Math", "react-markdown, remark-math, rehype-katex, rehype-highlight", "renders AI answers, LaTeX, code"],
    ["i18n", "i18next / react-i18next", "English, Hindi, Kannada"],
    ["Backend", "FastAPI (Python), Uvicorn ASGI", "backend/app/"],
    ["Realtime server", "python-socketio (AsyncServer, ASGI)", "services/websocket.py"],
    ["ORM", "SQLAlchemy", "db/models.py"],
    ["Database", "PostgreSQL + pgvector", "vector similarity search"],
    ["Embeddings", "SentenceTransformers all-mpnet-base-v2 -> 768 dims, on CPU", "services/ai.py (LOCAL, free)"],
    ["LLM", "Groq API, model llama-3.3-70b-versatile", "generation + analytics + paper gen"],
    ["Auth", "JWT (python-jose, HS256) + Argon2 hashing (passlib)", "core/security.py"],
    ["Docs/OCR", "pdfplumber, pytesseract, pdf2image, pandas, python-pptx, python-docx, Pillow", "services/document_processor.py"],
    ["PDF output", "ReportLab", "services/pdf_generator.py"],
    ["Payments", "Razorpay", "services/payment.py"],
]

DB_ROWS = [
    ["Table", "Purpose / key columns"],
    ["User", "Parent: email (unique), phone, password_hash. Has many Kid."],
    ["Kid", "username (unique), password_hash, subscription_status, subscription_expiry, is_active_access (parental on/off), parent_id."],
    ["ChatSession", "kid_id, title (first 30 chars of first message), is_active, timestamps."],
    ["Message", "session_id, role ('user' or 'ai'), content, timestamp."],
    ["Document", "RAG chunk store: session_id, file_path, file_name, content (chunk text), embedding = Vector(768), is_active, created_at."],
    ["ChatAnalytics", "One row per session: mastery_score (0-100), topics (JSONB array), summary, language, last_updated. Cache for analytics."],
]

# Body: list of blocks
BLOCKS = [
    ("h1", "0. The 30-Second Pitch"),
    ("p", "EduGuard (EduSiksha) is a safe, parent-controlled AI tutor for kids."),
    ("bullet", "Kids chat with an AI tutor locked to school subjects only (guardrails)."),
    ("bullet", "Kids can upload study material (PDF, Word, images, etc.) and ask questions about it - the AI answers using that material (RAG)."),
    ("bullet", "Parents get a dashboard to: control access (on/off switch), read every chat transcript (safety audit), see AI-generated learning analytics (mastery score, topics), download PDF report cards / practice papers, and pay via Razorpay."),
    ("p", "Tech in one line: Next.js frontend communicates with a FastAPI backend (REST + Socket.IO WebSockets), backed by PostgreSQL + pgvector, using local embeddings and Groq's Llama 3.3 for generation."),

    ("h1", "1. System Architecture (High Level)"),
    ("code",
"Next.js Frontend (React 19, port 3000)\n"
"   |  REST (HTTP, axios)  -->  FastAPI Backend (port 8000)\n"
"   |  Socket.IO (WebSocket) <-->  REST routers + Socket.IO server\n"
"\n"
"FastAPI talks to:\n"
"   - PostgreSQL + pgvector (768-d)  : RAG + records\n"
"   - SentenceTransformer all-mpnet-base-v2 : embeddings, LOCAL on CPU\n"
"   - Groq Cloud llama-3.3-70b-versatile : text generation\n"
"   - Razorpay : payments"),
    ("p", "Key idea to say out loud: \"Embeddings run locally and free on the CPU; only the final text generation is sent to Groq. We never send the child's documents to an external embedding API.\""),

    ("h1", "2. Tech Stack (exact names/versions)"),
    ("table", STACK_ROWS),

    ("h1", "3. Backend Walkthrough (backend/app/)"),

    ("h2", "3.1 Entry point - main.py"),
    ("bullet", "Creates the FastAPI app, enables CORS for http://localhost:3000 and :8000."),
    ("bullet", "Mounts routers: /auth, / (data), /chat, /payment."),
    ("bullet", "Serves generated PDFs as static files at /static/reports."),
    ("bullet", "Wraps FastAPI with Socket.IO ASGI (socket_app) at path /socket.io - so HTTP and WebSocket share one server on port 8000."),
    ("bullet", "Background cleanup task on startup: runs cleanup_expired_files() once every 24h."),
    ("bullet", "Run command: uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --reload."),

    ("h2", "3.2 Database - db/base.py + db/models.py"),
    ("p", "base.py: SQLAlchemy engine from DATABASE_URL, SessionLocal, and get_db() dependency (one session per request)."),
    ("table", DB_ROWS),

    ("h2", "3.3 Authentication - api/auth.py + core/security.py"),
    ("bullet", "Passwords hashed with Argon2 (passlib); never stored in plain text."),
    ("bullet", "JWT signed with SECRET_KEY, HS256, default expiry 30 minutes."),
    ("bullet", "Token payload carries id, type ('parent' or 'kid'), sub (email/username)."),
    ("bullet", "Guards: get_current_user_id (requires parent) and get_current_kid_id (requires kid)."),
    ("bullet", "Endpoints: POST /auth/parent/signup, /auth/parent/login, /auth/kid/create (parent-only), /auth/kid/login."),
    ("bullet", "Role separation enforced at the token level - a kid token cannot hit parent endpoints and vice versa."),

    ("h2", "3.4 Document ingestion / RAG indexing - document_processor.py + api/chat.py"),
    ("p", "Upload flow (POST /chat/upload):"),
    ("bullet", "1. File saved to backend/uploads/<timestamp>_<filename>."),
    ("bullet", "2. process_document() routes by extension: Images -> Tesseract OCR; PDF -> pdfplumber, with OCR fallback (<100 chars) via pdf2image at 300 DPI; Excel -> pandas; PowerPoint -> python-pptx; Word -> python-docx; TXT -> raw read."),
    ("bullet", "3. smart_chunk() splits text into ~500-char chunks with 50-char overlap, respecting paragraph/sentence boundaries."),
    ("bullet", "4. Each chunk is embedded locally (all-mpnet-base-v2, 768-d) and stored as a Document row with its vector."),

    ("h2", "3.5 RAG retrieval + LLM generation - services/ai.py"),
    ("p", "generate_response(kid_id, message, chat_history, db):"),
    ("bullet", "1. Embed the user's question locally -> query vector."),
    ("bullet", "2. pgvector cosine search (Document.embedding.cosine_distance), take top 2 chunks -> context."),
    ("bullet", "3. Build payload: system guardrail prompt -> optional RAG context -> chat history -> user message."),
    ("bullet", "4. Call Groq llama-3.3-70b-versatile, temperature=0.5, max_tokens=500. Return the answer."),
    ("p", "Guardrail prompt (the safety core): instructs the model to ONLY answer school subjects (Math, Science, History, Coding, language). Off-topic requests get: \"This topic is outside our educational context. Let's get back to your studies!\""),
    ("p", "Privacy cleanup - cleanup_expired_files(): documents older than 15 days have their file deleted from disk, embedding nulled, and is_active set to False. Runs daily."),

    ("h2", "3.6 Realtime chat - services/websocket.py"),
    ("p", "Socket.IO AsyncServer, CORS *. On chat_message event with {kid_id, message, session_id}:"),
    ("bullet", "1. Find the session by session_id (scoped to kid_id); if none, create a new session titled from the first message."),
    ("bullet", "2. Save the user message."),
    ("bullet", "3. Load up to the last 100 messages of that session as context."),
    ("bullet", "4. Call generate_response() (RAG + Groq)."),
    ("bullet", "5. Save the AI message."),
    ("bullet", "6. Emit response back to that socket with {data, session_id, title}."),

    ("h2", "3.7 Parent data + analytics - api/data.py"),
    ("bullet", "GET /parent/dashboard/kids - parent's kids + access status."),
    ("bullet", "GET /kid/chats - a kid's own sessions."),
    ("bullet", "GET /parent/kid/{kid_id}/chats - parent views a kid's sessions (ownership checked)."),
    ("bullet", "GET /kid/chats/{chat_id}/messages - transcript (ownership checked)."),
    ("bullet", "GET /parent/chat/{chat_id}/stats - analytics engine: returns cached ChatAnalytics if present for the language; otherwise sends the student's questions to Groq (JSON mode) for mastery_score (0-100), exactly 5 topics, and a summary in the requested language. Caches result."),
    ("bullet", "POST /parent/chat/{chat_id}/stats/refresh - clears cache and regenerates."),
    ("bullet", "POST /reports/generate/{chat_id} - generates practice paper + answer key PDFs, returns /static/reports/{id}_qp.pdf and _key.pdf."),

    ("h2", "3.8 PDF generation - services/pdf_generator.py"),
    ("bullet", "Sends chat history to Groq -> JSON array of 10-15 practice questions with answers (recall -> comprehension -> application)."),
    ("bullet", "ReportLab builds two PDFs: a Question Paper (no answers) and an Answer Key. Fallback questions if the AI call fails."),

    ("h2", "3.9 Payments - api/payment.py + services/payment.py"),
    ("bullet", "POST /payment/create-order - creates a Razorpay order, default Rs.499 (49900 paise), returns order_id, amount, key_id."),
    ("bullet", "POST /payment/verify - verifies the Razorpay HMAC signature (order_id, payment_id, signature)."),

    ("h1", "4. Frontend Walkthrough (frontend/)"),
    ("h2", "4.1 Pages (app/)"),
    ("bullet", "page.tsx - public landing page (features, pricing)."),
    ("bullet", "login/, signup/ - parent auth forms. JWT saved to localStorage (token, user_type)."),
    ("bullet", "chat/page.tsx - the kid chat app (Gemini-style UI): connects to Socket.IO; decodes JWT client-side for kid_id; fetches /kid/chats; emits chat_message and listens for response; uploads files (10 MB max) to /chat/upload; renders AI replies as Markdown with KaTeX math and syntax-highlighted code."),
    ("bullet", "dashboard/page.tsx - parent home: kid cards, access toggle, subscription."),
    ("bullet", "dashboard/kid/[id]/page.tsx - a kid's activity (sessions, message counts)."),
    ("bullet", "dashboard/chat/[id]/page.tsx - session inspector: mastery charts, AI analytics, full transcript (safety audit), generate report card button."),
    ("h2", "4.2 Shared (components/, lib/)"),
    ("bullet", "SocketProvider.tsx - React Context creating one socket.io-client connection to http://localhost:8000."),
    ("bullet", "lib/api.ts - axios instance with an interceptor that auto-adds Authorization: Bearer <token> from localStorage."),
    ("bullet", "lib/i18n.ts - translations for English, Hindi, Kannada."),
    ("bullet", "middleware.ts - currently a placeholder pass-through (auth enforced client-side because the token lives in localStorage)."),

    ("h1", "5. End-to-End Flow: Kid uploads notes, then asks a question"),
    ("code",
"1.  Kid uploads notes.pdf      -> POST /chat/upload (axios, multipart)\n"
"2.  Backend extracts text     -> pdfplumber / OCR fallback\n"
"3.  Chunk (~500 chars)        -> smart_chunk()\n"
"4.  Embed each chunk LOCALLY  -> all-mpnet-base-v2 (768-d)\n"
"5.  Store chunks + vectors    -> Document table (pgvector)\n"
"6.  Kid asks 'What is X?'      -> Socket.IO emit 'chat_message'\n"
"7.  Embed question locally    -> query vector\n"
"8.  pgvector cosine search    -> top-2 matching chunks\n"
"9.  Build prompt: guardrail + context + history(<=100) + question\n"
"10. Groq llama-3.3-70b        -> answer (temp 0.5, max 500 tokens)\n"
"11. Save user + AI messages   -> Message table\n"
"12. Socket.IO emit 'response' -> frontend renders Markdown"),

    ("h1", "6. Likely Demo Questions (with crisp answers)"),
    ("qa", ("Which AI model do you use?",
            "Groq's llama-3.3-70b-versatile for generation, analytics, and practice-paper creation. Embeddings use a local SentenceTransformer model (all-mpnet-base-v2).")),
    ("qa", ("Is this just ChatGPT with a wrapper?",
            "No. It's RAG over the child's own study material + a strict educational guardrail + a parent oversight layer (transcripts, analytics, access control). The chat is grounded in uploaded documents, not generic web knowledge.")),
    ("qa", ("How do you keep it safe for kids?",
            "Four layers: (1) guardrail system prompt restricts answers to school subjects; (2) parents read every transcript; (3) parental access toggle (is_active_access) can cut off the chatbot; (4) 15-day auto-deletion of uploaded files for privacy.")),
    ("qa", ("What's RAG and how is it implemented here?",
            "Retrieval-Augmented Generation. We embed uploaded documents into vectors, store them in PostgreSQL + pgvector, and at query time do a cosine-similarity search for the top-2 relevant chunks, injected into the LLM prompt as context.")),
    ("qa", ("Why local embeddings instead of an API?",
            "Privacy + cost. Children's documents never leave our server for embedding, and it's free (runs on CPU). Only the final question + retrieved context goes to Groq for text generation.")),
    ("qa", ("Why 768 dimensions?",
            "all-mpnet-base-v2 outputs 768-dim vectors, and the Document.embedding column is Vector(768) to match. Changing the model means changing dimensions -> DB migration.")),
    ("qa", ("How does real-time chat work?",
            "Socket.IO over WebSockets. The frontend emits chat_message; the backend processes (save -> RAG -> Groq -> save) and emits response. REST and WebSocket share one server on port 8000.")),
    ("qa", ("How is authentication handled?",
            "JWT (HS256, 30-min expiry) with Argon2-hashed passwords. The token encodes a type (parent/kid) so role-based route guards keep kids out of parent endpoints.")),
    ("qa", ("What file types can kids upload?",
            "Images (PNG/JPG/BMP/TIFF via OCR), PDF (with OCR fallback for scans), Word, Excel, PowerPoint, and TXT - max 10 MB.")),
    ("qa", ("How does the analytics / mastery score work?",
            "We send the student's questions to the LLM and ask it to score question quality/depth (0-100), extract exactly 5 topics, and write a summary in the chosen language. Results are cached per session in ChatAnalytics.")),
    ("qa", ("Multilingual?",
            "UI supports English, Hindi, Kannada (i18next), and analytics summaries are generated in the selected language.")),
    ("qa", ("How do payments work?",
            "Razorpay - backend creates an order (Rs.499 default), frontend completes payment, backend verifies the HMAC signature.")),

    ("h1", "7. Honest Gotchas (so a sharp reviewer can't surprise you)"),
    ("p", "These are real characteristics of the current code. If asked, frame them as 'known, on the roadmap.'"),
    ("bullet", "RAG search is not session-scoped: generate_response queries the top-2 Document chunks across ALL documents, not filtered by the current kid/session. Roadmap: filter by session_id + is_active."),
    ("bullet", "WebSocket connection is unauthenticated: the Socket.IO connect handler has a TODO - kid_id is trusted from the client payload. Roadmap: validate JWT on connect."),
    ("bullet", "History context comment mismatch: code loads the last 100 messages (a comment says 20). Say 'up to 100.'"),
    ("bullet", "Payment verify doesn't persist the subscription yet: /payment/verify confirms the signature but doesn't flip subscription_status / is_active_access in the DB. Roadmap: update the Kid record on success."),
    ("bullet", "Token in localStorage + client-side auth: middleware.ts is a pass-through; route protection happens in each page. Trade-off chosen for simplicity."),
    ("bullet", "Hardcoded localhost:8000 in api.ts and SocketProvider.tsx. Roadmap: environment variables for production."),
    ("bullet", "Tesseract path is hardcoded to C:\\Program Files\\Tesseract-OCR\\tesseract.exe (Windows). Needs to be configurable for deployment."),
    ("bullet", "CORS allow_origins=* on Socket.IO - fine for dev, tighten for prod."),

    ("h1", "8. One-Liners to Memorize"),
    ("bullet", "'Local embeddings, cloud generation' - privacy-first split."),
    ("bullet", "'pgvector cosine search, top-2 chunks' - the RAG core."),
    ("bullet", "'Guardrail prompt + parent transcripts + access toggle + 15-day deletion' - the safety story."),
    ("bullet", "'One FastAPI server hosts both REST and Socket.IO on port 8000.'"),
    ("bullet", "'Argon2 passwords, JWT with role claims.'"),
    ("bullet", "'Llama 3.3 70B on Groq for everything generative.'"),
]

# ---------------------------------------------------------------------------
# DOCX BUILDER
# ---------------------------------------------------------------------------
def build_docx(path):
    from docx import Document
    from docx.shared import Pt, RGBColor, Inches
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    doc = Document()

    # Base style
    normal = doc.styles['Normal']
    normal.font.name = 'Calibri'
    normal.font.size = Pt(10.5)

    NAVY = RGBColor(0x1F, 0x3A, 0x5F)
    BLUE = RGBColor(0x2D, 0x5B, 0xA8)

    # Title
    t = doc.add_paragraph()
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = t.add_run(DOC_TITLE)
    run.bold = True
    run.font.size = Pt(24)
    run.font.color.rgb = NAVY

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = sub.add_run(DOC_SUBTITLE)
    r.italic = True
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
    doc.add_paragraph()

    def add_heading(text, level):
        p = doc.add_paragraph()
        run = p.add_run(text)
        run.bold = True
        if level == 1:
            run.font.size = Pt(16)
            run.font.color.rgb = NAVY
            p.space_before = Pt(12)
        else:
            run.font.size = Pt(13)
            run.font.color.rgb = BLUE

    for kind, payload in BLOCKS:
        if kind == "h1":
            add_heading(payload, 1)
        elif kind == "h2":
            add_heading(payload, 2)
        elif kind == "p":
            doc.add_paragraph(payload)
        elif kind == "bullet":
            doc.add_paragraph(payload, style='List Bullet')
        elif kind == "code":
            p = doc.add_paragraph()
            run = p.add_run(payload)
            run.font.name = 'Consolas'
            run.font.size = Pt(9)
            run.font.color.rgb = RGBColor(0x10, 0x10, 0x10)
        elif kind == "qa":
            q, a = payload
            pq = doc.add_paragraph()
            rq = pq.add_run("Q: " + q)
            rq.bold = True
            rq.font.color.rgb = BLUE
            pa = doc.add_paragraph()
            pa.add_run("A: " + a)
        elif kind == "table":
            rows = payload
            tbl = doc.add_table(rows=len(rows), cols=len(rows[0]))
            tbl.style = 'Light Grid Accent 1'
            for i, row in enumerate(rows):
                for j, cell_text in enumerate(row):
                    cell = tbl.cell(i, j)
                    cell.text = cell_text
                    for par in cell.paragraphs:
                        for rr in par.runs:
                            rr.font.size = Pt(9)
                            if i == 0:
                                rr.font.bold = True
            doc.add_paragraph()

    doc.save(path)
    print("DOCX written:", path)


# ---------------------------------------------------------------------------
# PDF BUILDER (ReportLab)
# ---------------------------------------------------------------------------
def build_pdf(path):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                    TableStyle, Preformatted)
    from reportlab.lib.enums import TA_CENTER
    import html

    NAVY = colors.HexColor("#1F3A5F")
    BLUE = colors.HexColor("#2D5BA8")
    GREY = colors.HexColor("#555555")

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('TitleX', parent=styles['Title'], textColor=NAVY, fontSize=22, alignment=TA_CENTER)
    sub_style = ParagraphStyle('SubX', parent=styles['Normal'], textColor=GREY, fontSize=10, alignment=TA_CENTER, italic=True)
    h1 = ParagraphStyle('H1X', parent=styles['Heading1'], textColor=NAVY, fontSize=15, spaceBefore=14, spaceAfter=6)
    h2 = ParagraphStyle('H2X', parent=styles['Heading2'], textColor=BLUE, fontSize=12, spaceBefore=10, spaceAfter=4)
    body = ParagraphStyle('BodyX', parent=styles['Normal'], fontSize=9.5, leading=13, spaceAfter=4)
    bullet = ParagraphStyle('BulletX', parent=body, leftIndent=14, bulletIndent=4)
    qa_q = ParagraphStyle('QAQ', parent=body, textColor=BLUE, fontName='Helvetica-Bold', spaceBefore=4)
    code_style = ParagraphStyle('CodeX', parent=styles['Code'], fontSize=8, leading=10, backColor=colors.HexColor("#F2F4F7"), borderPadding=6)

    def esc(t):
        return html.escape(t)

    story = []
    story.append(Paragraph(esc(DOC_TITLE), title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(esc(DOC_SUBTITLE), sub_style))
    story.append(Spacer(1, 12))

    for kind, payload in BLOCKS:
        if kind == "h1":
            story.append(Paragraph(esc(payload), h1))
        elif kind == "h2":
            story.append(Paragraph(esc(payload), h2))
        elif kind == "p":
            story.append(Paragraph(esc(payload), body))
        elif kind == "bullet":
            story.append(Paragraph("&bull;&nbsp;" + esc(payload), bullet))
        elif kind == "code":
            story.append(Preformatted(payload, code_style))
            story.append(Spacer(1, 4))
        elif kind == "qa":
            q, a = payload
            story.append(Paragraph("Q: " + esc(q), qa_q))
            story.append(Paragraph("A: " + esc(a), body))
        elif kind == "table":
            rows = payload
            data = [[Paragraph(esc(c), ParagraphStyle('cell', parent=body, fontSize=8, leading=10,
                     textColor=colors.white if i == 0 else colors.black,
                     fontName='Helvetica-Bold' if i == 0 else 'Helvetica'))
                     for c in row] for i, row in enumerate(rows)]
            ncols = len(rows[0])
            if ncols == 3:
                col_widths = [32*mm, 75*mm, 60*mm]
            else:
                col_widths = [40*mm, 127*mm]
            tbl = Table(data, colWidths=col_widths, repeatRows=1)
            tbl.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), NAVY),
                ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor("#B0B8C4")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F2F4F7")]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(tbl)
            story.append(Spacer(1, 8))

    doc = SimpleDocTemplate(path, pagesize=A4,
                            leftMargin=18*mm, rightMargin=18*mm,
                            topMargin=16*mm, bottomMargin=16*mm,
                            title=DOC_TITLE)
    doc.build(story)
    print("PDF written:", path)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    build_docx(os.path.join(here, "EduGuard_Demo_Technical_Guide.docx"))
    build_pdf(os.path.join(here, "EduGuard_Demo_Technical_Guide.pdf"))
    print("Done.")
