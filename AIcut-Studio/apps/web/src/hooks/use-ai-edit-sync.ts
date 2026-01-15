/**
 * AI Edit Hook - Polls for pending AI edits and applies them to the timeline
 */

import { useEffect, useCallback, useRef } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";

interface PendingEdit {
    id: string;
    action: string;
    data: any;
    timestamp: number;
}

export function useAIEditSync(enabled: boolean = true) {
    const { addElementToTrack, removeElement, updateElement, tracks, addTrack } = useTimelineStore();
    const processedIds = useRef<Set<string>>(new Set());
    const lastPollTime = useRef<number>(0);

    const applyEdit = useCallback((edit: PendingEdit) => {
        console.log("[AI Edit] Applying:", edit.action, edit.data);
        const currentTracks = useTimelineStore.getState().tracks;

        switch (edit.action) {
            case "addSubtitle":
            case "addText": {
                const data = edit.data;

                // Find text track or use first track
                let textTrack = currentTracks.find(t => t.type === "text");

                if (!textTrack) {
                    // Create text track
                    useTimelineStore.getState().addTrack("text");
                    // Get updated tracks
                    const updatedTracks = useTimelineStore.getState().tracks;
                    textTrack = updatedTracks.find(t => t.type === "text");
                }

                if (textTrack) {
                    useTimelineStore.getState().addElementToTrack(textTrack.id, {
                        type: "text",
                        name: data.text.substring(0, 20) + (data.text.length > 20 ? "..." : ""),
                        content: data.text,
                        startTime: data.startTime || 0,
                        duration: data.duration || 5,
                        trimStart: 0,
                        trimEnd: 0,
                        x: data.x ?? DEFAULT_TEXT_ELEMENT.x,
                        y: data.y ?? DEFAULT_TEXT_ELEMENT.y,
                        fontSize: data.fontSize ?? DEFAULT_TEXT_ELEMENT.fontSize,
                        fontFamily: data.fontFamily ?? DEFAULT_TEXT_ELEMENT.fontFamily,
                        color: data.color ?? DEFAULT_TEXT_ELEMENT.color,
                        backgroundColor: data.backgroundColor ?? DEFAULT_TEXT_ELEMENT.backgroundColor,
                        textAlign: data.textAlign ?? DEFAULT_TEXT_ELEMENT.textAlign,
                        fontWeight: DEFAULT_TEXT_ELEMENT.fontWeight,
                        fontStyle: DEFAULT_TEXT_ELEMENT.fontStyle,
                        textDecoration: DEFAULT_TEXT_ELEMENT.textDecoration,
                        rotation: 0,
                        opacity: 1,
                    });
                }
                break;
            }

            case "addMultipleSubtitles": {
                const subtitles = edit.data.subtitles || [];

                // Find or create text track
                let textTrack = currentTracks.find(t => t.type === "text");

                if (!textTrack) {
                    useTimelineStore.getState().addTrack("text");
                    const updatedTracks = useTimelineStore.getState().tracks;
                    textTrack = updatedTracks.find(t => t.type === "text");
                }

                if (textTrack) {
                    for (const sub of subtitles) {
                        useTimelineStore.getState().addElementToTrack(textTrack.id, {
                            type: "text",
                            name: sub.text.substring(0, 20),
                            content: sub.text,
                            startTime: sub.startTime || 0,
                            duration: sub.duration || 3,
                            trimStart: 0,
                            trimEnd: 0,
                            x: sub.x ?? DEFAULT_TEXT_ELEMENT.x,
                            y: sub.y ?? DEFAULT_TEXT_ELEMENT.y,
                            fontSize: sub.fontSize ?? DEFAULT_TEXT_ELEMENT.fontSize,
                            fontFamily: sub.fontFamily ?? DEFAULT_TEXT_ELEMENT.fontFamily,
                            color: sub.color ?? DEFAULT_TEXT_ELEMENT.color,
                            backgroundColor: sub.backgroundColor ?? DEFAULT_TEXT_ELEMENT.backgroundColor,
                            textAlign: sub.textAlign ?? DEFAULT_TEXT_ELEMENT.textAlign,
                            fontWeight: DEFAULT_TEXT_ELEMENT.fontWeight,
                            fontStyle: DEFAULT_TEXT_ELEMENT.fontStyle,
                            textDecoration: DEFAULT_TEXT_ELEMENT.textDecoration,
                            rotation: 0,
                            opacity: 1,
                        });
                    }
                }
                break;
            }

            case "clearSubtitles": {
                // Remove all text elements
                for (const track of currentTracks) {
                    if (track.type === "text") {
                        for (const element of [...track.elements]) {
                            useTimelineStore.getState().removeElement(element.id);
                        }
                    }
                }
                break;
            }

            case "removeElement": {
                if (edit.data.elementId) {
                    useTimelineStore.getState().removeElement(edit.data.elementId);
                }
                break;
            }

            case "updateElement": {
                if (edit.data.elementId && edit.data.updates) {
                    useTimelineStore.getState().updateElement(edit.data.elementId, edit.data.updates);
                }
                break;
            }

            case "setFullState": {
                if (edit.data.tracks) {
                    useTimelineStore.getState().setTracks(edit.data.tracks);
                }
                break;
            }

            default:
                console.warn("[AI Edit] Unknown action:", edit.action);
        }
    }, []);

    // --- Hot Sync via SSE (The Ultimate Solution) ---
    useEffect(() => {
        if (!enabled) return;

        console.log("[AI Sync] Establishing SSE connection for hot-reload...");
        const eventSource = new EventSource("/api/ai-edit/sync");

        eventSource.addEventListener("update", (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("[AI Sync] Received hot-update:", data.action);

                if (data.action === "setFullState" && data.tracks) {
                    // Avoid loops: check if received tracks are effectively different from current
                    const currentTracksSnapshot = JSON.stringify(useTimelineStore.getState().tracks);
                    const newTracksSnapshot = JSON.stringify(data.tracks);
                    if (currentTracksSnapshot !== newTracksSnapshot) {
                        console.log("[AI Sync] Applying external track hot-update...");
                        useTimelineStore.getState().setTracks(data.tracks);
                    }

                    // Also check for project metadata changes (ID, Name, Canvas, FPS)
                    if (data.project) {
                        const projectStore = useProjectStore.getState();
                        const currentProject = projectStore.activeProject;

                        if (currentProject) {
                            const updates: any = {};
                            if (data.project.name && data.project.name !== currentProject.name) updates.name = data.project.name;
                            if (data.project.fps && data.project.fps !== currentProject.fps) updates.fps = data.project.fps;
                            if (data.project.backgroundColor && data.project.backgroundColor !== currentProject.backgroundColor) updates.backgroundColor = data.project.backgroundColor;

                            if (Object.keys(updates).length > 0) {
                                console.log("[AI Sync] Applying project metadata update:", updates);
                                projectStore.updateProject(updates);
                            }
                        }
                    }
                } else if (data.action === "updateElement" && data.elementId) {
                    useTimelineStore.getState().updateElement(data.elementId, data.updates);
                }
                // We can add more specific hot-sync actions here
            } catch (e) {
                console.error("[AI Sync] Failed to parse SSE data:", e);
            }
        });

        eventSource.onerror = (e) => {
            console.warn("[AI Sync] SSE Connection lost, will retry...", e);
        };

        return () => {
            eventSource.close();
            console.log("[AI Sync] SSE Connection closed.");
        };
    }, [enabled]);

    // --- Professional Debounced Reporter ---
    const reportTimeout = useRef<NodeJS.Timeout | null>(null);
    const lastReportedState = useRef<string>("");

    const reportState = useCallback(async () => {
        const tracks = useTimelineStore.getState().tracks;
        const mediaFiles = useMediaStore.getState().mediaFiles;
        const activeProject = useProjectStore.getState().activeProject;

        if (!activeProject) return;

        // Create a summary to check for changes - now includes a simple stable hash of the track structure
        // We focus on things that matter for the global view
        const stateSummary = JSON.stringify({
            projectId: activeProject.id,
            lastTracksHash: tracks.map(t => ({
                id: t.id,
                elements: t.elements.map(e => ({
                    id: e.id,
                    start: e.startTime,
                    content: (e as any).content,
                    x: (e as any).x,
                    y: (e as any).y,
                    scale: (e as any).scale,
                    rotation: (e as any).rotation,
                    opacity: (e as any).opacity,
                    volume: (e as any).volume
                }))
            })),
            assetCount: mediaFiles.length
        });

        // Only report if significantly changed (simplified check)
        // For a true pro version, we'd do a deeper check or use a version counter
        if (stateSummary === lastReportedState.current) return;

        try {
            console.log("[AI Sync] Reporting state to global view (debounced)...");
            await fetch("/api/ai-edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "updateSnapshot",
                    data: {
                        project: activeProject,
                        tracks,
                        assets: mediaFiles.map(m => ({
                            id: m.id,
                            name: m.name,
                            type: m.type,
                            duration: m.duration,
                            width: m.width,
                            height: m.height
                        }))
                    }
                })
            });
            lastReportedState.current = stateSummary;
        } catch (e) {
            console.error("[AI Sync] Failed to report state:", e);
        }
    }, []);

    // Reactively watch for changes
    useEffect(() => {
        if (!enabled) return;

        // Clear previous pending report
        if (reportTimeout.current) {
            clearTimeout(reportTimeout.current);
        }

        // Set a new debounced report (3 seconds of inactivity)
        reportTimeout.current = setTimeout(() => {
            reportState();
        }, 3000);

        return () => {
            if (reportTimeout.current) clearTimeout(reportTimeout.current);
        };
    }, [enabled, tracks, reportState]); // tracks changes trigger the effect

    useEffect(() => {
        if (!enabled) return;

        // Initial check for any leftover edits
        // pollForEdits(); // We could keep one initial poll if needed
    }, [enabled]);

    return {
        triggerSync: () => { console.log("[AI Sync] Manual sync trigger is now handled via SSE."); },
    };
}
