import logo from './logo.svg';
import './App.css';

import { useState } from 'react';

export default function App() {
  const [photos, setPhotos] = useState([]);

  function handlePhotoUpload(event) {
    const selectedPhotos = Array.from(event.target.files);

    if (selectedPhotos.length > 10) {
      alert("You can only upload up to 10 photos!");
      return;
    }

    setPhotos(selectedPhotos);
  }

  return (
    <div>
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
    </div>
  );
}
