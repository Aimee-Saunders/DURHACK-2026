import os
import sys

from dotenv import load_dotenv
from google import genai

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from cloudinary.uploader import upload
from database import images_collection
import cloudinary_config

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
    description: str = Form(...)
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
