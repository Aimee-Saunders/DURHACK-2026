const API_URL = "http://localhost:8000";

export async function uploadImage(file, description) {

    const formData = new FormData();

    formData.append("file", file);
    formData.append("description", description);

    const response = await fetch(
        `${API_URL}/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!response.ok) {
        throw new Error("Upload failed");
    }

    return response.json();
}