
import os
import re
import time
import random
from io import BytesIO

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from google import genai
from google.genai import types
from elevenlabs.client import ElevenLabs
from datetime import date

from cloudinary.uploader import upload as cloudinary_upload
from database import images_collection, songs_collection
import cloudinary_config


load_dotenv()


# ---------------------------------------
# API CLIENTS
# ---------------------------------------

gemini_client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

elevenlabs_client = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY")
)


# ---------------------------------------
# FASTAPI APP
# ---------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Backend is running!"}


# ---------------------------------------
# BASIC IMAGE UPLOAD
# ---------------------------------------

@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    description: str = Form(default="")
):
    try:
        if file.content_type not in [
            "image/jpeg",
            "image/png",
            "image/webp"
        ]:
            raise HTTPException(
                status_code=400,
                detail="Unsupported image format"
            )

        result = cloudinary_upload(
            file.file,
            folder="daily_album"
        )

        image_data = {
            "filename": file.filename,
            "description": description,
            "image_url": result["secure_url"],
            "cloudinary_id": result["public_id"],
            "status": "uploaded"
        }

        saved_image = images_collection.insert_one(image_data)

        return {
            "message": "Image uploaded successfully",
            "image_id": str(saved_image.inserted_id),
            "image_url": result["secure_url"],
            "status": "uploaded"
        }

    except HTTPException:
        raise

    except Exception as e:
        print("UPLOAD ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Image upload failed"
        )


# ---------------------------------------
# PHOTO ANALYSIS AND DINO COLOUR
# ---------------------------------------


