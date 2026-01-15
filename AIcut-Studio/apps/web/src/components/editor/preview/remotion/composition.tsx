import React from "react";
import { AbsoluteFill, Sequence, Video, Img, OffthreadVideo, Audio } from "remotion";
import { TimelineTrack, TextElement } from "@/types/timeline";
import { MediaFile } from "@/types/media";

interface MainCompositionProps {
    tracks: TimelineTrack[];
    mediaFiles: MediaFile[];
    mediaUrls: Record<string, string>; // Maps mediaId -> blobUrl
    fps: number;
}

export const MainComposition: React.FC<MainCompositionProps> = ({
    tracks,
    mediaFiles,
    mediaUrls,
    fps,
}) => {
    // OpenCut tracks: Index 0 is Top track.
    // We want to render Bottom track first so Top covers it.
    // So we reverse the tracks array.
    const reversedTracks = [...tracks].reverse();

    return (
        <AbsoluteFill style={{ backgroundColor: "#000" }}>
            {reversedTracks.map((track) => {
                if (track.isHidden) return null;

                return track.elements.map((element) => {
                    // Handle media elements
                    if (element.type === "media") {
                        const media = mediaFiles.find((m) => m.id === element.mediaId);
                        if (!media) return null;

                        const url = mediaUrls[element.mediaId];
                        if (!url) return null;

                        // Calculate frames
                        const startFrame = Math.round(element.startTime * fps);
                        const durationFrames = Math.round(
                            (element.duration - element.trimStart - element.trimEnd) * fps
                        );
                        const trimStartFrame = Math.round(element.trimStart * fps);

                        return (
                            <Sequence
                                key={element.id}
                                from={startFrame}
                                durationInFrames={durationFrames}
                            >
                                <AbsoluteFill style={{
                                    opacity: element.opacity ?? 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: element.x ?? 960,
                                        top: element.y ?? 540,
                                        width: '100%',
                                        height: '100%',
                                        transform: `translate(-50%, -50%) scale(${element.scale ?? 1}) rotate(${element.rotation ?? 0}deg)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {media.type === 'video' ? (
                                            <OffthreadVideo
                                                src={url}
                                                startFrom={trimStartFrame}
                                                volume={track.muted || element.muted ? 0 : (element.volume ?? 1)}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain'
                                                }}
                                            />
                                        ) : media.type === 'image' ? (
                                            <Img
                                                src={url}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain'
                                                }}
                                            />
                                        ) : media.type === 'audio' ? (
                                            <Audio
                                                src={url}
                                                startFrom={trimStartFrame}
                                                volume={track.muted || element.muted ? 0 : (element.volume ?? 1)}
                                            />
                                        ) : null}
                                    </div>
                                </AbsoluteFill>
                            </Sequence>
                        );
                    }

                    // Handle text elements
                    if (element.type === "text") {
                        const textElement = element as TextElement;
                        const startFrame = Math.round(textElement.startTime * fps);
                        const durationFrames = Math.round(
                            (textElement.duration - textElement.trimStart - textElement.trimEnd) * fps
                        );

                        return (
                            <Sequence
                                key={textElement.id}
                                from={startFrame}
                                durationInFrames={durationFrames}
                            >
                                <AbsoluteFill>
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: textElement.x,
                                            top: textElement.y,
                                            transform: `translate(-50%, -50%) rotate(${textElement.rotation || 0}deg)`,
                                            fontSize: textElement.fontSize,
                                            fontFamily: textElement.fontFamily,
                                            fontWeight: textElement.fontWeight,
                                            fontStyle: textElement.fontStyle,
                                            textDecoration: textElement.textDecoration,
                                            color: textElement.color,
                                            backgroundColor: textElement.backgroundColor === 'transparent'
                                                ? 'transparent'
                                                : textElement.backgroundColor,
                                            padding: textElement.backgroundColor !== 'transparent' ? '8px 16px' : '0',
                                            borderRadius: textElement.backgroundColor !== 'transparent' ? '4px' : '0',
                                            textAlign: textElement.textAlign,
                                            opacity: textElement.opacity,
                                            whiteSpace: 'pre-wrap',
                                            maxWidth: '90%',
                                        }}
                                    >
                                        {textElement.content}
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
