print("Starting photo to song...")

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from elevenlabs.client import ElevenLabs

load_dotenv()

gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
eleven = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# 1. Open the photo
with open("sample.jpeg", "rb") as f:
    image_bytes = f.read()

image = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

# 2. Gemini describes the photo (your original prompt)
print("Sending photo to Gemini...")
response = gemini.models.generate_content(
    model="gemini-3.5-flash-lite",
    contents=[
        "Describe what is happening in this photo. "
        "Describe the setting, objects, atmosphere "
        "and possible mood.",
        image
    ]
)
description = response.text
print("\nDescription:\n", description)

# 3. Gemini turns that description into a music prompt
print("\nWriting music prompt...")
music_response = gemini.models.generate_content(
    model="gemini-3.5-flash-lite",
    contents=[
        "Turn this description into a prompt for a music generator. "
        "Write one paragraph, 40-80 words, covering genre, instruments, "
        "tempo, mood and energy. Instrumental only. Do not name real artists.\n\n"
        + description
    ]
)
music_prompt = music_response.text
print("\nMusic prompt:\n", music_prompt)

# 4. ElevenLabs composes the song
print("\nGenerating music...")
audio = eleven.music.compose(
    prompt=music_prompt,
    music_length_ms=30000,
    force_instrumental=True,
)

with open("song.mp3", "wb") as f:
    for chunk in audio:
        f.write(chunk)

print("\nSaved song.mp3")