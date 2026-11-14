
import './App.css';
import { useState } from 'react';
import { uploadImage } from './clapp';

export default function App() {
    const [photos, setPhotos] = useState([]);
    const [description, setDescription] = useState('');
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);

    function handlePhotoUpload(event) {
        const selectedPhotos = Array.from(event.target.files);

        if (photos.length + selectedPhotos.length > 10) {
            alert("You can only upload up to 10 photos!");
            return;
        }

        setPhotos(currentPhotos => [
            ...currentPhotos,
            ...selectedPhotos
        ]);

        event.target.value = '';
    }

    async function handleUpload() {
        if (photos.length === 0) {
            setMessage("Please select some photos first.");
            return;
        }

        if (!description.trim()) {
            setMessage("Please enter a description.");
            return;
        }

        setUploading(true);
        setMessage("Uploading photos...");

        try {
            const results = await Promise.all(
                photos.map(photo =>
                    uploadImage(photo, description)
                )
            );

            setMessage(
                `Successfully uploaded ${results.length} photos!`
            );

            console.log("Upload results:", results);

        } catch (error) {
            setMessage(`Upload error: ${error.message}`);
        } finally {
            setUploading(false);
        }
    }

    return (
        <div>
            <h1>Daily Album</h1>

            <h2>Select your photos</h2>

            <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
            />

            <div>
                {photos.map((photo, index) => (
                    <div key={index}>
                        <img
                            src={URL.createObjectURL(photo)}
                            alt="Uploaded preview"
                            width="150"
                        />
                        <p>{photo.name}</p>
                    </div>
                ))}
            </div>

            <h2>Describe your day</h2>

            <textarea
                placeholder="Tell us about your day..."
                value={description}
                onChange={event =>
                    setDescription(event.target.value)
                }
            />

            <br />

            <button
                onClick={handleUpload}
                disabled={uploading}
            >
                {uploading ? "Uploading..." : "Upload Photos"}
            </button>

            <p>{message}</p>
        </div>
    );
}
