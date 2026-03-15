
import requests

# Login
login = requests.post("http://localhost:10000/auth/parent/login", json={"email": "test@test.com", "password": "test123"})
if login.status_code != 200:
    print(f"Login failed: {login.status_code}")
    exit()

token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Try to generate report for chat 12
print("Generating report for chat 12...")
resp = requests.post("http://localhost:10000/reports/generate/12", headers=headers)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:500]}")

