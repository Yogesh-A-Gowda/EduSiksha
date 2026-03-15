# EduGuard

EduGuard is a multi-tenant, local-first educational AI platform designed for safe learning. It features a Gemini-like chat interface for kids with AI guardrails and a comprehensive dashboard for parents.

## 🚀 Features

*   **Parent Dashboard**: Manage kids, view detailed chat stats, and generate practice papers.
*   **Kid Chat**: Real-time AI chat with Topic Lock (Educational only).
*   **Local-First & Privacy**: Optimized for local deployment with self-hosted AI (Ollama).
*   **Guardrails**: AI intercepts and blocks non-educational queries layer.
*   **Stats & Reports**: Granular insights into learning progress.

## 🛠️ Quick Start

### Prerequisites
*   Node.js 18+
*   Python 3.10+
*   PostgreSQL (Running on port 5432)
*   Ollama (Running on port 11434 with `gemma2` model)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt

# Create .env file (See template below)
# Initialize Database
python init_db.py

# Run Server
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to start using EduGuard.

## 🔐 Environment Variables

Create a `.env` file in `backend/`:

```ini
DATABASE_URL="postgresql://user:pass@localhost:5432/eduguard"
SECRET_KEY="your-secret-key"
ALGORITHM="HS256"
OLLAMA_BASE_URL="http://localhost:11434"
CHROMA_DB_URL="http://localhost:8000"
RAZORPAY_KEY_ID="your-key"
RAZORPAY_KEY_SECRET="your-secret"
```

## 📚 Documentation

*   [Deployment Guide](DEPLOYMENT.md): Instructions for distributed server setup (AI vs DB vs App).
*   [Task List](task.md): Project roadmap and progress.
