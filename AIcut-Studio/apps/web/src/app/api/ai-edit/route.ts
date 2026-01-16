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
// --- CONFIG ---
const WORKSPACE_ROOT = path.join(process.cwd(), "../../../");
const EDITS_DIR = path.join(WORKSPACE_ROOT, "ai_workspace");
const PROJECTS_DIR = path.join(WORKSPACE_ROOT, "projects");
const HISTORY_DIR = path.join(EDITS_DIR, "history");
const SNAPSHOT_FILE = path.join(EDITS_DIR, "project-snapshot.json");
const PENDING_EDITS_FILE = path.join(EDITS_DIR, "pending-edits.json");
const SYNC_FILE = path.join(EDITS_DIR, "sync-input.json");
const MAX_HISTORY = 20;

// Ensure directories exist
[EDITS_DIR, PROJECTS_DIR, HISTORY_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Helper: Backup current snapshot to history
function backupSnapshot() {
    if (!fs.existsSync(SNAPSHOT_FILE)) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupPath = path.join(HISTORY_DIR, `snapshot_${timestamp}.json`);
    fs.copyFileSync(SNAPSHOT_FILE, backupPath);
    // Cleanup old versions
    const files = fs.readdirSync(HISTORY_DIR)
        .filter(f => f.startsWith("snapshot_") && f.endsWith(".json"))
        .sort().reverse();
    files.slice(MAX_HISTORY).forEach(f => fs.unlinkSync(path.join(HISTORY_DIR, f)));
}

// Helper: Archive workspace to project folder
function archiveToProject(projectId: string) {
    if (!fs.existsSync(SNAPSHOT_FILE)) return false;
    const projectDir = path.join(PROJECTS_DIR, projectId);
    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
    }
    fs.copyFileSync(SNAPSHOT_FILE, path.join(projectDir, "snapshot.json"));
    console.log(`[Archive] Saved workspace to projects/${projectId}/snapshot.json`);
    return true;
}

// Helper: Load project snapshot to workspace
function loadProjectToWorkspace(projectId: string) {
    const projectSnapshotPath = path.join(PROJECTS_DIR, projectId, "snapshot.json");
    if (!fs.existsSync(projectSnapshotPath)) {
        console.log(`[Load] Project ${projectId} not found in projects/`);
        return false;
    }
    // Backup current workspace first
    backupSnapshot();
    // Copy project snapshot to workspace
    fs.copyFileSync(projectSnapshotPath, SNAPSHOT_FILE);
    console.log(`[Load] Loaded projects/${projectId}/snapshot.json to workspace`);
    return true;
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
        if (fs.existsSync(PENDING_EDITS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PENDING_EDITS_FILE, "utf-8"));
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
    fs.writeFileSync(PENDING_EDITS_FILE, JSON.stringify(edits, null, 2));
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

        if (action === "listProjects") {
            // List all projects from projects/ directory
            try {
                const projects: any[] = [];
                if (fs.existsSync(PROJECTS_DIR)) {
                    const dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
                    for (const dir of dirs) {
                        if (dir.isDirectory()) {
                            const snapshotPath = path.join(PROJECTS_DIR, dir.name, "snapshot.json");
                            if (fs.existsSync(snapshotPath)) {
                                try {
                                    const data = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
                                    if (data.project) {
                                        projects.push({
                                            id: data.project.id || dir.name,
                                            name: data.project.name || dir.name,
                                            createdAt: data.project.createdAt,
                                            updatedAt: data.project.updatedAt,
                                            thumbnail: data.project.thumbnail,
                                            source: "filesystem"
                                        });
                                    }
                                } catch (e) {
                                    console.warn(`Failed to parse ${snapshotPath}:`, e);
                                }
                            }
                        }
                    }
                }
                return NextResponse.json({ success: true, projects });
            } catch (e) {
                console.error("Failed to list projects:", e);
                return NextResponse.json({ success: false, error: "Failed to list projects" }, { status: 500 });
            }
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
                "updateSnapshot - 更新项目全局快照 (自动备份历史)",
                "loadProject - 从 projects/<id>/ 加载到 ai_workspace/",
                "archiveProject - 从 ai_workspace/ 归档到 projects/<id>/",
                "switchProject - 归档当前项目并切换到新项目",
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
                // Front-end reports its full state (Smart Merge)
                try {
                    // Backup before overwriting
                    backupSnapshot();

                    let currentSnapshot: any = {};
                    if (fs.existsSync(SNAPSHOT_FILE)) {
                        try {
                            currentSnapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
                        } catch (e) { /* ignore corrupt */ }
                    }

                    // Merge incoming data (Project & Tracks) with existing Assets
                    const mergedData = {
                        ...currentSnapshot,
                        project: data.project || currentSnapshot.project,
                        tracks: data.tracks || currentSnapshot.tracks,
                        // CRITICAL: Preserve assets if not provided in the update
                        assets: data.assets || currentSnapshot.assets || []
                    };

                    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(mergedData, null, 2));
                    return NextResponse.json({ success: true });
                } catch (e) {
                    return NextResponse.json({ success: false, error: "Failed to save snapshot" }, { status: 500 });
                }
            }

            case "loadProject": {
                // Load a project from projects/ to ai_workspace/
                const projectId = data?.projectId;
                if (!projectId) {
                    return NextResponse.json({ success: false, error: "Missing projectId" }, { status: 400 });
                }
                const loaded = loadProjectToWorkspace(projectId);
                if (loaded) {
                    return NextResponse.json({ success: true, message: `Loaded project ${projectId} to workspace` });
                } else {
                    return NextResponse.json({ success: false, error: `Project ${projectId} not found` }, { status: 404 });
                }
            }

            case "archiveProject": {
                // Archive current workspace to projects/
                const projectId = data?.projectId;
                if (!projectId) {
                    // Try to get projectId from current snapshot
                    try {
                        const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
                        const id = snapshot?.project?.id;
                        if (id) {
                            archiveToProject(id);
                            return NextResponse.json({ success: true, message: `Archived to projects/${id}` });
                        }
                    } catch (e) { }
                    return NextResponse.json({ success: false, error: "Missing projectId and cannot detect from snapshot" }, { status: 400 });
                }
                archiveToProject(projectId);
                return NextResponse.json({ success: true, message: `Archived to projects/${projectId}` });
            }

            case "switchProject": {
                // Archive current, then load new project
                const newProjectId = data?.projectId;
                if (!newProjectId) {
                    return NextResponse.json({ success: false, error: "Missing projectId for switchProject" }, { status: 400 });
                }
                // 1. Archive current project (if any)
                try {
                    const currentSnapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
                    const currentId = currentSnapshot?.project?.id;
                    if (currentId && currentId !== newProjectId) {
                        archiveToProject(currentId);
                    }
                } catch (e) { /* No current project to archive */ }

                // 2. Load new project
                const loaded = loadProjectToWorkspace(newProjectId);
                if (loaded) {
                    return NextResponse.json({ success: true, message: `Switched to project ${newProjectId}` });
                } else {
                    return NextResponse.json({ success: false, error: `Project ${newProjectId} not found` }, { status: 404 });
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
