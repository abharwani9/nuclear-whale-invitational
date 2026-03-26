// src/cloudinary/config.js
// ─────────────────────────────────────────────────────────────────────────────
// CLOUDINARY SETUP (free, no credit card required)
//
// 1. Go to cloudinary.com and click "Sign up for free"
//    - You can sign up with your Google account (same one as Firebase)
//    - No credit card required
//
// 2. After signing up, you land on your Dashboard.
//    Copy your "Cloud name" — it looks like: dxxxxxx (a short word/code)
//    Paste it below as CLOUD_NAME
//
// 3. Create an Upload Preset:
//    - Click the Settings gear icon (top right)
//    - Click "Upload" in the left menu
//    - Scroll down to "Upload presets"
//    - Click "Add upload preset"
//    - Set Signing Mode to: "Unsigned"
//    - Give it a name like: nwi_uploads
//    - Click Save
//    - Paste that preset name below as UPLOAD_PRESET
//
// 4. That's it! No API keys needed for unsigned uploads.
// ─────────────────────────────────────────────────────────────────────────────

export const CLOUDINARY_CLOUD_NAME = "dorz6tb5b";   // e.g. "dab12xyz"
export const CLOUDINARY_UPLOAD_PRESET = "nwi_uploads"; // e.g. "nwi_uploads"

// Resource type mapping by file category
export const RESOURCE_TYPES = {
  photo: "image",
  audio: "video",  // Cloudinary uses "video" resource type for audio too
  doc: "raw",      // PDFs and documents use "raw"
};

// Upload a file to Cloudinary — returns the secure URL
export async function uploadToCloudinary(file, type, onProgress) {
  const resourceType = RESOURCE_TYPES[type] || "auto";
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `nwi/${type}s`); // organizes files into folders

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve(data.secure_url);
      } else {
        const err = JSON.parse(xhr.responseText);
        reject(new Error(err.error?.message || "Upload failed"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.open("POST", url);
    xhr.send(formData);
  });
}
