
import requests

# Login first
login_resp = requests.post("http://localhost:10000/auth/parent/login", json={"email": "parent@example.com", "password": "password123"})
if login_resp.status_code == 200:
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to get kids
    kids_resp = requests.get("http://localhost:10000/parent/dashboard/kids", headers=headers)
    print(f"Status: {kids_resp.status_code}")
    print(f"Response: {kids_resp.text}")
else:
    print(f"Login failed: {login_resp.status_code} - {login_resp.text}")

