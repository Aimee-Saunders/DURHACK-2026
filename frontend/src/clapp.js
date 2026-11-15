
const API_URL = "http://localhost:8000";

export async function uploadImage(file, description, albumDate) {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("description", description);
    formData.append("album_date", albumDate);


    const response = await fetch(
        `${API_URL}/analyze-photo`,
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
    }

    return data;
}
