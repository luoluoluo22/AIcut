import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore, DEFAULT_FPS, DEFAULT_CANVAS_SIZE } from "@/stores/project-store";
import { ExportOptions, ExportResult } from "@/types/export";

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "mp4",
  quality: "high",
  includeAudio: true,
};

// Generate unique export ID
function generateExportId(): string {
  return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function exportProject(
  options: ExportOptions
): Promise<ExportResult> {
  const exportId = generateExportId();
  let eventSource: EventSource | null = null;

  try {
    // Get current state from stores
    const { tracks } = useTimelineStore.getState();
    const { mediaFiles } = useMediaStore.getState();
    const { activeProject } = useProjectStore.getState();

    if (!activeProject) {
      return {
        success: false,
        error: "No active project",
      };
    }

    if (tracks.length === 0 || tracks.every((t) => t.elements.length === 0)) {
      return {
        success: false,
        error: "Timeline is empty. Add some media before exporting.",
      };
    }

    const fps = activeProject.fps || DEFAULT_FPS;
    const canvasWidth = activeProject.canvasSize?.width || DEFAULT_CANVAS_SIZE.width;
    const canvasHeight = activeProject.canvasSize?.height || DEFAULT_CANVAS_SIZE.height;
    const backgroundColor = activeProject.backgroundColor || "#000000";

    // Start listening for progress updates via SSE
    eventSource = new EventSource(`/api/export/progress?id=${exportId}`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress !== undefined && options.onProgress) {
          options.onProgress(data.progress);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };
    eventSource.onerror = () => {
      // SSE connection error - progress updates will stop but export continues
      console.warn("SSE connection error, progress updates may be delayed");
    };

    // Report initial progress
    options.onProgress?.(2);

    // Calculate total duration
    let maxEndTime = 0;
    tracks.forEach((track) => {
      track.elements.forEach((element) => {
        const endTime =
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd);
        if (endTime > maxEndTime) {
          maxEndTime = endTime;
        }
      });
    });
    const durationInFrames = Math.max(1, Math.ceil(maxEndTime * fps));

    // Prepare tracks data
    const exportTracks = tracks.map((track) => ({
      id: track.id,
      name: track.name,
      type: track.type,
      elements: track.elements.map((element) => {
        if (element.type === "media") {
          const media = mediaFiles.find((m) => m.id === element.mediaId);
          const el = element as any;
          return {
            id: element.id,
            type: "media" as const,
            name: element.name,
            mediaId: element.mediaId,
            mediaType: media?.type || "video",
            startTime: element.startTime,
            duration: element.duration,
            trimStart: element.trimStart,
            trimEnd: element.trimEnd,
            x: el.x ?? 0,
            y: el.y ?? 0,
            width: el.width ?? canvasWidth,
            height: el.height ?? canvasHeight,
            rotation: el.rotation ?? 0,
            scale: el.scale ?? 1,
            opacity: el.opacity ?? 1,
            muted: element.muted,
          };
        } else if (element.type === "text") {
          return {
            id: element.id,
            type: "text" as const,
            content: element.content,
            startTime: element.startTime,
            duration: element.duration,
            x: element.x,
            y: element.y,
            fontSize: element.fontSize,
            fontFamily: element.fontFamily,
            color: element.color,
            backgroundColor: element.backgroundColor,
            textAlign: element.textAlign,
            fontWeight: element.fontWeight,
            fontStyle: element.fontStyle,
            rotation: element.rotation,
            opacity: element.opacity,
          };
        }
        return element;
      }),
      muted: track.muted || false,
      isHidden: false,
    }));

    // Prepare media metadata
    const mediaMetadata = mediaFiles.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
    }));

    // Build FormData
    const formData = new FormData();

    formData.append("projectData", JSON.stringify({
      tracks: exportTracks,
      mediaMetadata,
      fps,
      width: canvasWidth,
      height: canvasHeight,
      durationInFrames,
      backgroundColor,
    }));

    formData.append("format", options.format);
    formData.append("quality", options.quality);
    formData.append("exportId", exportId);

    // Add media files
    for (const media of mediaFiles) {
      if (media.file) {
        formData.append(`media_${media.id}`, media.file, media.name);
      }
    }

    console.log("Starting export...");
    console.log("Duration:", durationInFrames, "frames @", fps, "fps");
    console.log("Media files:", mediaFiles.length);
    console.log("Export ID:", exportId);

    // Call the export API
    const response = await fetch("/api/export", {
      method: "POST",
      body: formData,
    });

    // Close SSE connection
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    if (!response.ok) {
      let errorMessage = "Export failed";
      try {
        const error = await response.json();
        errorMessage = error.details || error.error || errorMessage;
      } catch {
        errorMessage = `Export failed with status ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    options.onProgress?.(100);

    // Convert blob to ArrayBuffer
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    return {
      success: true,
      buffer: new Uint8Array(buffer),
    };
  } catch (error) {
    console.error("Export failed:", error);

    // Close SSE connection on error
    if (eventSource) {
      eventSource.close();
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown export error",
    };
  }
}

export function getExportMimeType(format: "mp4" | "webm"): string {
  return format === "webm" ? "video/webm" : "video/mp4";
}

export function getExportFileExtension(format: "mp4" | "webm"): string {
  return `.${format}`;
}
