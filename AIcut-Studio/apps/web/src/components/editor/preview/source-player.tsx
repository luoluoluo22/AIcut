"use client";

import React, { useEffect, useRef } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { useMediaPanelStore } from "../media-panel/store";
import { SourcePreviewComposition } from "./remotion/source-preview";
import { useProjectStore, DEFAULT_FPS, DEFAULT_CANVAS_SIZE } from "@/stores/project-store";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack } from "lucide-react";
import { formatTimeCode } from "@/lib/time";
import { EditableTimecode } from "@/components/ui/editable-timecode";
import { Slider } from "@/components/ui/slider";

export const SourcePlayer = () => {
    const {
        previewMedia,
        isPreviewPlaying,
        previewTime,
        setPreviewPlaying,
        setPreviewTime
    } = useMediaPanelStore();
    const { activeProject } = useProjectStore();
    const playerRef = useRef<PlayerRef>(null);

    const fps = activeProject?.fps || DEFAULT_FPS;
    const canvasSize = activeProject?.canvasSize || DEFAULT_CANVAS_SIZE;

    // Safety check
    if (!previewMedia) return null;

    const duration = previewMedia.duration || 5;
    const durationInFrames = Math.max(1, Math.ceil(duration * fps));

    const isPreviewPlayingRef = useRef(isPreviewPlaying);
    useEffect(() => {
        isPreviewPlayingRef.current = isPreviewPlaying;
    }, [isPreviewPlaying]);

    // Sync Store -> Player
    useEffect(() => {
        if (playerRef.current) {
            if (isPreviewPlaying && !playerRef.current.isPlaying()) {
                playerRef.current.play();
            } else if (!isPreviewPlaying && playerRef.current.isPlaying()) {
                playerRef.current.pause();
            }
        }
    }, [isPreviewPlaying]);

    useEffect(() => {
        if (playerRef.current) {
            const currentFrame = playerRef.current.getCurrentFrame();
            const targetFrame = previewTime * fps;
            // Only seek if difference is significant to avoid stutter during playback updates
            if (Math.abs(currentFrame - targetFrame) > 1) {
                playerRef.current.seekTo(targetFrame);
            }
        }
    }, [previewTime, fps]);


    const togglePlayback = () => setPreviewPlaying(!isPreviewPlaying);

    const handleSeek = (time: number) => {
        setPreviewTime(Math.max(0, Math.min(time, duration)));
    };

    return (
        <div className="w-full h-full flex flex-col bg-panel rounded-sm overflow-hidden">

            <div className="flex-1 relative flex items-center justify-center overflow-hidden"
                style={{
                    background: activeProject?.backgroundColor || "#000"
                }}>
                <Player
                    key={previewMedia.id}
                    ref={playerRef}
                    component={SourcePreviewComposition}
                    inputProps={{ media: previewMedia }}
                    durationInFrames={durationInFrames}
                    compositionWidth={canvasSize.width}
                    compositionHeight={canvasSize.height}
                    fps={fps}
                    style={{
                        width: "100%",
                        height: "100%",
                        maxWidth: "100%",
                        maxHeight: "100%"
                    }}
                    controls={false}
                    onFrameUpdate={(frame) => {
                        setPreviewTime(frame / fps);
                    }}
                    loop={false}
                    onEnded={() => {
                        setPreviewPlaying(false);
                    }}
                />
            </div>

            {/* Source Preview Toolbar */}
            <div className="h-10 border-t flex items-center px-2 gap-2 bg-background select-none shrink-0">
                <div className="flex items-center gap-1 text-[0.70rem] tabular-nums text-foreground/90">
                    <EditableTimecode
                        time={previewTime}
                        duration={duration}
                        format="HH:MM:SS:FF"
                        fps={fps}
                        onTimeChange={handleSeek}
                        className="text-foreground/90 hover:bg-white/10"
                    />
                    <span className="opacity-50">/</span>
                    <span>{formatTimeCode(duration, "HH:MM:SS:FF", fps)}</span>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSeek(0)}>
                        <SkipBack className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={togglePlayback}>
                        {isPreviewPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                </div>

                <div className="flex-1 flex items-center px-2">
                    <Slider
                        value={[previewTime]}
                        min={0}
                        max={duration}
                        step={1 / fps}
                        onValueChange={(val) => {
                            setPreviewPlaying(false);
                            handleSeek(val[0]);
                        }}
                        className="cursor-pointer"
                    />
                </div>

                <div className="text-xs text-muted-foreground truncate max-w-[150px] px-2" title={previewMedia.name}>
                    Source: {previewMedia.name}
                </div>
            </div>
        </div>
    );
}
