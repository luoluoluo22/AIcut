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
    const { tracks } = useTimelineStore();
    const processedIds = useRef<Set<string>>(new Set());
    const lastReportedState = useRef<string>("");
    const hasSynced = useRef<boolean>(false);
    const reportTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Helper to handle snapshot data
    const handleSnapshotData = useCallback((data: any) => {
        if (!data) return;

        // --- Sync Tracks ---
        if (data.tracks) {
            console.log(`[AI Sync] <Handle> Processing ${data.tracks.length} tracks from snapshot`);
            const currentTracksSnapshot = JSON.stringify(useTimelineStore.getState().tracks);
            const newTracksSnapshot = JSON.stringify(data.tracks);
            if (currentTracksSnapshot !== newTracksSnapshot) {
                console.log("[AI Sync] <Handle> Applying external track snapshot update...");
                useTimelineStore.getState().setTracks(data.tracks);
            } else {
                console.log("[AI Sync] <Handle> Tracks match current state, skipping setTracks");
            }
        }

        // --- Sync Assets (Media Library) ---
        if (data.assets && Array.isArray(data.assets)) {
            const mediaStore = useMediaStore.getState();
            const currentAssets = mediaStore.mediaFiles;
            console.log(`[AI Sync] <Handle> Processing ${data.assets.length} assets. Current store has ${currentAssets.length} assets.`);

            for (const remoteAsset of data.assets) {
                const exists = currentAssets.find(a =>
                    a.id === remoteAsset.id || (remoteAsset.url && a.url === remoteAsset.url)
                );

                if (exists) {
                    console.log(`[AI Sync] <Asset> Skipping existing asset: ${remoteAsset.name} (ID: ${remoteAsset.id})`);
                    continue;
                }

                if (!remoteAsset.url) {
                    console.warn(`[AI Sync] <Asset> Missing URL for asset: ${remoteAsset.name}, cannot link.`);
                    continue;
                }

                console.log(`[AI Sync] <Asset> Linking local asset: ${remoteAsset.name} -> ${remoteAsset.url}`);
                mediaStore.addMediaFile(data.project?.id || "demo", {
                    id: remoteAsset.id,
                    name: remoteAsset.name,
                    type: remoteAsset.type || "video",
                    url: remoteAsset.url,
                    filePath: remoteAsset.filePath,
                    thumbnailUrl: remoteAsset.thumbnailUrl,
                    duration: remoteAsset.duration || 0,
                    width: remoteAsset.width,
                    height: remoteAsset.height,
                    isLinked: true
                } as any);
            }
            console.log("[AI Sync] <Handle> Asset synchronization complete.");
            hasSynced.current = true;
        } else {
            console.log("[AI Sync] <Handle> No assets found in snapshot or invalid assets format");
        }

        // --- Sync Project Metadata ---
        const projectStore = useProjectStore.getState();
        const currentProject = projectStore.activeProject;
        const remoteProject = data.project;

        if (currentProject && remoteProject) {
            const updates: any = {};

            // Sync atomic fields
            if (remoteProject.name && remoteProject.name !== currentProject.name)
                updates.name = remoteProject.name;
            if (remoteProject.fps && remoteProject.fps !== currentProject.fps)
                updates.fps = remoteProject.fps;

            // Sync nested canvas size
            if (remoteProject.canvasSize) {
                if (remoteProject.canvasSize.width !== currentProject.canvasSize?.width)
                    updates.width = remoteProject.canvasSize.width;
                if (remoteProject.canvasSize.height !== currentProject.canvasSize?.height)
                    updates.height = remoteProject.canvasSize.height;
            }

            if (remoteProject.backgroundColor && remoteProject.backgroundColor !== currentProject.backgroundColor)
                updates.backgroundColor = remoteProject.backgroundColor;

            if (Object.keys(updates).length > 0) {
                console.log("[AI Sync] <Project> Applying metadata update:", updates);
                projectStore.updateProject(updates);
            }
        }
    }, []);

    // 监听来自 Electron 主进程的 Python 日志 (IPC Channel)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            const handlePythonLog = (text: string) => {
                const lines = text.split(/\r?\n/);
                for (const line of lines) {
                    if (!line.trim()) continue;
                    const eventIndex = line.indexOf("::AI_EVENT::");
                    if (eventIndex !== -1) {
                        try {
                            if (eventIndex > 0) {
                                console.log("%c[Python AI]", "color: #3b82f6; font-weight: bold", line.substring(0, eventIndex));
                            }
                            const jsonStr = line.substring(eventIndex + "::AI_EVENT::".length).trim();
                            const event = JSON.parse(jsonStr);
                            if (!processedIds.current.has(event.id)) {
                                processedIds.current.add(event.id);
                                applyEdit(event);
                            }
                        } catch (err) {
                            console.error("[AI IPC] Parse error:", err);
                        }
                    } else {
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

        console.log("[AI Sync] Establishing SSE connection...");
        const eventSource = new EventSource("/api/ai-edit/sync");

        eventSource.addEventListener("snapshot_update", (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("[AI Sync] <SSE> Got full snapshot update");
                handleSnapshotData(data);
            } catch (e) {
                console.error("[AI Sync] Snapshot parse error:", e);
            }
        });

        eventSource.addEventListener("update", (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.action === "setFullState" && data.tracks) {
                    const currentTracksSnapshot = JSON.stringify(useTimelineStore.getState().tracks);
                    const newTracksSnapshot = JSON.stringify(data.tracks);
                    if (currentTracksSnapshot !== newTracksSnapshot) {
                        useTimelineStore.getState().setTracks(data.tracks);
                    }
                } else if (data.action === "updateElement" && data.elementId) {
                    useTimelineStore.getState().updateElement(data.elementId, data.updates);
                }
            } catch (e) {
                console.error("[AI Sync] Update parse error:", e);
            }
        });

        eventSource.addEventListener("edit", (event) => {
            try {
                const edit = JSON.parse(event.data);
                if (processedIds.current.has(edit.id)) return;
                processedIds.current.add(edit.id);
                applyEdit(edit);
            } catch (e) {
                console.error("[AI Sync] Edit parse error:", e);
            }
        });

        eventSource.onerror = (e) => {
            console.warn("[AI Sync] SSE lost, retrying...");
        };

        return () => {
            eventSource.close();
        };
    }, [enabled, applyEdit, handleSnapshotData]);

    const reportState = useCallback(async () => {
        const currentTracks = useTimelineStore.getState().tracks;
        const activeProject = useProjectStore.getState().activeProject;

        if (!activeProject || !hasSynced.current) return;

        const stateSummary = JSON.stringify({
            projectId: activeProject.id,
            tracks: currentTracks.map(t => ({
                id: t.id,
                elements: t.elements.map(e => ({ id: e.id, start: e.startTime, content: (e as any).content }))
            }))
        });

        if (stateSummary === lastReportedState.current) return;

        try {
            console.log("[AI Sync] Reporting tracks to backend...");
            await fetch("/api/ai-edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "updateSnapshot",
                    data: { project: activeProject, tracks: currentTracks }
                })
            });
            lastReportedState.current = stateSummary;
        } catch (e) {
            console.error("[AI Sync] Report failed:", e);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        if (reportTimeout.current) clearTimeout(reportTimeout.current);
        reportTimeout.current = setTimeout(() => {
            reportState();
        }, 3000);
        return () => {
            if (reportTimeout.current) clearTimeout(reportTimeout.current);
        };
    }, [enabled, tracks, reportState]);

    return {
        triggerSync: () => { },
    };
}
