import os
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

# API clients
gemini_client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

elevenlabs_client = ElevenLabs(
    api_key=os.getenv("ELEVENLABS_API_KEY")
)

app = FastAPI()

# Allow React frontend to communicate with FastAPI
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



@app.post("/analyze-photo")
def analyze_photo(
    file: UploadFile = File(...),
    description: str = Form(default=""),
    album_date: str = Form(...)
):
    try:
        selected_date = date.fromisoformat(album_date)
        album_id = f"album_{selected_date.isoformat()}"
    
        # 1. Check and read the image
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

        # 2. Upload image to Cloudinary
        print("Uploading image...")

        image_result = cloudinary_upload(
            BytesIO(image_bytes),
            folder="daily_album/images"
        )

        image_url = image_result["secure_url"]

        # 3. Send image to Gemini
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

        Focus on the mood and also describe the atmosphere, musical style,
        instruments, tempo and emotional feeling.

        Make the result suitable for generating an
        instrumental piece of music. Return only the
        music-generation prompt - let the penultimate word be the overall mood of the photo and the last word be a colour to describe that mood.
        """

        print("Sending photo to Gemini...")

        gemini_response = gemini_client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=[prompt, image]
        )

        if not gemini_response.text:
            raise ValueError("Gemini returned an empty response.")

        music_prompt = gemini_response.text.strip()
        dino_part_colour = " ".join(gemini_response.text.strip().split()[-2:])

        print("Gemini analysis complete!")
        print(gemini_response.text)
        # 4. Generate music with ElevenLabs
        print("Generating music with ElevenLabs...")

        audio = elevenlabs_client.music.compose(
            prompt=music_prompt,
            music_length_ms=20000,
            force_instrumental=True
        )

        audio_bytes = b"".join(audio)

        if not audio_bytes:
            raise ValueError("ElevenLabs returned empty audio.")

        print("Music generated successfully!")

        # 5. Upload music to Cloudinary
        print("Uploading song to Cloudinary...")

        song_result = cloudinary_upload(
            BytesIO(audio_bytes),
            folder="daily_album/songs",
            resource_type="video",
            format="mp3"
        )

        audio_url = song_result["secure_url"]

        print("Song uploaded successfully!")

        # 6. Save EVERYTHING together in one MongoDB document
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
                "cloudinary_id": song_result["public_id"],
                "format": "mp3"
            },

            "status": "completed"
        }

        saved_entry = images_collection.insert_one(album_entry)

        print("Complete photo album entry saved to MongoDB!")

        # 7. Return everything to React
        return {
            "message": "Photo and music generated successfully",
            "entry_id": str(saved_entry.inserted_id),
            "album_id": album_id,
            "album_date": album_date,
            "filename": file.filename,
            "description": description,
            "image_url": image_url,
            "analysis": music_prompt,
            "song_title": file.filename or "My Daily Song",
            "audio_url": audio_url,
            "status": "completed",
            "dino_part_colour":dino_part_colour
        }

    except HTTPException:
        raise

    except Exception as e:
        print("ANALYSIS ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
