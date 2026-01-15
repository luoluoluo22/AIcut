// MOCKED mediabunny-utils to remove mediabunny and @ffmpeg/ffmpeg dependencies

export interface VideoInfo {
  width: number;
  height: number;
  duration: number;
  format: string;
}

export const getVideoInfo = async (file: File): Promise<VideoInfo> => {
  console.log("[Mock] getVideoInfo for", file.name);
  return new Promise((resolve) => {
    // Create a dummy video element to get dimensions (browser native way, no ffmpeg needed)
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve({
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
        duration: video.duration || 10,
        format: file.type
      });
    }
    video.onerror = () => {
      resolve({
        width: 1920,
        height: 1080,
        duration: 0,
        format: 'unknown'
      });
    }
    video.src = URL.createObjectURL(file);
  });
};

export const generateThumbnail = async (
  file: File,
  time: number = 0
): Promise<string> => {
  console.log("[Native] generateThumbnail for", file.name);
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
      video.remove();
    };

    video.onloadeddata = () => {
      video.currentTime = time;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        // Resize to reasonable thumbnail size
        const aspect = video.videoWidth / video.videoHeight;
        canvas.width = 320;
        canvas.height = 320 / aspect;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        } else {
          resolve(""); // fallback
        }
      } catch (e) {
        console.error("Thumbnail generation failed", e);
        resolve("");
      } finally {
        cleanup();
      }
    };

    video.onerror = () => {
      console.error("Video load error for thumbnail");
      cleanup();
      resolve("");
    };
  });
};

export const extractTimelineAudio = async (
  timelineData: any // Use any to avoid complex type deps for now
): Promise<Blob> => {
  console.log("[Mock] extractTimelineAudio");
  return new Blob([], { type: 'audio/wav' });
};
