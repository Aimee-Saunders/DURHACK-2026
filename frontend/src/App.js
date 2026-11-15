
import './App.css';
import { useState, useEffect } from 'react';
import { uploadImage, getAlbumByDate } from './clapp';
import dinoOutline from './assets/dino-outline.png';

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
    const [databasePhotos, setDatabasePhotos] = useState([]);
    const [selectedAlbumDate, setSelectedAlbumDate] = useState(localToday);
    const [loadingAlbum, setLoadingAlbum] = useState(false);

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

    useEffect(() => {

        if (page === "Home") {
            loadAlbum(selectedAlbumDate);
        }

    }, [page, selectedAlbumDate]);

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

        if (databasePhotos.length === 0) return;

        setActivePhoto(current =>
            (current - 1 + databasePhotos.length)
            % databasePhotos.length
        );
    }

    function nextPhoto() {

        if (databasePhotos.length === 0) return;

        setActivePhoto(current =>
            (current + 1) % databasePhotos.length
        );
}

    async function loadAlbum(albumDate) {
        try {
            setLoadingAlbum(true);

            const data = await getAlbumByDate(albumDate);

            setDatabasePhotos(data.photos);

            // Start at the first photo
            setActivePhoto(0);

            if (data.photos.length === 0) {
                setMessage("No photos found for this date.");
            } else {
                setMessage("");
            }

        } catch (error) {

            console.error("Album retrieval error:", error);

            setMessage("Could not load this album.");

            setDatabasePhotos([]);

        } finally {
            setLoadingAlbum(false);
        }
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

                <div className="album-date">

                    <label htmlFor="home-album-date">
                        Choose an album date
                    </label>

                    <input
                        id="home-album-date"
                        type="date"
                        value={selectedAlbumDate}
                        onChange={event =>
                            setSelectedAlbumDate(event.target.value)
                        }
                    />

                    {loadingAlbum && <p>Loading your memories...</p>}

                    {!loadingAlbum && databasePhotos.length === 0 && (
                        <p>No memories found for this date.</p>
                    )}

                </div>

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

                            {databasePhotos.length > 0 && (
                                <img
                                    className="carousel-image"
                                    src={databasePhotos[activePhoto]?.image_url}
                                    alt={`Album photo ${activePhoto + 1}`}
                                    onClick={() => {
                                        setSongs(databasePhotos);

                                        setDinoColours(
                                            databasePhotos
                                                .map(photo => photo.dino_part_colour)
                                                .filter(Boolean)
                                        );

                                        setPage("Generated");
                                    }}
                                    style={{ cursor: "pointer" }}
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

                        {databasePhotos.map((photo, index) => (

                            <button
                                key={photo.entry_id}
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

                <div className="DinoHabitat">
                    <h3>Maybe dino habitat</h3>
                </div>

                <div>
                    <button
                        className="new-album-button"
                        onClick={() => setPage("Create")}
                    >
                        <span className="new-album-text">
                            <strong>New Album</strong>
                        </span>
                        <span className="new-album-arrow">→</span>
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
            <div className="app-container generated-page">

                <header className="generated-header">
                    <h1>Your Daily Album</h1>
                    <p>A little soundtrack to your day.</p>
                </header>

                <section className="playlist-card">

                    {/* PLAY ALL HEADER */}

                    <div className="playlist-heading">
                        <div>
                            <span className="playlist-label">
                                YOUR MEMORIES
                            </span>
                            <h2>PLAY ALL</h2>
                        </div>

                        <span className="playlist-count">
                            {songs.length} memories
                        </span>
                    </div>

                    {/* PHOTO / SONG TILES */}

                    <div className="playlist-tiles">

                        {songs.map((song, index) => (

                            <div
                                className="playlist-tile"
                                key={song.entry_id || song.song_id || index}
                            >

                                <div className="playlist-image-wrapper">

                                    <img
                                        src={song.image_url}
                                        alt={song.filename || "Memory"}
                                        className="playlist-image"
                                    />

                                    <span className="track-number">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>

                                </div>

                                <h3>
                                    {song.filename || `Memory ${index + 1}`}
                                </h3>

                                <p>
                                    {song.mood || "Your memory"}
                                </p>

                            </div>

                        ))}

                    </div>

                    {/* SONG DETAILS */}

                    <div className="playlist-divider"></div>

                    <div className="playlist-details">

                        <div className="playlist-description">

                            <span className="playlist-label">
                                THE SOUNDTRACK
                            </span>

                            <h2>Sounds of your day</h2>

                            {songs.map((song, index) => (

                                <div
                                    className="song-detail"
                                    key={song.entry_id || song.song_id || index}
                                >

                                    <div className="song-detail-heading">

                                        <span>
                                            {String(index + 1).padStart(2, "0")}
                                        </span>

                                        <h3>
                                            {song.filename || song.song_title}
                                        </h3>

                                    </div>

                                    <p>{song.analysis}</p>
                                    <p>{song.description}</p>

                                    <p className="song-mood">
                                        Mood: {song.mood || "Unknown"}
                                    </p>

                                    {song.audio_url && (

                                        <audio controls>
                                            <source
                                                src={song.audio_url}
                                                type="audio/mpeg"
                                            />
                                            Your browser does not support audio playback.
                                        </audio>

                                    )}

                                </div>

                            ))}

                        </div>

                        {/* MOOD COLOURED DINOSAUR */}

                       
                        <div className="playlist-dino">

                            <div
                                className="dino-colour"
                                style={{
                                    background: getDinoGradient(dinoColours)
                                }}
                            />

                            <img
                                src={dinoOutline}
                                className="dino-outline"
                                alt="Your mood coloured dinosaur"
                            />

                            <p>Your mood dino</p>

                            </div>
                        </div>


                </section>

                {/* NAVIGATION */}

                <div className="generated-navigation">

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
                        + New Album
                    </button>

                </div>

            </div>
        );
    }


    return null;
}
