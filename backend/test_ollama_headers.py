import requests

base_url = "http://nsfxk-35-198-225-160.a.free.pinggy.link"
headers = {"User-Agent": "curl/7.68.0"}

print(f"Testing connection to: {base_url} with headers")

try:
    # Test Chat
    print("\nTesting Chat Generation...")
    payload = {
        "model": "gemma2",
        "messages": [{"role": "user", "content": "hi"}],
        "stream": False
    }
    r = requests.post(f"{base_url}/api/chat", json=payload, headers=headers, timeout=30)
    print(f"   Chat Status: {r.status_code}")
    if r.status_code == 200:
        print("   Chat Response:", r.json())
    else:
        print(f"   Chat Failed: {r.text[:200]}") # Print first 200 chars of error

except Exception as e:
    print(f"\nCRITICAL FAILURE: {e}")
