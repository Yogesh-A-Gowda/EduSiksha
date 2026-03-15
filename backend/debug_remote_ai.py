import requests

url = "http://nsfxk-35-198-225-160.a.free.pinggy.link"

print(f"Diagnosing: {url}")

headers_list = [
    {"User-Agent": "curl/7.68.0"},
    {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"},
    {"ngrok-skip-browser-warning": "true"},
    {"Bypass-Tunnel-Reminder": "true"},
    {"User-Agent": "EduGuard-Backend/1.0", "ngrok-skip-browser-warning": "true"}
]

for i, h in enumerate(headers_list):
    print(f"\n--- Attempt {i+1} with headers: {h} ---")
    try:
        r = requests.get(f"{url}/api/tags", headers=h, timeout=10)
        print(f"Status: {r.status_code}")
        print("Headers:", r.headers)
        if r.status_code == 200:
            print("SUCCESS! Model List:", r.json())
            break
        else:
            print("Preview:", r.text[:300].replace("\n", " "))
            # Save for analysis
            with open(f"error_response_{i}.html", "w", encoding="utf-8") as f:
                f.write(r.text)
    except Exception as e:
        print(f"Error: {e}")
