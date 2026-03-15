import requests
import os
from dotenv import load_dotenv

load_dotenv()

base_url = os.getenv("OLLAMA_BASE_URL")
print(f"Testing connection to: {base_url}")

try:
    # Test 1: Root endpoint (Pinggy might show HTML here, but Ollama usually returns "Ollama is running")
    r = requests.get(base_url)
    print(f"Root Status: {r.status_code}")
    print(f"Root Content (first 100 chars): {r.text[:100]}")

    # Test 2: List Models
    r = requests.get(f"{base_url}/api/tags")
    print(f"Tags Status: {r.status_code}")
    if r.status_code == 200:
        print("Available Models:", r.json())
    else:
        print("Failed to list models")
        
    # Test 3: Chat
    payload = {
        "model": "gemma2",
        "messages": [{"role": "user", "content": "hi"}],
        "stream": False
    }
    print("Testing Chat Generation...")
    r = requests.post(f"{base_url}/api/chat", json=payload)
    print(f"Chat Status: {r.status_code}")
    if r.status_code == 200:
        print("Chat Response:", r.json())
    else:
        print(f"Chat Error: {r.text}")

except Exception as e:
    print(f"Connection Failed: {e}")
