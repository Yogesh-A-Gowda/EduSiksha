# EduGuard Free Tier Online Deployment Guide

This guide allows you to run the entire backend and AI system using **100% Free** online resources. You won't need to purchase any servers.

## Architecture

*   **Database**: [Neon.tech](https://neon.tech) (Free Serverless PostgreSQL).
*   **AI Engine (Brain)**: [Google Colab](https://colab.research.google.com/) (Free T4 GPU) with **ngrok** tunneling.
*   **Backend API**: [Render.com](https://render.com) (Free Tier Web Service).

---

## Step 1: The Database (Neon.tech)

1.  Go to [Neon.tech](https://neon.tech) and Sign Up.
2.  Create a **New Project** named `eduguard`.
3.  It will show you a **Connection String** that looks like:
    `postgres://user:password@ep-cool-fog.aws-region.neon.tech/eduguard?sslmode=require`
4.  **Copy this string**. This is your `DATABASE_URL`.

---

## Step 2: The AI Engine (Google Colab)

Since running AI models requires a GPU, we will use Google Colab's free tier.

1.  Go to [Google Colab](https://colab.research.google.com/).
2.  Create a **New Notebook**.
3.  In the menu, go to **Runtime > Change runtime type** and select **T4 GPU**.
4.  Paste the following code into the first cell and run it (Play button):

```python
# 1. Install Ollama and ngrok
!curl -fsSL https://ollama.com/install.sh | sh
!pip install pyngrok

# 2. Start Ollama in the background
import subprocess
import time

# Start Ollama server
subprocess.Popen(["ollama", "serve"])
time.sleep(5)  # Wait for it to start

# 3. Pull the Model (Gemma 2)
print("Downloading Gemma 2 Model... this may take a few minutes.")
subprocess.run(["ollama", "pull", "gemma2"])
print("Model Downloaded!")

# 4. Expose via ngrok
from pyngrok import ngrok

# Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
NGROK_TOKEN = "YOUR_NGROK_TOKEN_HERE" 
ngrok.set_auth_token(NGROK_TOKEN)

# Open a tunnel to port 11434 (Ollama)
public_url = ngrok.connect(11434).public_url
print(f"YOUR AI URL IS: {public_url}")
```

5.  **Copy the `public_url`** printed at the end (e.g., `https://a1b2-34-56.ngrok-free.app`).
6.  **Note**: This URL changes every time you restart the notebook. You will need to update your Backend config if it changes.
7.  **Keep this Colab tab OPEN**. If you close it, the AI stops.

---

## Step 3: The Backend (Render.com)

1.  Push your code to **GitHub** (if you haven't already).
2.  Go to [Render.com](https://render.com) and Sign Up.
3.  Click **New +** and select **Web Service**.
4.  Connect your GitHub repository.
5.  **Configure the Service**:
    *   **Name**: `eduguard-backend`
    *   **Runtime**: `Python 3`
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `uvicorn app.main:socket_app --host 0.0.0.0 --port 10000`
6.  **Environment Variables** (Scroll down to "Advanced"):
    Add the following keys and values:
    *   `DATABASE_URL`: Paste the **Neon** connection string from Step 1.
    *   `OLLAMA_BASE_URL`: Paste the **Colab/ngrok** URL from Step 2.
    *   `CHROMA_DB_URL`: (Optional) For now, you can leave this. If you want persistent RAG on Render, you'll need to use local disk (which is ephemeral on free tier) or set up a separate Chroma instance. *For testing, local disk on Render works but data resets on deploy.*
    *   `SECRET_KEY`: `random_secure_string_here`
    *   `RAZORPAY_KEY_ID`: `test_key_id`
    *   `RAZORPAY_KEY_SECRET`: `test_key_secret`
    *   `PYTHON_VERSION`: `3.10.0`
7.  Click **Create Web Service**.

Render will deploy your backend. It might take a few minutes. Once done, it will give you a URL like `https://eduguard-backend.onrender.com`.

---

## Step 4: Connecting the Frontend

1.  Open your local `frontend/lib/api.ts` file.
2.  Change the `baseURL` to your **Render Backend URL**:

```typescript
const api = axios.create({
  baseURL: 'https://eduguard-backend.onrender.com', // Update this!
});
```

3.  Run your Frontend locally:
    ```bash
    cd frontend
    npm run dev
    ```
4.  Open `http://localhost:3000`.

**Done!** You now have:
*   Frontend running on your Laptop.
*   Backend running on the Cloud (Render).
*   Database running on the Cloud (Neon).
*   AI running on Google's Cloud GPUs (Colab).

All for $0.
