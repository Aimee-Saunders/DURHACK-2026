print("Starting photo to song...")

import os
import datetime
from PIL import Image
from dotenv import load_dotenv
from google import genai
from google.genai import types
from elevenlabs.client import ElevenLabs

load_dotenv()

gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
eleven = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))


# ---------- Extract the photo's time metadata ----------
def get_photo_time(path):
    try:
        exif = Image.open(path).getexif()
        # 36867 = DateTimeOriginal (when the photo was taken)
        taken = exif.get_ifd(0x8769).get(36867) or exif.get(306)
        if taken:
            return datetime.datetime.strptime(taken, "%Y:%m:%d %H:%M:%S"), "photo metadata"
    except Exception:
        pass
    # Fallback: when the file was last saved
    return datetime.datetime.fromtimestamp(os.path.getmtime(path)), "file date"


def get_time_of_day(dt):
    hour = dt.hour
    if 5 <= hour < 11:
        return "morning"
    elif 11 <= hour < 16:
        return "afternoon"
    elif 16 <= hour < 21:
        return "evening"
    else:
        return "night"


photo_time, source = get_photo_time("sample.jpeg")
time_of_day = get_time_of_day(photo_time)

time_info = (
    f"Metadata: this photo was taken on {photo_time.strftime('%A %d %B %Y')} "
    f"at {photo_time.strftime('%H:%M')} ({time_of_day})."
)

print(f"Photo time: {photo_time} (from {source})")
print(time_info)

# 1. Open the photo
with open("sample.jpeg", "rb") as f:
    image_bytes = f.read()

image = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

# 2. Gemini describes the photo (your original prompt + time metadata)
print("\nSending photo to Gemini...")
response = gemini.models.generate_content(
    model="gemini-3.5-flash-lite",
    contents=[
        "Describe what is happening in this photo. "
        "Describe the setting, objects, atmosphere "
        "and possible mood. "
        + time_info,
        image
    ]
)
description = response.text
print("\nDescription:\n", description)

# 3. Gemini turns the description into a music prompt (with time metadata)
print("\nWriting music prompt...")
music_response = gemini.models.generate_content(
    model="gemini-3.5-flash-lite",
    contents=[
        "Turn this description into a prompt for a music generator. "
        "Write one paragraph, 40-80 words, covering genre, instruments, "
        "tempo, mood and energy. Instrumental only. Do not name real artists. "
        f"The photo was taken in the {time_of_day} at {photo_time.strftime('%H:%M')}, "
        "so let the time of day shape the energy and mood of the music.\n\n"
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