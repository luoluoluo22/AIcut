"use client";

import React, { useEffect, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { MainComposition } from "./composition";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useProjectStore, DEFAULT_FPS, DEFAULT_CANVAS_SIZE } from "@/stores/project-store";
import { useMediaUrls } from "@/hooks/use-media-urls";

export const RemotionPlayerWrapper = () => {
    const tracks = useTimelineStore((state) => state.tracks);
    const mediaFiles = useMediaStore((state) => state.mediaFiles);
    const { currentState: playbackState, toggle: togglePlayback, setCurrentTime, isPlaying, currentTime } = usePlaybackStore();
    const { activeProject } = useProjectStore();

    const playerRef = useRef<PlayerRef>(null);
    const mediaUrls = useMediaUrls(mediaFiles);

    const fps = activeProject?.fps || DEFAULT_FPS;
    const canvasSize = activeProject?.canvasSize || DEFAULT_CANVAS_SIZE;
    const timelineDuration = useTimelineStore((state) => state.getTotalDuration());
    const durationInFrames = Math.max(1, Math.ceil((isNaN(timelineDuration) ? 0 : timelineDuration) * fps)) || 1;

    // Optimize inputProps to prevent unnecessary re-renders inside Player
    const inputProps = React.useMemo(() => ({
        tracks,
        mediaFiles,
        mediaUrls,
        fps,
    }), [tracks, mediaFiles, mediaUrls, fps]);

    // Sync: OpenCut Store -> Remotion Player
    useEffect(() => {
        if (playerRef.current) {
            // Sync playing state
            if (isPlaying && !playerRef.current.isPlaying()) {
                playerRef.current.play();
            } else if (!isPlaying && playerRef.current.isPlaying()) {
                playerRef.current.pause();
            }
        }
    }, [isPlaying]);

    // Sync: OpenCut Store -> Remotion Player
    useEffect(() => {
        if (playerRef.current) {
            const playerFrame = playerRef.current.getCurrentFrame();
            const storeFrame = currentTime * fps;

            const diff = Math.abs(playerFrame - storeFrame);

            if (isPlaying) {
                // When playing, only seek if there is a significant jump (user click/seek)
                // We ignore small drifts (e.g. < 5 frames) which are likely just update lags
                if (diff > 5) {
                    playerRef.current.seekTo(storeFrame);
                }
            } else {
                // When paused (scrubbing), we want precise sync
                if (diff > 0.01) {
                    playerRef.current.seekTo(storeFrame);
                }
            }
        }
    }, [currentTime, fps, isPlaying]);

    return (
        <div className="w-full h-full flex items-center justify-center bg-transparent">
            <Player
                ref={playerRef}
                component={MainComposition}
                inputProps={inputProps}
                durationInFrames={durationInFrames}
                compositionWidth={canvasSize.width}
                compositionHeight={canvasSize.height}
                fps={fps}
                style={{
                    width: "100%",
                    height: "100%",
                    maxWidth: "100%",
                    maxHeight: "100%",
                }}
                controls={false} // We provide our own controls via OpenCut UI
                // Sync: Remotion Player -> OpenCut Store
                onFrameUpdate={(frame) => {
                    // Only update store if playing, to drive the timeline cursor
                    if (isPlaying) {
                        setCurrentTime(frame / fps);
                    }
                }}
            />
        </div>
    );
};
