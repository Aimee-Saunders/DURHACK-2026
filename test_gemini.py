print("Starting Gemini test...")

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from urllib.request import urlopen, Request

# Load API key
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

# Connect to Gemini
client = genai.Client(api_key=api_key)

# URL of your uploaded photo
image_url = "PASTE_YOUR_IMAGE_URL_HERE"

# Download the image
request = Request(
    image_url,
    headers={"User-Agent": "Mozilla/5.0"}
)

with urlopen(request, timeout=30) as response:
    image_bytes = response.read()
    mime_type = response.headers.get_content_type()

# Check that the URL actually returned an image
if not mime_type.startswith("image/"):
    raise ValueError("The URL did not return an image.")

# Convert it into Gemini image input
image = types.Part.from_bytes(
    data=image_bytes,
    mime_type=mime_type
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