@app.post("/analyze-photo")
def analyze_photo(
    file: UploadFile = File(...),
    description: str = Form(default=""),
    album_date: str = Form(...)
):
    try:
        selected_date = date.fromisoformat(album_date)
        album_id = f"album_{selected_date.isoformat()}"

        # 1. CHECK AND READ IMAGE

        if file.content_type not in [
            "image/jpeg",
            "image/png",
            "image/webp"
        ]:
            raise HTTPException(
                status_code=400,
                detail="The uploaded file must be an image."
            )

        image_bytes = file.file.read()

        if not image_bytes:
            raise HTTPException(
                status_code=400,
                detail="The uploaded image is empty."
            )

        mime_type = file.content_type

        # 2. UPLOAD IMAGE TO CLOUDINARY

        print("Uploading image...")

        image_result = cloudinary_upload(
            BytesIO(image_bytes),
            folder="daily_album/images"
        )

        image_url = image_result["secure_url"]

        # 3. SEND IMAGE TO GEMINI

        image = types.Part.from_bytes(
            data=image_bytes,
            mime_type=mime_type
        )

        prompt = f"""
        Analyse this photo and the user's description.

        User's description:
        {description}

        Create a short, detailed music-generation prompt
        inspired by this moment.

        Focus on the mood and also describe the atmosphere,
        musical style, instruments, tempo and emotional feeling.

        Make the result suitable for generating an
        instrumental piece of music.

        Return only the music-generation prompt.

        IMPORTANT:
        The penultimate word of your response must be
        the overall mood of the photo.

        The very last word must be a six-digit hexadecimal
        colour code beginning with # that represents the mood.
        Make it bright.

        Example ending:
        Happy #FFD166
        """

        print("Sending photo to Gemini...")

        max_attempts = 4

        for attempt in range(max_attempts):

            try:

                gemini_response = gemini_client.models.generate_content(
                    model="gemini-3.5-flash-lite",
                    contents=[prompt, image]
                )

                break

            except Exception as error:

                error_message = str(error)

                is_temporary_error = (
                    "503" in error_message or
                    "UNAVAILABLE" in error_message
                )

                if (
                    not is_temporary_error
                    or attempt == max_attempts - 1
                ):
                    raise

                wait_time = (
                    (2 ** attempt) + random.uniform(0, 1)
                )

                print(
                    f"Gemini is busy. Retrying in "
                    f"{wait_time:.1f} seconds..."
                )

                time.sleep(wait_time)

        if not gemini_response.text:
            raise ValueError(
                "Gemini returned an empty response."
            )

        raw_response = gemini_response.text.strip()

        print("Gemini analysis complete!")
        print("Full Gemini response:", raw_response)

        # 4. EXTRACT MOOD AND DINO COLOUR

        colour_match = re.search(
            r"(#[0-9A-Fa-f]{6})[.!]?\s*$",
            raw_response
        )

        if not colour_match:
            raise ValueError(
                "Gemini did not return a valid hex colour code. "
                f"Response was: {raw_response}"
            )

        dino_part_colour = colour_match.group(1).upper()

        text_before_colour = raw_response[
            :colour_match.start()
        ].strip()

        words = text_before_colour.split()

        if len(words) < 1:
            raise ValueError(
                "Gemini did not return a mood before the colour code."
            )

        mood = words[-1].strip(".,!?:")

        music_prompt = " ".join(words[:-1]).strip()

        print("Detected mood:", mood)
        print("Dino colour:", dino_part_colour)
        print("Music prompt:", music_prompt)

        # ------------------------------------------------
        # 5. ELEVENLABS MUSIC GENERATION - DISABLED
        # ------------------------------------------------

        audio = elevenlabs_client.music.compose(
            prompt=music_prompt,
            music_length_ms=20000,
            force_instrumental=True
        )

        audio_bytes = b"".join(audio)

        if not audio_bytes:
            raise ValueError("ElevenLabs returned empty audio.")

        song_result = cloudinary_upload(
            BytesIO(audio_bytes),
            folder="daily_album/songs",
            resource_type="video",
            format="mp3"
        )

        audio_url = song_result["secure_url"]
        song_public_id = song_result["public_id"]

        # ------------------------------------------------
        # 7. SAVE PHOTO AND ANALYSIS TO MONGODB
        # ------------------------------------------------

        album_entry = {
            "album_id": album_id,
            "album_date": album_date,

            "filename": file.filename,
            "description": description,

            "image": {
                "url": image_url,
                "cloudinary_id": image_result["public_id"]
            },

            "music": {
                "title": file.filename or "My Daily Song",
                "prompt": music_prompt,
                "audio_url": audio_url,
                "cloudinary_id": song_public_id,
                "format": "mp3",
                "status": "completed"
            },

            "dino_part_colour": dino_part_colour,
            "mood": mood,

            "status": "completed"
        }

        saved_entry = images_collection.insert_one(album_entry)

        print("Photo analysis saved to MongoDB!")

        # ------------------------------------------------
        # 8. RETURN EVERYTHING TO REACT
        # ------------------------------------------------

        return {
            "message": "Photo analysed successfully",

            "entry_id": str(saved_entry.inserted_id),
            "album_id": album_id,
            "album_date": album_date,
            "filename": file.filename,

            "description": description,

            "image_url": image_url,

            "analysis": music_prompt,

            "song_title": file.filename or "My Daily Song",

            "audio_url": audio_url,
            "music_status": "completed",

            "dino_part_colour": dino_part_colour,

            "mood": mood,

            "status": "completed"
        }

    except HTTPException:
        raise

    except Exception as e:

        print("ANALYSIS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    # ---------------------------------------
# GET ALBUM PHOTOS BY DATE
# ---------------------------------------

@app.get("/albums/{album_date}")
def get_album_by_date(album_date: str):

    try:
        # Validate the date
        selected_date = date.fromisoformat(album_date)

        # Generate the album ID
        album_id = f"album_{selected_date.isoformat()}"

        # Find all photos belonging to this album
        entries = images_collection.find({
            "album_id": album_id
        })

        album_photos = []

        for entry in entries:

            album_photos.append({
                "entry_id": str(entry["_id"]),
                "album_id": entry["album_id"],
                "album_date": entry["album_date"],

                "filename": entry.get("filename"),
                "description": entry.get("description"),

                "image_url": entry.get("image", {}).get("url"),

                "analysis": entry.get("music", {}).get("prompt"),

                "audio_url": entry.get("music", {}).get("audio_url"),

                "song_title": entry.get("music", {}).get("title"),

                "mood": entry.get("mood"),

                "dino_part_colour": entry.get("dino_part_colour")
            })

        return {
            "album_id": album_id,
            "album_date": album_date,
            "photos": album_photos,
            "total_photos": len(album_photos)
        }

    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD."
        )

    except Exception as e:
        print("ALBUM RETRIEVAL ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Could not retrieve album."
        )
