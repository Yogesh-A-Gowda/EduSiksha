
import requests
import random
import string

def random_str(n):
    return "".join(random.choices(string.ascii_lowercase, k=n))

email = f"test_{random_str(5)}@example.com"
password = "testpass123"

# Signup
print(f"Signing up {email}...")
signup = requests.post("http://localhost:10000/auth/parent/signup", json={"email": email, "password": password})
print(f"Signup: {signup.status_code}")

# Login
login = requests.post("http://localhost:10000/auth/parent/login", json={"email": email, "password": password})
if login.status_code == 200:
    token = login.json()["access_token"]
    print(f"Login successful, token: {token[:20]}...")
    
    # Get kids
    headers = {"Authorization": f"Bearer {token}"}
    kids = requests.get("http://localhost:10000/parent/dashboard/kids", headers=headers)
    print(f"\nKids endpoint status: {kids.status_code}")
    print(f"Kids response: {kids.text[:500]}")
else:
    print(f"Login failed: {login.status_code} - {login.text}")

