import os
from groq import Groq
from dotenv import load_dotenv

print("Loading .env file...")
load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("ERROR: GROQ_API_KEY is not set in environment variables.")
    print("Please check your .env file.")
elif api_key == "your_groq_api_key_here":
    print("ERROR: You haven't replaced the placeholder API Key in .env!")
    print("Please open backend/.env and paste your actual Groq API Key.")
else:
    print(f"API Key found: {api_key[:5]}...{api_key[-4:]}")
    print("Attempting to connect to Groq...")
    
    try:
        client = Groq(api_key=api_key)
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": "Say hello!",
                }
            ],
            model="llama-3.3-70b-versatile",
        )
        print("\nSUCCESS! Connection established.")
        print("Groq Response:", chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"\nCONNECTION FAILED: {e}")
