# DURHACK 2026 PROJECT
This is our project, 'Turning Photos into Memories', where a user's pictures are turned into a complete sensory experience by creating a music piece for each photo they upload. Over time, moods at certain times of day gathered from the photos can be compared and an overview provided. 

### HOW TO RUN:
- Install all of the dependencies listed in requirements.txt.
- Open the /backend folder.
- Run in terminal 'python -m uvicorn main:app'. This is the backend.
- In another terminal tab, open the /frontend folder.
- Run 'npm start'. This is the frontend, and it will open the webpage automatically.
- You can now use the application!

### Technical description:
Our application takes in a user's photos and their descriptions of their day from the morning, afternoon, and evening. Each photo is entered into Google Gemini's API to generate musical prompts for ElevenLabs. ElevenLabs then turns the prompt into a short instrumental musical piece which is then provided to the user. The image and MP3 file are stored in Cloudinary, and links connecting photos within an album and the media is stored in MongoDB.
Once the user has entered images, their homepage will display their most recent upload. From the homepage, you can pick a date and head to that album of images and music.
Each album has a 'mood dino', as a colour is assigned to each image based on it's major colours and mood, and each image's colour is collated into the dinosaur. On the homepage there is a 'habitat' of the user's dinosaurs where they roam! All of a day's music is collated into one song for the day, and moods overtime by time of day are compared and displayed.
