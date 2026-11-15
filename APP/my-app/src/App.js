
import './App.css';
import { useState, useEffect } from 'react';
import { uploadImage } from './clapp';
import dinoOutline from './dino-outline.png';

export default function App() {
    const [photos, setPhotos] = useState([]);
    const [photoUrls, setPhotoUrls] = useState([]);
    const [activePhoto, setActivePhoto] = useState(0);
    const [activeDate, setActiveDate] = useState(0);

    // Set today's date using local time
    const today = new Date();
    const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0')
    ].join('-');

    const [albumDate, setAlbumDate] = useState(localToday);

    // Daily descriptions
    const [morning, setMorning] = useState('');
    const [afternoon, setAfternoon] = useState('');
    const [evening, setEvening] = useState('');

    // Application state
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [songs, setSongs] = useState([]);
    const [page, setPage] = useState("Home");
    const [dinoColours, setDinoColours] = useState([]);

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

    // Carousel navigation
    function previousPhoto() {
        if (photos.length === 0) return;

        setActivePhoto(current =>
            (current - 1 + photos.length) % photos.length
        );
    }

    function nextPhoto() {
        if (photos.length === 0) return;

        setActivePhoto(current =>
            (current + 1) % photos.length
        );
    }

    // Generate gradient from Gemini colours
    function getDinoGradient(colours) {
        if (!colours || colours.length === 0) {
            return "linear-gradient(#B8C8C0, #75C98B)";
        }

        if (colours.length === 1) {
            return `linear-gradient(${colours[0]}, ${colours[0]})`;
        }

        return `linear-gradient(135deg, ${colours.join(", ")})`;
    }

    // Combine the three daily descriptions
    const description = [
        morning && `Morning: ${morning}`,
        afternoon && `Afternoon: ${afternoon}`,
        evening && `Evening: ${evening}`
    ].filter(Boolean).join('\n');

    // Upload photos and generate music
    async function handleUpload() {
        if (photos.length === 0) {
            setMessage("Please select at least one photo.");
            return;
        }

        if (!albumDate) {
            setMessage("Please select an album date.");
            return;
        }

        try {
            setUploading(true);
            setMessage("Uploading photos and generating your music...");

            const results = [];

            // Process photos one at a time
            for (const photo of photos) {
                const result = await uploadImage(
                    photo,
                    description,
                    albumDate
                );

                results.push(result);
            }

            // Extract Dino colours returned by Gemini
            const newColours = results
                .map(result => result.dino_part_colour)
                .filter(Boolean);

            setDinoColours(newColours);

            // Save generated results
            setSongs(currentSongs => [
                ...currentSongs,
                ...results
            ]);

            setMessage("Your daily album has been created!");

            // Navigate to generated album
            setPage("Generated");

        } catch (error) {
            console.error("Upload error:", error);
            setMessage("Something went wrong: " + error.message);

        } finally {
            setUploading(false);
        }
    }

    // ---------------------------------------
    // HOME PAGE
    // ---------------------------------------

    if (page === "Home") {
        return (
            <div className="app-container">

                <header>
                    <h1>Home</h1>
                </header>

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

                            {photoUrls.length > 0 && (
                                <img
                                    className="carousel-image"
                                    src={photoUrls[activeDate]}
                                    alt={`Album photo ${activeDate + 1}`}
                                />
                            )}

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

                    <div className="carousel-dots">

                        {photos.map((photo, index) => (
                            <button
                                key={index}
                                type="button"
                                className={`carousel-dot ${
                                    activeDate === index ? "active" : ""
                                }`}
                                onClick={() => {
                                    setActiveDate(index);
                                    setActivePhoto(index);
                                }}
                                aria-label={`View photo ${index + 1}`}
                            />
                        ))}

                    </div>

                </div>

                <div className="DinoHabitat">
                    <h3>Maybe dino habitat</h3>
                </div>

                <div>
                    <button
                        className="newAlbumButton"
                        onClick={() => setPage("Create")}
                    >
                        New Album!
                    </button>
                </div>

                {songs.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setPage("Generated")}
                    >
                        View Generated Album
                    </button>
                )}

            </div>
        );
    }

    // ---------------------------------------
    // CREATE ALBUM PAGE
    // ---------------------------------------

    if (page === "Create") {
        return (
            <div className="app-container">

                <header className="page-header">

                    <h1>Daily Album</h1>

                    <div className="album-date">

                        <label htmlFor="album-date">
                            Album date
                        </label>

                        <input
                            id="album-date"
                            type="date"
                            value={albumDate}
                            onChange={event =>
                                setAlbumDate(event.target.value)
                            }
                        />

                    </div>

                </header>

                {/* PHOTO UPLOAD */}

                <section className="upload-section">

                    <h2>Your photos</h2>

                    <p className="section-description">
                        Choose up to 10 photos from your day.
                    </p>

                    <label className="upload-box">

                        <span className="upload-icon">＋</span>

                        <span className="upload-title">
                            Add your photos
                        </span>

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
                            onChange={event =>
                                setMorning(event.target.value)
                            }
                        />

                        <textarea
                            className="description-input"
                            placeholder="Tell us about your afternoon..."
                            value={afternoon}
                            onChange={event =>
                                setAfternoon(event.target.value)
                            }
                        />

                        <textarea
                            className="description-input"
                            placeholder="Tell us about your evening..."
                            value={evening}
                            onChange={event =>
                                setEvening(event.target.value)
                            }
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

                <button
                    type="button"
                    onClick={() => setPage("Home")}
                >
                    Back to Home
                </button>

            </div>
        );
    }

    // ---------------------------------------
    // GENERATED ALBUM PAGE
    // ---------------------------------------

    if (page === "Generated") {
        return (
            <div className="app-container">

                <div className="dino-container">

                    {/* Gradient square */}

                    <div
                        className="dino-colour"
                        style={{
                            background: getDinoGradient(dinoColours)
                        }}
                    />

                    {/* Dinosaur outline */}

                    <img
                        src={dinoOutline}
                        className="dino-outline"
                        alt="Your mood dinosaur"
                    />

                </div>

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

                                    <h3>
                                        {song.filename || song.song_title}
                                    </h3>

                                    <img
                                        src={song.image_url}
                                        alt={song.filename || "Uploaded memory"}
                                        className="generated-image"
                                    />

                                    <h4>Music inspired by this moment</h4>

                                    <p>{song.analysis}</p>

                                    <p>
                                        Mood: {song.mood || "Not available"}
                                    </p>

                                    {/* AUDIO PLAYER */}

                                    {song.audio_url ? (

                                        <div className="music-player">

                                            <h4>Listen to your memory</h4>

                                            <audio controls>
                                                <source
                                                    src={song.audio_url}
                                                    type="audio/mpeg"
                                                />

                                                Your browser does not support audio playback.

                                            </audio>

                                        </div>

                                    ) : (

                                        <p>
                                            Music is not available for this memory.
                                        </p>

                                    )}

                                </div>

                            ))}

                        </div>

                    </section>

                )}

                <button
                    type="button"
                    onClick={() => setPage("Home")}
                >
                    Back to Home
                </button>

                <button
                    type="button"
                    onClick={() => setPage("Create")}
                >
                    Create Another Album
                </button>

            </div>
        );
    }

    return null;
}
