import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";

const execPromise = util.promisify(exec);

// --- Path Configuration ---
const WORKSPACE_ROOT = path.resolve(process.cwd(), "../../..");
const PROJECTS_DIR = path.join(WORKSPACE_ROOT, "projects");
const SNAPSHOT_FILE = path.join(WORKSPACE_ROOT, "ai_workspace", "project-snapshot.json");
const PROJECT_ID_MAP_FILE = path.join(PROJECTS_DIR, "projectIdMap.json");

/**
 * Helper: Find folder by ID or name
 */
function findProjectFolder(idOrName: string): string | null {
    // 1. Map match (Internal ID -> Folder name) - Prioritize mapped folder names
    try {
        if (fs.existsSync(PROJECT_ID_MAP_FILE)) {
            const map = JSON.parse(fs.readFileSync(PROJECT_ID_MAP_FILE, "utf-8"));
            for (const [folderName, internalId] of Object.entries(map)) {
                if (internalId === idOrName) {
                    return folderName;
                }
            }
        }
    } catch (e) { }

    // 2. Direct match (Fallback if no mapping exists)
    const directPath = path.join(PROJECTS_DIR, idOrName);
    if (fs.existsSync(directPath) && fs.lstatSync(directPath).isDirectory()) {
        return idOrName;
    }

    return null;
}

/**
 * Helper: Get current project ID from snapshot
 */
function getCurrentProjectId(): string {
    try {
        if (fs.existsSync(SNAPSHOT_FILE)) {
            const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
            return data.project?.id || "demo";
        }
    } catch (e) { }
    return "demo";
}

/**
 * POST /api/media/generate-thumbnail
 * Generates a thumbnail for a local video file using FFmpeg.
 * Body: { filePath: string, projectId?: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { filePath, projectId: providedProjectId } = body;

        if (!filePath) {
            return NextResponse.json({ error: "Missing filePath" }, { status: 400 });
        }

        // Verify file exists
        if (!fs.existsSync(filePath)) {
            console.error(`[Thumbnail API] File not found: ${filePath}`);
            return NextResponse.json({ error: `File not found: ${filePath}` }, { status: 404 });
        }

        const projectId = providedProjectId || getCurrentProjectId();
        const projectFolderName = findProjectFolder(projectId) || projectId;
        const thumbnailsDir = path.join(PROJECTS_DIR, projectFolderName, "assets", "_thumbnails");

        // Ensure thumbnails directory exists
        if (!fs.existsSync(thumbnailsDir)) {
            fs.mkdirSync(thumbnailsDir, { recursive: true });
        }

        const fileName = path.basename(filePath);
        // Remove extension and append .jpg
        const thumbName = fileName.replace(/\.[^.]+$/, "") + `_thumb_${Date.now()}.jpg`;
        const thumbPath = path.join(thumbnailsDir, thumbName);

        console.log(`[Thumbnail API] Generating thumbnail for: ${filePath}`);

        // ffmpeg command to extract a single frame
        // -ss 00:00:01: seek to 1 second
        // -i: input file
        // -vframes 1: extract 1 frame
        // -q:v 2: high quality
        // -y: overwrite output
        const command = `ffmpeg -y -ss 00:00:01 -i "${filePath}" -vframes 1 -q:v 2 "${thumbPath}"`;

        try {
            await execPromise(command);
        } catch (err) {
            console.warn(`[Thumbnail API] FFmpeg failed at 1s, attempting at 0s: ${err}`);
            // Fallback command: extract the first available frame (00:00:00)
            const fallbackCommand = `ffmpeg -y -i "${filePath}" -vframes 1 -q:v 2 "${thumbPath}"`;
            await execPromise(fallbackCommand);
        }

        if (fs.existsSync(thumbPath)) {
            const thumbnailUrl = `/api/media/serve?path=${encodeURIComponent(thumbPath)}`;
            console.log(`[Thumbnail API] Successfully generated: ${thumbPath}`);
            return NextResponse.json({
                success: true,
                thumbnailUrl,
                thumbnailPath: thumbPath
            });
        } else {
            console.error(`[Thumbnail API] FFmpeg output file missing: ${thumbPath}`);
            return NextResponse.json({ error: "FFmpeg failed to generate output file" }, { status: 500 });
        }

    } catch (error) {
        console.error("[Thumbnail API] Fatal error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
