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

// Helper: Resolve thumbnail path from URL
function resolveThumbnailPath(url: string, projectId: string): string | null {
    // Thumbnail URL format: /materials/_thumbnails/<filename>
    // Physical path: projects/<projectId>/assets/_thumbnails/<filename>
    if (!url || !url.startsWith("/materials/")) return null;

    const relativePath = url.replace("/materials/", "");
    return path.join(PROJECTS_DIR, projectId, "assets", relativePath);
}

// Helper: Check if a file is inside the project directory (not a linked file)
function isFileInsideProjectDir(filePath: string, projectId: string): boolean {
    const projectDir = path.join(PROJECTS_DIR, projectId);
    return filePath.startsWith(projectDir);
}

/**
 * DELETE /api/media/delete-local
 * 删除媒体文件及其物理磁盘文件
 * 
 * For linked files (files outside project directory), we only delete:
 * - The asset entry from snapshot
 * - The thumbnail (if it exists in project directory)
 * We do NOT delete the original file since it may be used elsewhere.
 */
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing asset id" }, { status: 400 });
        }

        if (!fs.existsSync(SNAPSHOT_FILE)) {
            return NextResponse.json({ error: "Snapshot file not found" }, { status: 404 });
        }

        const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));

        if (!data.assets) {
            return NextResponse.json({ error: "No assets in snapshot" }, { status: 404 });
        }

        const assetIndex = data.assets.findIndex((a: any) => a.id === id);

        if (assetIndex === -1) {
            return NextResponse.json({ error: "Asset not found in snapshot" }, { status: 404 });
        }

        const asset = data.assets[assetIndex];
        const projectId = getCurrentProjectId();

        // Determine if this is a linked file (stored with filePath)
        const isLinked = !!asset.filePath && !isFileInsideProjectDir(asset.filePath, projectId);

        // 1. Only delete physical file if it's inside project directory (not linked)
        if (asset.filePath && !isLinked) {
            if (fs.existsSync(asset.filePath)) {
                try {
                    fs.unlinkSync(asset.filePath);
                    console.log(`[Delete API] Deleted project file: ${asset.filePath}`);
                } catch (err) {
                    console.error(`[Delete API] Failed to delete file: ${asset.filePath}`, err);
                }
            }
        } else if (isLinked) {
            console.log(`[Delete API] Skipping linked file deletion: ${asset.filePath}`);
        }

        // 2. Always delete thumbnail (it's always in project directory)
        if (asset.thumbnailUrl) {
            const thumbPath = resolveThumbnailPath(asset.thumbnailUrl, projectId);
            if (thumbPath && fs.existsSync(thumbPath)) {
                try {
                    fs.unlinkSync(thumbPath);
                    console.log(`[Delete API] Deleted thumbnail: ${thumbPath}`);
                } catch (err) {
                    console.warn(`[Delete API] Failed to delete thumbnail: ${thumbPath}`, err);
                }
            }
        }

        // 3. Remove from snapshot
        data.assets.splice(assetIndex, 1);

        // 4. Remove elements referencing this asset from tracks
        if (data.tracks) {
            data.tracks.forEach((track: any) => {
                if (track.elements) {
                    const before = track.elements.length;
                    track.elements = track.elements.filter((el: any) => el.mediaId !== id);
                    if (track.elements.length < before) {
                        console.log(`[Delete API] Removed ${before - track.elements.length} elements from track ${track.id}`);
                    }
                }
            });
        }

        fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2));
        console.log(`[Delete API] Successfully deleted asset ${id} (linked: ${isLinked})`);

        // Archive to project directory for persistence
        try {
            const archiveSnapshotPath = path.join(PROJECTS_DIR, projectId, "snapshot.json");
            fs.writeFileSync(archiveSnapshotPath, JSON.stringify(data, null, 2));
            console.log(`[Delete API] Archived to project directory: ${archiveSnapshotPath}`);
        } catch (archiveErr) {
            console.warn(`[Delete API] Failed to archive to project directory:`, archiveErr);
            // Don't fail the request if archiving fails
        }

        return NextResponse.json({
            success: true,
            message: isLinked ? "Asset reference removed (original file preserved)" : "Asset and physical file deleted"
        });
    } catch (e) {
        console.error("[Delete API] Error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
