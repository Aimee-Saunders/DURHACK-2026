print("Starting Gemini test...")

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERROR: API key not found!")
else:
    print("API key found!")
    print("Connecting to Gemini...")

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents="Say hello! I am testing my API connection."
        )

        print("\nGemini replied:")
        print(response.text or "No text was returned.")

    except Exception as e:
        print("\nSomething went wrong:")
        print(repr(e))