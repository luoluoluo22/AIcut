import React from "react";
import { AbsoluteFill, Sequence, Video, Img, OffthreadVideo, Audio, useCurrentFrame } from "remotion";
import { TimelineTrack, TextElement } from "@/types/timeline";
import { MediaFile } from "@/types/media";
import { TransitionWrapper } from "./transition-wrapper";
import { interpolateKeyframes } from "@/lib/animation";

const AnimatedMediaElement: React.FC<{
    element: any;
    media: MediaFile;
    url: string;
    trackMuted: boolean;
    trimStartFrame: number;
    fps: number;
}> = ({ element, media, url, trackMuted, trimStartFrame, fps }) => {
    const frame = useCurrentFrame();
    const time = frame / fps; // Relative time in seconds

    const x = interpolateKeyframes(element.keyframes?.x, time, element.x ?? 960);
    const y = interpolateKeyframes(element.keyframes?.y, time, element.y ?? 540);
    const scale = interpolateKeyframes(element.keyframes?.scale, time, element.scale ?? 1);
    const rotation = interpolateKeyframes(element.keyframes?.rotation, time, element.rotation ?? 0);
    const opacity = interpolateKeyframes(element.keyframes?.opacity, time, element.opacity ?? 1);
    const volume = interpolateKeyframes(element.keyframes?.volume, time, element.volume ?? 1);

    // Debug log for Audio components
    if (media.type === 'audio') {
        // console.log(`[AudioRender] ${media.name} (Vol: ${volume}) Src: ${url}`);
    }

    // Cache busting: Append timestamp to URL to prevent caching of partial/empty files
    // This is critical for generated assets that might be requested before fully written
    const cacheBust = React.useMemo(() => Date.now(), [url]);
    const finalUrl = React.useMemo(() => {
        if (!url) return '';
        if (url.startsWith('blob:') || url.startsWith('data:')) return url;
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}cb=${cacheBust}`;
    }, [url, cacheBust]);

    return (
        <AbsoluteFill style={{
            opacity,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                position: 'absolute',
                left: x,
                top: y,
                width: '100%',
                height: '100%',
                transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {media.type === 'video' ? (
                    <OffthreadVideo
                        src={finalUrl}
                        startFrom={trimStartFrame}
                        volume={trackMuted || element.muted ? 0 : volume}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                        }}
                    />
                ) : media.type === 'image' ? (
                    <Img
                        src={url} // Images usually don't need this as much, and Img tag might be strict
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                        }}
                    />
                ) : media.type === 'audio' ? (
                    <Audio
                        key={`${element.id}-${url}-${Math.round((trackMuted || element.muted ? 0 : volume) * 100)}`}
                        src={finalUrl}
                        startFrom={trimStartFrame}
                        volume={trackMuted || element.muted ? 0 : volume}
                        // Force acceptable range?
                        playbackRate={1}
                    // onError={(e) => console.error("Audio Load Error", finalUrl, e)}
                    />
                ) : null}
            </div>
        </AbsoluteFill>
    );
};

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
                                <TransitionWrapper
                                    inConfig={element.transition?.in}
                                    outConfig={element.transition?.out}
                                    durationInFrames={durationFrames}
                                    fps={fps}
                                >
                                    {(() => {
                                        // Use IIFE or useCurrentFrame hook inside a separate component is better,
                                        // but since we are inside map, hooks might behave weirdly if not careful.
                                        // HOWEVER, Sequence makes children render.
                                        // The style prop calculation uses `element` values which are static here.
                                        // Remotion's Sequence doesn't magically update props frame by frame unless
                                        // calculate logic is inside a component that uses useCurrentFrame().

                                        // IMPORTANT: MainComposition is a React Component. 
                                        // The props `tracks` might not update every frame for preview playhead (in dev mode yes, but rendering?).
                                        // BUT, we need access to `useCurrentFrame()` to interpolate.
                                        // We can't call useCurrentFrame() here inside .map().
                                        // So we MUST wrap the content in a component.

                                        return (
                                            <AnimatedMediaElement
                                                element={element}
                                                media={media}
                                                url={url}
                                                trackMuted={track.muted ?? false}
                                                trimStartFrame={trimStartFrame}
                                                fps={fps}
                                            />
                                        );
                                    })()}
                                </TransitionWrapper>
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
                                        {textElement.text || textElement.content || ""}
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
