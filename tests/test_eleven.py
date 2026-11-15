print("Starting ElevenLabs test...")

import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

print("Generating music...")

audio = client.music.compose(
    prompt="A calm, warm acoustic guitar song with soft piano, slow tempo, nostalgic and peaceful.",
    music_length_ms=10000,
    force_instrumental=True,
)

with open("test.mp3", "wb") as f:
    for chunk in audio:
        f.write(chunk)

print("Saved test.mp3")