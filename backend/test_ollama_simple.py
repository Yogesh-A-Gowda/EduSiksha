import requests

base_url = "http://nsfxk-35-198-225-160.a.free.pinggy.link"
print(f"Testing connection to: {base_url}")

try:
    # Test 1: Root endpoint
    print("1. Checking Root...")
    r = requests.get(base_url, timeout=10)
    print(f"   Root Status: {r.status_code}")
    print(f"   Root Content Preview: {r.text[:100]}")

    # Test 2: List Models
    print("\n2. Checking Models...")
    r = requests.get(f"{base_url}/api/tags", timeout=10)
    print(f"   Tags Status: {r.status_code}")
    if r.status_code == 200:
        print("   Available Models:", r.json())
    else:
        print(f"   Failed to list models: {r.text}")

    # Test 3: Chat
    print("\n3. Testing Chat Generation...")
    payload = {
        "model": "gemma2",
        "messages": [{"role": "user", "content": "hi"}],
        "stream": False
    }
    r = requests.post(f"{base_url}/api/chat", json=payload, timeout=30)
    print(f"   Chat Status: {r.status_code}")
    if r.status_code == 200:
        print("   Chat Response:", r.json())
    else:
        print(f"   Chat Failed: {r.text}")

except Exception as e:
    print(f"\nCRITICAL FAILURE: {e}")
