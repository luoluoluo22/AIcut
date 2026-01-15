/**
 * AI Edit API - Programmatic editing capabilities for AI tools
 * 
 * This API allows external tools (Python scripts, AI agents, etc.) to:
 * - Add/modify/remove timeline elements
 * - Add subtitles, text overlays
 * 
 * The changes are stored in a JSON file that the frontend polls for updates.
 * 
 * Usage from Python:
 *   requests.post("http://localhost:3000/api/ai-edit", json={
 *     "action": "addSubtitle",
 *     "data": { "text": "Hello World", "startTime": 0, "duration": 5 }
 *   })
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

// File-based storage for AI edits (cross-process communication)
// Resolve the edits directory to a folder named '.aicut' at the workspace root
// Workspace root is 3 levels up from apps/web/src/app/api/ai-edit
const EDITS_DIR = path.resolve(process.cwd(), "../../..", ".aicut");
const EDITS_FILE = path.join(EDITS_DIR, "pending-edits.json");
const SNAPSHOT_FILE = path.join(EDITS_DIR, "project-snapshot.json");
const SYNC_FILE = path.join(EDITS_DIR, "sync-input.json");

// Ensure directory exists
if (!fs.existsSync(EDITS_DIR)) {
    fs.mkdirSync(EDITS_DIR, { recursive: true });
}

interface PendingEdit {
    id: string;
    action: string;
    data: any;
    timestamp: number;
    processed: boolean;
}

function loadPendingEdits(): PendingEdit[] {
    try {
        if (fs.existsSync(EDITS_FILE)) {
            const data = JSON.parse(fs.readFileSync(EDITS_FILE, "utf-8"));
            if (Array.isArray(data)) {
                // Filter out invalid entries to prevent crashes
                return data.filter(e => e && typeof e === 'object' && e.id);
            }
        }
    } catch (e) {
        console.error("Failed to load pending edits:", e);
    }
    return [];
}

function savePendingEdits(edits: PendingEdit[]) {
    fs.writeFileSync(EDITS_FILE, JSON.stringify(edits, null, 2));
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    // 增加日志记录，方便调试
    if (action !== "getPendingEdits" && action !== "poll") {
        console.log(`[API GET] Action: ${action}`);
    }

    try {
        if (action === "getPendingEdits" || action === "poll") {
            // Get unprocessed edits
            const edits = loadPendingEdits();
            const pending = edits.filter(e => !e.processed);
            return NextResponse.json({
                success: true,
                edits: pending,
            });
        }

        if (action === "markProcessed") {
            // Mark edits as processed
            const ids = searchParams.get("ids")?.split(",") || [];
            const edits = loadPendingEdits();
            for (const edit of edits) {
                if (ids.includes(edit.id)) {
                    edit.processed = true;
                }
            }
            // Keep only last 100 edits
            savePendingEdits(edits.slice(-100));
            return NextResponse.json({ success: true });
        }

        if (action === "clear") {
            savePendingEdits([]);
            return NextResponse.json({ success: true, message: "Cleared all edits" });
        }

        if (action === "getSnapshot") {
            try {
                if (fs.existsSync(SNAPSHOT_FILE)) {
                    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
                    return NextResponse.json({ success: true, snapshot });
                }
            } catch (e) {
                console.error("Failed to load snapshot:", e);
            }
            return NextResponse.json({ success: false, error: "No snapshot available" });
        }

        return NextResponse.json({
            success: true,
            message: "AIcut AI Edit API",
            version: "1.0.0",
            endpoints: {
                "GET ?action=getPendingEdits": "获取待处理的编辑",
                "GET ?action=markProcessed&ids=id1,id2": "标记编辑为已处理",
                "POST": "执行编辑命令",
            },
            availableActions: [
                "addSubtitle - 添加单个字幕",
                "addMultipleSubtitles - 批量添加字幕",
                "clearSubtitles - 清除所有字幕",
                "removeElement - 移除元素",
                "updateElement - 更新元素",
                "setFullState - 全量覆盖时间轴 JSON (Remotion 风格)",
                "updateSnapshot - (前端专用) 更新项目全局快照",
            ]
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, data } = body;
        console.log(`[API POST] Action: ${action}`, data);

        if (!action) {
            return NextResponse.json({
                success: false,
                error: "Missing 'action' field",
            }, { status: 400 });
        }

        // Create edit entry
        const edit: PendingEdit = {
            id: `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            action,
            data,
            timestamp: Date.now(),
            processed: false,
        };

        // Validate based on action
        switch (action) {
            case "addSubtitle":
            case "addText": {
                if (!data?.text) {
                    return NextResponse.json({
                        success: false,
                        error: "Missing 'text' in data",
                    }, { status: 400 });
                }
                // Set defaults
                edit.data = {
                    text: data.text,
                    startTime: data.startTime ?? 0,
                    duration: data.duration ?? 5,
                    x: data.x ?? 960,
                    y: data.y ?? 900,
                    fontSize: data.fontSize ?? 48,
                    fontFamily: data.fontFamily ?? "Arial",
                    color: data.color ?? "#FFFFFF",
                    backgroundColor: data.backgroundColor ?? "rgba(0,0,0,0.7)",
                    textAlign: data.textAlign ?? "center",
                };
                break;
            }

            case "addMultipleSubtitles": {
                if (!data?.subtitles || !Array.isArray(data.subtitles)) {
                    return NextResponse.json({
                        success: false,
                        error: "Missing 'subtitles' array in data",
                    }, { status: 400 });
                }
                // Normalize subtitles
                edit.data.subtitles = data.subtitles.map((sub: any) => ({
                    text: sub.text,
                    startTime: sub.startTime ?? 0,
                    duration: sub.duration ?? 3,
                    x: sub.x ?? 960,
                    y: sub.y ?? 900,
                    fontSize: sub.fontSize ?? 48,
                    fontFamily: sub.fontFamily ?? "Arial",
                    color: sub.color ?? "#FFFFFF",
                    backgroundColor: sub.backgroundColor ?? "rgba(0,0,0,0.7)",
                    textAlign: sub.textAlign ?? "center",
                }));
                break;
            }

            case "markProcessed": {
                const ids = data?.ids || [];
                const edits = loadPendingEdits();
                for (const edit of edits) {
                    if (ids.includes(edit.id)) {
                        edit.processed = true;
                    }
                }
                savePendingEdits(edits.slice(-100));
                return NextResponse.json({ success: true });
            }

            case "clearSubtitles":
            case "removeElement":
            case "updateElement":
            case "requestTask":
            case "importAudio":
                // These are fine as-is
                break;

            case "setFullState": {
                if (!data?.tracks) {
                    return NextResponse.json({
                        success: false,
                        error: "Missing 'tracks' in data for setFullState",
                    }, { status: 400 });
                }
                // Write to SYNC_FILE to trigger SSE
                try {
                    fs.writeFileSync(SYNC_FILE, JSON.stringify({ action: "setFullState", tracks: data.tracks }, null, 2));
                } catch (e) {
                    console.error("Failed to write sync file:", e);
                }
                break;
            }

            case "updateSnapshot": {
                // Front-end reports its full state
                try {
                    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2));
                    return NextResponse.json({ success: true });
                } catch (e) {
                    return NextResponse.json({ success: false, error: "Failed to save snapshot" }, { status: 500 });
                }
            }

            default:
                return NextResponse.json({
                    success: false,
                    error: `Unknown action: ${action}`,
                }, { status: 400 });
        }

        // Add to pending edits
        const edits = loadPendingEdits();
        edits.push(edit);
        savePendingEdits(edits);

        return NextResponse.json({
            success: true,
            editId: edit.id,
            message: `Edit queued: ${action}`,
        });
    } catch (error) {
        console.error("AI Edit API error:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}
