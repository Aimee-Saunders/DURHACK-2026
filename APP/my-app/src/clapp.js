
const API_URL = "http://localhost:8000";

export async function uploadImage(file, description) {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("description", description || "");

    const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData
    });

    const rawData = await response.text();

    let data;
    try {
        data = JSON.parse(rawData);
    } catch {
        data = rawData;
    }

    console.log("Upload status:", response.status);
    console.log("Upload response:", data);

    if (!response.ok) {
        const errorMessage = typeof data?.detail === "string"
            ? data.detail
            : JSON.stringify(data?.detail || data);

        throw new Error(errorMessage || "Upload failed");
    }

    return data;
}