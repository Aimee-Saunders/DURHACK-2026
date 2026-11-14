
import './App.css';
import { useState, useEffect } from 'react';
import { uploadImage } from './clapp';

export default function App() {
    const [photos, setPhotos] = useState([]);
    const [photoUrls, setPhotoUrls] = useState([]);
    const [activePhoto, setActivePhoto] = useState(0);
    const [description, setDescription] = useState('');
    const [message, setMessage] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const urls = photos.map(photo => URL.createObjectURL(photo));
        setPhotoUrls(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [photos]);

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
        setActivePhoto(current => (current - 1 + photos.length) % photos.length);
    }

    function nextPhoto() {
        setActivePhoto(current => (current + 1) % photos.length);
    }

    async function handleUpload() {
        setUploading(true);
        setMessage("Uploading photos...");

        await Promise.all(photos.map(photo => 
          Promise.all([
            uploadImage(photo, description),
            sendPhotoToPython(photo,description)
          ])
        ));

        setMessage(`Successfully uploaded ${photos.length} photos!`);
        setUploading(false);
    }

    async function sendPhotoToPython(photo,description) {
      const formData = new FormData();
      formData.append("file", photo);
      formData.append("description", description);
      const response = await fetch("http://localhost:8000/analyze-photo",{
        method:"POST",
        body: formData
      });
      const result = await response.json();
      console.log(result);
      return result;
    }

    return (
        <div className="app-container">
            <header className="page-header">
                <h1>Daily Album</h1>
            </header>

            <section className="upload-section">
                <h2>Your photos</h2>
                <p className="section-description">Choose up to 10 photos from your day.</p>

                <label className="upload-box">
                    <span className="upload-icon">＋</span>
                    <span className="upload-title">Add your photos</span>
                    <span className="upload-subtitle">Click to browse your memories</span>
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
                </label>

                {photos.length > 0 && photoUrls.length === photos.length && (
                    <div className="carousel-container">
                        <div className="carousel">
                            <button className="carousel-arrow left" onClick={previousPhoto} aria-label="Previous photo" type="button">
                                &#10094;
                            </button>

                            <div className="carousel-image-container">
                                <img className="carousel-image" src={photoUrls[activePhoto]} alt={`Memory ${activePhoto + 1}`} />
                            </div>

                            <button className="carousel-arrow right" onClick={nextPhoto} aria-label="Next photo" type="button">
                                &#10095;
                            </button>
                        </div>

                        <p className="carousel-counter">{activePhoto + 1} / {photos.length}</p>

                        <div className="carousel-dots">
                            {photos.map((photo, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={`carousel-dot ${activePhoto === index ? "active" : ""}`}
                                    onClick={() => setActivePhoto(index)}
                                    aria-label={`View photo ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <p className="photo-count">{photos.length} / 10 photos selected</p>
            </section>

            <section className="description-section">
                <h2>Describe your day</h2>
                <div>
                  <textarea
                      className="description-input"
                      placeholder="Tell us about your morning..."
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                  />
                  <textarea
                      className="description-input"
                      placeholder="Tell us about your afternoon..."
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                  />
                  <textarea
                      className="description-input"
                      placeholder="Tell us about your evening..."
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                  />                  
                </div>
                <button className="upload-submit" onClick={handleUpload} disabled={uploading} type="button">
                    {uploading ? "Creating your memories..." : "Create my memory"}
                </button>

                <p className="message" role="status">{message}</p>
            </section>
        </div>
    );
}
