
import './App.css';
import { useState, useEffect } from 'react';
import { uploadImage } from './clapp';

export default function App() {
    const [photos, setPhotos] = useState([]);
    const [photoUrls, setPhotoUrls] = useState([]);
    const [activePhoto, setActivePhoto] = useState(0);

    const [morning, setMorning] = useState('');
    const [afternoon, setAfternoon] = useState('');
    const [evening, setEvening] = useState('');

    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [songs, setSongs] = useState([]);
    const [page, setPage] = useState("Create");

    // Create preview URLs for selected photos
    useEffect(() => {
        const urls = photos.map(photo =>
            URL.createObjectURL(photo)
        );

        setPhotoUrls(urls);

        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [photos]);

    // Handle selecting photos
    function handlePhotoUpload(event) {
        const selectedPhotos = Array.from(event.target.files);

        if (photos.length + selectedPhotos.length > 10) {
            alert("You can only upload up to 10 photos!");
            event.target.value = '';
            return;
        }

        setPhotos(current => [...current, ...selectedPhotos]);
        event.target.value = '';
    }

    function previousPhoto() {
        setActivePhoto(current =>
            (current - 1 + photos.length) % photos.length
        );
    }

    function nextPhoto() {
        setActivePhoto(current =>
            (current + 1) % photos.length
        );
    }

    // Upload photos and generate music
    async function handleUpload() {
        if (photos.length === 0) {
            setMessage("Please select at least one photo.");
            return;
        }

        const description = [
            morning && `Morning: ${morning}`,
            afternoon && `Afternoon: ${afternoon}`,
            evening && `Evening: ${evening}`
        ].filter(Boolean).join('\n');

        try {
            setUploading(true);
            setMessage("Uploading photos and generating your music...");

            const results = await Promise.all(
                photos.map(photo =>
                    uploadImage(photo, description)
                )
            );

            setSongs(currentSongs => [
                ...currentSongs,
                ...results
            ]);

            setMessage("Your daily album has been created!");
            setPage("Generated");

        } catch (error) {
            console.error("Upload error:", error);
            setMessage("Something went wrong: " + error.message);

        } finally {
            setUploading(false);
        }
    }

    if (page == "Create"){
    return (
        <div className="app-container">

            <header className="page-header">
                <h1>Daily Album</h1>
            </header>

            {/* PHOTO UPLOAD */}
            <section className="upload-section">
                <h2>Your photos</h2>

                <p className="section-description">
                    Choose up to 10 photos from your day.
                </p>

                <label className="upload-box">
                    <span className="upload-icon">＋</span>
                    <span className="upload-title">Add your photos</span>
                    <span className="upload-subtitle">
                        Click to browse your memories
                    </span>

                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                    />
                </label>

                {photos.length > 0 &&
                    photoUrls.length === photos.length && (

                    <div className="carousel-container">

                        <div className="carousel">

                            <button
                                className="carousel-arrow left"
                                onClick={previousPhoto}
                                aria-label="Previous photo"
                                type="button"
                            >
                                &#10094;
                            </button>

                            <div className="carousel-image-container">
                                <img
                                    className="carousel-image"
                                    src={photoUrls[activePhoto]}
                                    alt={`Memory ${activePhoto + 1}`}
                                />
                            </div>

                            <button
                                className="carousel-arrow right"
                                onClick={nextPhoto}
                                aria-label="Next photo"
                                type="button"
                            >
                                &#10095;
                            </button>

                        </div>

                        <p className="carousel-counter">
                            {activePhoto + 1} / {photos.length}
                        </p>

                        <div className="carousel-dots">
                            {photos.map((photo, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={`carousel-dot ${
                                        activePhoto === index ? "active" : ""
                                    }`}
                                    onClick={() => setActivePhoto(index)}
                                    aria-label={`View photo ${index + 1}`}
                                />
                            ))}
                        </div>

                    </div>
                )}

                <p className="photo-count">
                    {photos.length} / 10 photos selected
                </p>
            </section>

            {/* DAILY DESCRIPTION */}
            <section className="description-section">

                <h2>Describe your day</h2>

                <div>

                    <textarea
                        className="description-input"
                        placeholder="Tell us about your morning..."
                        value={morning}
                        onChange={event => setMorning(event.target.value)}
                    />

                    <textarea
                        className="description-input"
                        placeholder="Tell us about your afternoon..."
                        value={afternoon}
                        onChange={event => setAfternoon(event.target.value)}
                    />

                    <textarea
                        className="description-input"
                        placeholder="Tell us about your evening..."
                        value={evening}
                        onChange={event => setEvening(event.target.value)}
                    />

                </div>

                <button
                    className="upload-submit"
                    onClick={handleUpload}
                    disabled={uploading}
                    type="button"
                >
                    {uploading
                        ? "Creating your memories..."
                        : "Create my memory"}
                </button>

                <p className="message" role="status">
                    {message}
                </p>

            </section>
            </div>)}

        if (page == "Generated"){
            return(
            <div>
            {/* GENERATED DAILY ALBUM */}
            {songs.length > 0 && (

                <section className="generated-section">

                    <h2>Your Generated Album</h2>

                    <p>
                        Your photos and their accompanying music.
                    </p>

                    <div className="generated-album">

                        {songs.map((song, index) => (

                            <div
                                className="generated-memory"
                                key={song.entry_id || song.song_id || index}
                            >

                                <h3>{song.filename}</h3>

                                <img
                                    src={song.image_url}
                                    alt={song.filename}
                                    className="generated-image"
                                />

                                <h4>Music inspired by this moment</h4>

                                <p>{song.analysis}</p>

                                {song.audio_url ? (
                                    <audio controls>
                                        <source
                                            src={song.audio_url}
                                            type="audio/mpeg"
                                        />
                                        Your browser does not support audio.
                                    </audio>
                                ) : (
                                    <p>Music URL not returned.</p>
                                )}

                            </div>

                        ))}

                    </div>

                </section>

            )}

        </div>
    );}
}
