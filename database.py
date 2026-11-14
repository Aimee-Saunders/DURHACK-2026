from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))

db = client["daily_album"]

images_collection = db["images"]
albums_collection = db["albums"]
songs_collection = db["songs"]