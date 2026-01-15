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
                                        volume={track.muted || element.muted ? 0 : 1}
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
                                        volume={track.muted || element.muted ? 0 : 1}
                                    />
                                ) : null}
                            </Sequence>
                        );
                    }

                    if (element.type === "text") {
                        const startFrame = Math.round(element.startTime * fps);
                        const durationFrames = Math.round(element.duration * fps);

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
                                            fontSize: element.fontSize,
                                            fontFamily: element.fontFamily,
                                            color: element.color,
                                            backgroundColor: element.backgroundColor || "transparent",
                                            textAlign: element.textAlign,
                                            fontWeight: element.fontWeight,
                                            fontStyle: element.fontStyle,
                                            transform: `rotate(${element.rotation}deg)`,
                                            opacity: element.opacity,
                                            whiteSpace: "pre-wrap",
                                        }}
                                    >
                                        {element.content}
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
