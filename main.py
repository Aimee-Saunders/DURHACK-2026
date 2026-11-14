import os
import sys

from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv
from google import genai
from google.genai import types

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from cloudinary.uploader import upload
from database import images_collection
import cloudinary_config

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

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
        # Check file type
        if file.content_type not in [
            "image/jpeg",
            "image/png",
            "image/webp"
        ]:
            raise HTTPException(
                status_code=400,
                detail="Unsupported image format"
            )

        # Upload image to Cloudinary
        result = upload(
            file.file,
            folder="daily_album"
        )

        # Get image URL
        image_url = result["secure_url"]

        # Save image information in MongoDB
        image_data = {
            "filename": file.filename,
            "description": description,
            "image_url": image_url,
            "cloudinary_id": result["public_id"],
            "status": "uploaded"
        }

        saved_image = images_collection.insert_one(image_data)

        # Return response
        return {
            "message": "Image uploaded successfully",
            "image_id": str(saved_image.inserted_id),
            "image_url": image_url,
            "status": "uploaded"
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="Image upload failed"
        )

@app.post("/analyze-photo")
def analyze_photo(
    file: UploadFile = File(...),
    description: str = Form("")
):
    # Read the image sent from React
    image_bytes = file.file.read()
    mime_type = file.content_type or "application/octet-stream"

    if not mime_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file must be an image."
        )

    # Convert image into Gemini input
    image = types.Part.from_bytes(
        data=image_bytes,
        mime_type=mime_type
    )

    print("Sending photo to Gemini...")

    # Ask Gemini to analyse the photo
    prompt = f"""
    Describe what is happening in this photo.
    Describe the setting, objects, atmosphere and possible mood.

    Consider the user's description:
    {description}

    Write a short, personal description suitable for a daily memory album.
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=[
            prompt,
            image
        ]
    )

    print("Gemini analysis complete!")
    print(response.text)
    # Send the result back to React

    print("Starting ElevenLabs test...")

    load_dotenv()

    client1 = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

    print("Generating music...")

    audio = client1.music.compose(
        prompt=response.text,
        music_length_ms=10000,
        force_instrumental=True,
    )

    with open("test.mp3", "wb") as f:
        for chunk in audio:
            f.write(chunk)

    print("Saved test.mp3")


    return {
        "filename": file.filename,
        "analysis": response.text
    }
