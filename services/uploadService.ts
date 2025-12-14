
/**
 * Upload Service
 * Tries multiple free file hosting providers to ensure reliability without requiring Firebase Storage.
 * Strategy: TmpFiles.org (Primary) -> File.io (Backup)
 */

const uploadToTmpFiles = (file: File, onProgress: (percent: number) => void): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    // TmpFiles is reliable and keeps files for 60 minutes
    xhr.open("POST", "https://tmpfiles.org/api/v1/upload", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.status === 'success' && data.data && data.data.url) {
            // CRITICAL: TmpFiles returns a viewer URL by default. 
            // We MUST convert it to a direct download URL by inserting '/dl/' 
            // Example: https://tmpfiles.org/123/beat.mp3 -> https://tmpfiles.org/dl/123/beat.mp3
            const directUrl = data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
            resolve(directUrl);
          } else {
            reject(new Error("TmpFiles upload failed"));
          }
        } catch (e) {
          reject(new Error("Invalid JSON from TmpFiles"));
        }
      } else {
        reject(new Error(`TmpFiles Error: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error (TmpFiles)"));
    xhr.send(formData);
  });
};

const uploadToFileIo = (file: File, onProgress: (percent: number) => void): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    // standard file.io, 1 day expiry
    xhr.open("POST", "https://file.io/?expires=1d", true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            resolve(data.link);
          } else {
            reject(new Error(data.message || "File.io failed"));
          }
        } catch (e) {
          reject(new Error("Invalid JSON from File.io"));
        }
      } else {
        reject(new Error(`File.io Error: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error (File.io)"));
    xhr.send(formData);
  });
};

export const uploadToTempHost = async (file: File, onProgress: (percent: number) => void): Promise<string> => {
  // Strategy: Try Primary, if fail, try Backup
  
  try {
    // 1. Try TmpFiles.org (Best for persistence and speed)
    console.log("Attempting upload via TmpFiles...");
    return await uploadToTmpFiles(file, onProgress);
  } catch (err) {
    console.warn("TmpFiles failed, trying fallback...", err);
    
    try {
      // 2. Try File.io (Backup)
      console.log("Attempting upload via File.io...");
      return await uploadToFileIo(file, onProgress);
    } catch (fallbackErr) {
      console.error("All upload providers failed", fallbackErr);
      throw new Error("Failed to upload file. Please check your internet connection.");
    }
  }
};
