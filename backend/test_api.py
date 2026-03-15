
import requests
import random
import string

BASE_URL = "http://localhost:10000"

def get_random_string(length):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

email = f"parent_{get_random_string(5)}@example.com"
password = "password123"

# 0. Signup
print(f"Signing up {email}...")
signup_resp = requests.post(f"{BASE_URL}/auth/parent/signup", json={"email": email, "phone": get_random_string(10), "password": password})
if signup_resp.status_code == 200:
    print("Signup Successful")
elif signup_resp.status_code == 400 and "already registered" in signup_resp.text:
    print("User already exists, proceeding to login")
else:
    print(f"Signup Failed: {signup_resp.text}")

# 1. Login to get token
try:
    auth_resp = requests.post(f"{BASE_URL}/auth/parent/login", json={"email": email, "password": password})
    if auth_resp.status_code == 200:
        token = auth_resp.json()["access_token"]
        print(f"Login Successful. Token obtained.")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Get Kids
        print("Fetching kids...")
        kids_resp = requests.get(f"{BASE_URL}/parent/dashboard/kids", headers=headers)
        print(f"Kids Status: {kids_resp.status_code}")
        if kids_resp.status_code != 200:
            print(f"Kids Error: {kids_resp.text}")
        else:
            print(f"Kids Data: {kids_resp.json()}")

        # 3. Create a kid (needed to test fetching chats)
        print("Creating a kid...")
        kid_username = f"kid_{get_random_string(5)}"
        kid_resp = requests.post(f"{BASE_URL}/auth/kid/create", json={"username": kid_username, "password": "password123"}, headers=headers)
        if kid_resp.status_code == 200:
            kid_id = kid_resp.json()["kid_id"]
            print(f"Kid created: {kid_id}")

            # 4. Get Chats for this kid
            print(f"Fetching chats for kid {kid_id}...")
            chats_resp = requests.get(f"{BASE_URL}/parent/kid/{kid_id}/chats", headers=headers)
            print(f"Chats Status: {chats_resp.status_code}")
            if chats_resp.status_code != 200:
                print(f"Chats Error: {chats_resp.text}")
            else:
                print(f"Chats Data: {chats_resp.json()}")
        else:
             print(f"Kid Creation Failed: {kid_resp.text}")

    else:
        print(f"Login Failed: {auth_resp.status_code} - {auth_resp.text}")

except Exception as e:
    print(f"Script Error: {e}")

