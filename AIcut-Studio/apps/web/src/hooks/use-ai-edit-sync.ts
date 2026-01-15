/**
 * AI Edit Hook - Polls for pending AI edits and applies them to the timeline
 */

import { useEffect, useCallback, useRef } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore, getMediaDuration } from "@/stores/media-store";
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
                if (subtitles.length === 0) break;

                const store = useTimelineStore.getState();

                // 1. 总是新建一条轨道
                const targetTrackId = store.addTrack("text");
                // 重构轨道名称
                store.updateTrack(targetTrackId, { name: `AI 字幕` });

                if (targetTrackId) {
                    console.log(`[AI Edit] Syncing ${subtitles.length} subtitles to NEW track ${targetTrackId}`);
                    for (const sub of subtitles) {
                        store.addElementToTrack(targetTrackId, {
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
                // Remove text elements from "AI 字幕" tracks within range if specified
                const store = useTimelineStore.getState();
                const freshTracks = store.tracks;
                const rangeStart = edit.data.startTime;
                const rangeDur = edit.data.duration;

                for (const track of freshTracks) {
                    if (track.type === "text" && (track.name === "AI 字幕" || !rangeStart)) {
                        for (const element of [...track.elements]) {
                            const elStart = element.startTime;
                            const elEnd = element.startTime + (element.duration - element.trimStart - element.trimEnd);

                            let shouldRemove = true;
                            if (rangeStart !== undefined && rangeDur !== undefined) {
                                const rangeEnd = rangeStart + rangeDur;
                                // 如果元素与范围有交集，则删除
                                shouldRemove = !(elEnd <= rangeStart || elStart >= rangeEnd);
                            }

                            if (shouldRemove) {
                                store.removeElementFromTrackWithRipple(track.id, element.id, false);
                            }
                        }
                    }
                }
                break;
            }

            case "removeElement": {
                if (edit.data.elementId && edit.data.trackId) {
                    useTimelineStore.getState().removeElementFromTrackWithRipple(edit.data.trackId, edit.data.elementId);
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

            case "importAudioBatch": {
                if (edit.data.items && Array.isArray(edit.data.items)) {
                    console.log(`[AI Edit] Processing batch audio import: ${edit.data.items.length} items`);
                    edit.data.items.forEach((item: any) => {
                        applyEdit({
                            ...edit,
                            id: `${edit.id}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID for sub-event
                            action: "importAudio",
                            data: item
                        });
                    });
                }
                break;
            }

            case "importAudio": {
                // 从本地路径导入音频并添加到时间轴
                const { filePath, name, startTime, duration } = edit.data;
                if (!filePath) break;

                (async () => {
                    try {
                        // 调用 API 获取文件内容
                        const response = await fetch("/api/media/import-local", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ filePath, name, type: "audio", duration, startTime })
                        });

                        if (!response.ok) {
                            console.error("[AI Edit] Failed to import audio:", await response.text());
                            return;
                        }

                        const result = await response.json();
                        if (!result.success || !result.media) {
                            console.error("[AI Edit] Import response error:", result);
                            return;
                        }

                        const { media } = result;

                        // 将 base64 转换为 File 对象
                        const byteCharacters = atob(media.data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                            byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: media.mimeType });
                        const file = new File([blob], media.name, { type: media.mimeType });

                        // Calculate real duration for accurate timeline placement
                        // Calculate real duration for accurate timeline placement
                        let realDuration = 0;
                        try {
                            realDuration = await getMediaDuration(file);
                        } catch (err) {
                            console.warn("[AI Edit] Failed to calculate duration, using fallback:", err);
                        }

                        // Fallback if calculation failed
                        if (!realDuration) {
                            realDuration = Math.max(media.duration || 0, 3);
                        }

                        // 添加到 MediaStore
                        const activeProject = useProjectStore.getState().activeProject;
                        if (!activeProject) {
                            console.error("[AI Edit] No active project found for import");
                            return;
                        }

                        const addedMedia = await useMediaStore.getState().addMediaFile(activeProject.id, {
                            name: media.name,
                            type: "audio",
                            file: file,
                            url: URL.createObjectURL(file),
                            duration: realDuration || media.duration || 0,
                            filePath: filePath, // Electron 用的原始路径
                        });

                        if (!addedMedia) {
                            console.error("[AI Edit] Failed to add media to store");
                            return;
                        }

                        // 从 SDK 返回的 metadata 中获取 startTime
                        const start_time = media.metadata?.startTime ?? startTime ?? 0;

                        // 创建或找到音频轨道 (Find or create/reuse track)
                        const store = useTimelineStore.getState();
                        let audioTrack = store.tracks.find(t => t.name === "AI 语音轨");

                        if (!audioTrack) {
                            // Try to find an empty audio track to reuse
                            audioTrack = store.tracks.find(t => t.type === "audio" && t.elements.length === 0);

                            if (audioTrack) {
                                store.updateTrack(audioTrack.id, { name: "AI 语音轨" });
                            } else {
                                // Create a new one
                                const newTrackId = store.addTrack("audio");
                                store.updateTrack(newTrackId, { name: "AI 语音轨" });
                                // Re-get tracks to ensure we have the latest
                                audioTrack = useTimelineStore.getState().tracks.find(t => t.id === newTrackId);
                            }
                        }

                        if (audioTrack) {
                            useTimelineStore.getState().addElementToTrack(audioTrack.id, {
                                type: "media",
                                mediaId: addedMedia.id,
                                name: addedMedia.name,
                                startTime: start_time,
                                duration: media.duration || addedMedia.duration || 3,
                                trimStart: 0,
                                trimEnd: 0,
                                muted: false,
                                volume: 1.0,
                                x: 0.5,
                                y: 0.5,
                                scale: 1,
                                rotation: 0,
                                opacity: 1,
                            });
                            console.log("[AI Edit] Audio imported and added to track successfully:", addedMedia.name);
                        }
                    } catch (e) {
                        console.error("[AI Edit] Import audio error:", e);
                    }
                })();
                break;
            }

            default:
                console.warn("[AI Edit] Unknown action:", edit.action);
        }
    }, []);


    // 监听来自 Electron 主进程的 Python 日志 (IPC Channel)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            const handlePythonLog = (text: string) => {
                // Handle multiple lines in one chunk (fixes JSON parse errors when events are batched)
                const lines = text.split(/\r?\n/);

                for (const line of lines) {
                    if (!line.trim()) continue;

                    // Check for IPC Events from Python
                    const eventIndex = line.indexOf("::AI_EVENT::");
                    if (eventIndex !== -1) {
                        try {
                            // Extract potential log before the event
                            if (eventIndex > 0) {
                                console.log("%c[Python AI]", "color: #3b82f6; font-weight: bold", line.substring(0, eventIndex));
                            }

                            const jsonStr = line.substring(eventIndex + "::AI_EVENT::".length).trim();
                            const event = JSON.parse(jsonStr);
                            console.log("%c[AI IPC]", "color: #10b981; font-weight: bold", "Received Event:", event.action);

                            // Apply the edit directly
                            if (!processedIds.current.has(event.id)) {
                                processedIds.current.add(event.id);
                                applyEdit(event);
                            }
                        } catch (err) {
                            console.error("[AI IPC] Parse error:", err, "Line:", line);
                            // Fallback: log the original line so we don't lose the info
                            console.log("%c[Python AI]", "color: #3b82f6; font-weight: bold", line);
                        }
                    } else {
                        // Normal log
                        console.log("%c[Python AI]", "color: #3b82f6; font-weight: bold", line);
                    }
                }
            };
            window.electronAPI.on('python-output', handlePythonLog);
            return () => {
                if (window.electronAPI) {
                    window.electronAPI.removeListener('python-output', handlePythonLog);
                }
            };
        }
    }, [applyEdit]);

    // --- Hot Sync via SSE (The Ultimate Solution) ---
    useEffect(() => {
        if (!enabled) return;

        console.log("[AI Sync] Establishing SSE connection for hot-reload...");
        const eventSource = new EventSource("/api/ai-edit/sync");

        // Handle full snapshot updates (from project-snapshot.json)
        eventSource.addEventListener("snapshot_update", (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("[AI Sync] Received snapshot update:", data);

                if (data.tracks) {
                    const currentTracksSnapshot = JSON.stringify(useTimelineStore.getState().tracks);
                    const newTracksSnapshot = JSON.stringify(data.tracks);

                    // Only update if fundamentally different to avoid loop
                    if (currentTracksSnapshot !== newTracksSnapshot) {
                        console.log("[AI Sync] Applying external track snapshot update...");
                        useTimelineStore.getState().setTracks(data.tracks);
                    }
                }

                // Update Project Metadata
                const projectStore = useProjectStore.getState();
                const currentProject = projectStore.activeProject;

                if (currentProject) {
                    const updates: any = {};
                    // Check common fields
                    if (data.name && data.name !== currentProject.name) updates.name = data.name;
                    if (data.fps && data.fps !== currentProject.fps) updates.fps = data.fps;
                    if (data.width && data.width !== currentProject.width) updates.width = data.width;
                    if (data.height && data.height !== currentProject.height) updates.height = data.height;
                    if (data.backgroundColor && data.backgroundColor !== currentProject.backgroundColor) updates.backgroundColor = data.backgroundColor;

                    if (Object.keys(updates).length > 0) {
                        console.log("[AI Sync] Applying project metadata update:", updates);
                        projectStore.updateProject(updates);
                    }
                }

            } catch (e) {
                console.error("[AI Sync] Failed to parse snapshot_update data:", e);
            }
        });

        eventSource.addEventListener("update", (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("[AI Sync] Received hot-update:", data.action);

                if (data.action === "setFullState" && data.tracks) {
                    const currentTracksSnapshot = JSON.stringify(useTimelineStore.getState().tracks);
                    const newTracksSnapshot = JSON.stringify(data.tracks);
                    if (currentTracksSnapshot !== newTracksSnapshot) {
                        console.log("[AI Sync] Applying external track hot-update...");
                        useTimelineStore.getState().setTracks(data.tracks);
                    }
                } else if (data.action === "updateElement" && data.elementId) {
                    useTimelineStore.getState().updateElement(data.elementId, data.updates);
                }
            } catch (e) {
                console.error("[AI Sync] Failed to parse SSE data:", e);
            }
        });

        // 监听 pending-edits 的实时推送
        eventSource.addEventListener("edit", (event) => {
            try {
                const edit = JSON.parse(event.data);

                // 去重：检查是否已处理过
                if (processedIds.current.has(edit.id)) {
                    console.log("[AI Sync] Skipping duplicate edit:", edit.id);
                    return;
                }

                console.log("[AI Sync] Received real-time edit:", edit.action);
                processedIds.current.add(edit.id);
                applyEdit(edit);
            } catch (e) {
                console.error("[AI Sync] Failed to parse edit event:", e);
            }
        });

        eventSource.onerror = (e) => {
            console.warn("[AI Sync] SSE Connection lost, will retry...", e);
        };

        return () => {
            eventSource.close();
            console.log("[AI Sync] SSE Connection closed.");
        };
    }, [enabled, applyEdit]);

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
