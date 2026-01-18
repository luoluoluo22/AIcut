import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// --- Path Configuration ---
const WORKSPACE_ROOT = path.resolve(process.cwd(), "../../..");
const PROJECTS_DIR = path.join(WORKSPACE_ROOT, "projects");
const SNAPSHOT_FILE = path.join(WORKSPACE_ROOT, "ai_workspace", "project-snapshot.json");

// Helper: Get current project ID from snapshot
function getCurrentProjectId(): string {
    try {
        if (fs.existsSync(SNAPSHOT_FILE)) {
            const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
            return data.project?.id || "demo";
        }
    } catch (e) { }
    return "demo";
}

// Helper: Get thumbnails directory for current project
function getThumbnailsDir(projectId: string): string {
    return path.join(PROJECTS_DIR, projectId, "assets", "_thumbnails");
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const thumbnail = formData.get("thumbnail") as string; // Optional dataURL
        const width = parseInt(formData.get("width") as string) || 0;
        const height = parseInt(formData.get("height") as string) || 0;
        const duration = parseFloat(formData.get("duration") as string) || 0;
        // NEW: Accept original file path from Electron/browser
        const originalPath = formData.get("originalPath") as string;

        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        const projectId = getCurrentProjectId();
        // Use originalPath filename if available, otherwise use file.name
        const fileName = originalPath ? path.basename(originalPath) : file.name;
        const assetId = `asset_${Date.now().toString().slice(-6)}`;

        // Determine media type from MIME type or file extension
        const ext = path.extname(fileName).toLowerCase();
        const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        const audioExts = ['.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a'];

        let mediaType: string;
        if (file.type && file.type !== 'application/octet-stream') {
            mediaType = file.type.startsWith("video") ? "video"
                : file.type.startsWith("audio") ? "audio"
                    : "image";
        } else {
            // Fallback to extension-based detection
            mediaType = videoExts.includes(ext) ? "video"
                : audioExts.includes(ext) ? "audio"
                    : "image";
        }

        // For linked files, we don't copy the file, just reference the original path
        // The original path should be provided by Electron's file picker
        let absolutePath = originalPath || "";

        // If no original path (web browser upload without Electron), 
        // fall back to saving in project directory
        if (!absolutePath) {
            const typeFolder = mediaType === "video" ? "videos"
                : mediaType === "audio" ? "audio"
                    : "images";
            const materialsDir = path.join(PROJECTS_DIR, projectId, "assets", typeFolder);

            if (!fs.existsSync(materialsDir)) {
                fs.mkdirSync(materialsDir, { recursive: true });
            }

            absolutePath = path.join(materialsDir, fileName);
            const buffer = Buffer.from(await file.arrayBuffer());
            fs.writeFileSync(absolutePath, buffer);
            console.log(`[Upload API] Saved file to: ${absolutePath}`);
        } else {
            console.log(`[Upload API] Linking file from: ${absolutePath}`);
        }

        // Handle thumbnail - save to project thumbnails folder
        let thumbnailUrl: string | undefined;
        const thumbnailsDir = getThumbnailsDir(projectId);
        if (!fs.existsSync(thumbnailsDir)) {
            fs.mkdirSync(thumbnailsDir, { recursive: true });
        }

        if (thumbnail && thumbnail.startsWith("data:image")) {
            const thumbName = fileName.replace(/\.[^.]+$/, ".jpg");
            const thumbPath = path.join(thumbnailsDir, thumbName);
            const base64Data = thumbnail.split(",")[1];
            fs.writeFileSync(thumbPath, Buffer.from(base64Data, "base64"));
            thumbnailUrl = `/api/media/serve?path=${encodeURIComponent(thumbPath)}`;
            console.log(`[Upload API] Saved thumbnail to: ${thumbPath}`);
        }

        // Create URL - use file-serve API for absolute paths
        // Format: /api/media/serve?path=<encoded_absolute_path>
        const mediaUrl = `/api/media/serve?path=${encodeURIComponent(absolutePath)}`;

        // Update Snapshot (Add asset)
        if (fs.existsSync(SNAPSHOT_FILE)) {
            const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));

            const newAsset: any = {
                id: assetId,
                name: fileName,
                type: mediaType,
                url: mediaUrl,
                filePath: absolutePath, // Store absolute path for reference
            };

            if (thumbnailUrl) newAsset.thumbnailUrl = thumbnailUrl;
            if (width) newAsset.width = width;
            if (height) newAsset.height = height;
            if (duration) newAsset.duration = duration;

            // Check for duplicates by name (same file might be added multiple times)
            if (!data.assets) data.assets = [];
            const existingIndex = data.assets.findIndex((a: any) => a.name === newAsset.name);
            if (existingIndex >= 0) {
                data.assets[existingIndex] = { ...data.assets[existingIndex], ...newAsset };
                console.log(`[Upload API] Updated existing asset: ${newAsset.name}`);
            } else {
                data.assets.push(newAsset);
                console.log(`[Upload API] Added new asset: ${newAsset.name} (linked: ${!!originalPath})`);
            }

            fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2));

            // Archive to project directory for persistence
            try {
                const archiveSnapshotPath = path.join(PROJECTS_DIR, projectId, "snapshot.json");
                fs.writeFileSync(archiveSnapshotPath, JSON.stringify(data, null, 2));
                console.log(`[Upload API] Archived to project directory: ${archiveSnapshotPath}`);
            } catch (archiveErr) {
                console.warn(`[Upload API] Failed to archive to project directory:`, archiveErr);
                // Don't fail the request if archiving fails
            }
        } else {
            console.warn("[Upload API] Snapshot file not found, cannot add asset");
        }

        return NextResponse.json({
            success: true,
            url: mediaUrl,
            assetId: assetId,
            isLinked: !!originalPath
        });
    } catch (e) {
        console.error("[Upload API] Error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
