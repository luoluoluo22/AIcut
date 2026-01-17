/**
 * Export Composition - The composition used for rendering exports
 * This receives project data as props and renders the timeline
 * Uses file paths for media files (more memory efficient than data URLs)
 */

import React from "react";
import {
    AbsoluteFill,
    Sequence,
    Video,
    Audio,
    Img,
    useVideoConfig,
    OffthreadVideo,
} from "remotion";

// Simplified types for export
interface MediaElement {
    id: string;
    type: "media";
    name: string;
    mediaId: string;
    mediaType: "video" | "audio" | "image";
    startTime: number;
    duration: number;
    trimStart: number;
    trimEnd: number;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scale: number;
    opacity: number;
    volume?: number;
    muted?: boolean;
}

interface TextElement {
    id: string;
    type: "text";
    content: string;
    startTime: number;
    duration: number;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
    textAlign: "left" | "center" | "right";
    fontWeight: string;
    fontStyle: string;
    rotation: number;
    opacity: number;
}

type TimelineElement = MediaElement | TextElement;

interface Track {
    id: string;
    name: string;
    type: "media" | "audio" | "text";
    elements: TimelineElement[];
    muted: boolean;
    isHidden?: boolean;
}

interface MediaFileData {
    id: string;
    name: string;
    type: "video" | "audio" | "image";
    dataUrl?: string;  // For backwards compatibility
    filePath?: string; // File path (deprecated)
    httpUrl?: string;  // HTTP URL for Remotion to fetch
}

export interface ExportProjectData {
    tracks: Track[];
    mediaFiles: MediaFileData[];
    fps: number;
    width: number;
    height: number;
    durationInFrames: number;
    backgroundColor: string;
}

interface ExportCompositionProps {
    projectData: ExportProjectData | null;
}

export const ExportComposition: React.FC<ExportCompositionProps> = ({
    projectData,
}) => {
    const { fps, width, height } = useVideoConfig();

    if (!projectData) {
        return (
            <AbsoluteFill style={{ backgroundColor: "#000", color: "#fff" }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                    }}
                >
                    No project data provided
                </div>
            </AbsoluteFill>
        );
    }

    const { tracks, mediaFiles, backgroundColor } = projectData;

    // Create a map of mediaId -> media data
    const mediaMap = new Map<string, MediaFileData>();
    mediaFiles.forEach((m) => mediaMap.set(m.id, m));

    // Get the source URL for a media file
    const getMediaSource = (media: MediaFileData): string => {
        // Prefer HTTP URL (for server-side rendering)
        if (media.httpUrl) {
            return media.httpUrl;
        }
        // Fall back to file path
        if (media.filePath) {
            return media.filePath;
        }
        // Fall back to data URL
        if (media.dataUrl) {
            return media.dataUrl;
        }
        return "";
    };

    // Reverse tracks so bottom renders first (correct z-order)
    const reversedTracks = [...tracks].reverse();

    return (
        <AbsoluteFill style={{ backgroundColor: backgroundColor || "#000" }}>
            {reversedTracks.map((track) => {
                if (track.isHidden) return null;

                return track.elements.map((element) => {
                    if (element.type === "media") {
                        const media = mediaMap.get(element.mediaId);
                        if (!media) return null;

                        const src = getMediaSource(media);
                        if (!src) return null;

                        const startFrame = Math.round(element.startTime * fps);
                        const visibleDuration =
                            element.duration - element.trimStart - element.trimEnd;
                        const durationFrames = Math.round(visibleDuration * fps);
                        const trimStartFrame = Math.round(element.trimStart * fps);

                        // Respect track mute and element mute, otherwise use volume (default 1)
                        const volume = track.muted || element.muted ? 0 : (element.volume ?? 1);

                        return (
                            <Sequence
                                key={element.id}
                                from={startFrame}
                                durationInFrames={durationFrames}
                            >
                                {media.type === "video" ? (
                                    <OffthreadVideo
                                        src={src}
                                        startFrom={trimStartFrame}
                                        volume={volume}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "contain",
                                        }}
                                    />
                                ) : media.type === "image" ? (
                                    <Img
                                        src={src}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "contain",
                                        }}
                                    />
                                ) : media.type === "audio" ? (
                                    <Audio
                                        src={src}
                                        startFrom={trimStartFrame}
                                        volume={volume}
                                    />
                                ) : null}
                            </Sequence>
                        );
                    }

                    if (element.type === "text") {
                        const startFrame = Math.round(element.startTime * fps);
                        const durationFrames = Math.round(element.duration * fps);

                        // Resolve properties from direct or style object
                        const textContent = element.text || element.content || "";
                        const style = element.style || {};
                        const fontSize = element.fontSize ?? style.fontSize ?? 40;
                        const fontFamily = element.fontFamily ?? style.fontFamily ?? "Arial";
                        const color = element.color ?? style.color ?? "#ffffff";
                        const bg = element.backgroundColor ?? style.backgroundColor ?? "transparent";
                        const align = element.textAlign ?? style.textAlign ?? "center";
                        const weight = element.fontWeight ?? style.fontWeight ?? "normal";
                        const fStyle = element.fontStyle ?? style.fontStyle ?? "normal";

                        // Calculate transform for centering
                        // Assuming (x,y) is the center point for text
                        // We translate -50%, -50% so that left/top corresponds to center
                        const transform = `translate(-50%, -50%) rotate(${element.rotation || 0}deg)`;

                        return (
                            <Sequence
                                key={element.id}
                                from={startFrame}
                                durationInFrames={durationFrames}
                            >
                                <AbsoluteFill>
                                    <div
                                        style={{
                                            position: "absolute",
                                            left: element.x,
                                            top: element.y,
                                            fontSize,
                                            fontFamily,
                                            color,
                                            backgroundColor: bg,
                                            textAlign: align,
                                            fontWeight: weight,
                                            fontStyle: fStyle,
                                            transform,
                                            opacity: element.opacity ?? 1,
                                            whiteSpace: "pre-wrap",
                                            width: "max-content", // Ensure width fits content for centering
                                            maxWidth: "80%",      // Prevent overflow
                                        }}
                                    >
                                        {textContent}
                                    </div>
                                </AbsoluteFill>
                            </Sequence>
                        );
                    }

                    return null;
                });
            })}
        </AbsoluteFill>
    );
};
