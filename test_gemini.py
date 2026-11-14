print("Starting Gemini test...")

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load API key
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

# Connect to Gemini
client = genai.Client(api_key=api_key)

# Open the photo
with open("sample.jpeg", "rb") as f:
    image_bytes = f.read()

# Convert photo into Gemini image input
image = types.Part.from_bytes(
    data=image_bytes,
    mime_type="image/jpeg"
)

print("Sending photo to Gemini...")

# Ask Gemini to analyse the photo
response = client.models.generate_content(
    model="gemini-3.5-flash-lite",
    contents=[
        "Describe what is happening in this photo. "
        "Describe the setting, objects, atmosphere "
        "and possible mood.",
        image
    ]
)

print("\nGemini's analysis:")
print(response.text)