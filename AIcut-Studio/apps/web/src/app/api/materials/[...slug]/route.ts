import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mime from "mime"; // Need to check if 'mime' package is available or just use simple map

const WORKSPACE_ROOT = path.join(process.cwd(), "../../../");
const PROJECTS_DIR = path.join(WORKSPACE_ROOT, "projects");
const SNAPSHOT_FILE = path.join(WORKSPACE_ROOT, "ai_workspace", "project-snapshot.json");

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
    };
    return map[ext] || "application/octet-stream";
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ slug: string[] }> }
) {
    try {
        const { slug } = await context.params;
        // slug is array: ['images', 'panda.png'] or ['videos', 'foo.mp4']

        let assetPathParts = slug;

        // Determine Active Project
        let projectId =
            req.nextUrl.searchParams.get("projectId") ||
            "demo"; // fallback

        // Try reading snapshot
        if (fs.existsSync(SNAPSHOT_FILE)) {
            try {
                const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
                if (data.project?.id) {
                    projectId = data.project.id;
                }
            } catch { }
        }

        // Construct Path: projects/<id>/assets/<...slug>
        const filePath = path.join(PROJECTS_DIR, projectId, "assets", ...assetPathParts);

        if (!fs.existsSync(filePath)) {
            return new NextResponse("File not found", { status: 404 });
        }

        const stat = fs.statSync(filePath);
        const fileBuffer = fs.readFileSync(filePath);

        const contentType = getMimeType(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": stat.size.toString(),
                "Cache-Control": "public, max-age=3600"
            }
        });

    } catch (e) {
        console.error("[Materials API] Error:", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
