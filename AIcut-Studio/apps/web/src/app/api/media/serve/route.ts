import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
};

/**
 * GET /api/media/serve?path=<encoded_absolute_path>
 * Serves a file from an absolute path on disk.
 * This enables "linked" files that are not copied to the project directory.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const filePath = searchParams.get("path");

        if (!filePath) {
            return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
        }

        // Security: Validate path is an absolute path
        if (!path.isAbsolute(filePath)) {
            return NextResponse.json({ error: "Path must be absolute" }, { status: 400 });
        }

        // Check file exists
        if (!fs.existsSync(filePath)) {
            console.error(`[Serve API] File not found: ${filePath}`);
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Get file stats
        const stats = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || "application/octet-stream";

        // Handle range requests for video/audio streaming
        const rangeHeader = req.headers.get("range");

        if (rangeHeader && (mimeType.startsWith("video") || mimeType.startsWith("audio"))) {
            // Parse range header
            const parts = rangeHeader.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
            const chunkSize = end - start + 1;

            // Read the specific range
            const fileHandle = fs.openSync(filePath, "r");
            const buffer = Buffer.alloc(chunkSize);
            fs.readSync(fileHandle, buffer, 0, chunkSize, start);
            fs.closeSync(fileHandle);

            return new NextResponse(buffer, {
                status: 206, // Partial Content
                headers: {
                    "Content-Type": mimeType,
                    "Content-Length": chunkSize.toString(),
                    "Content-Range": `bytes ${start}-${end}/${stats.size}`,
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=3600",
                },
            });
        }

        // Read entire file for non-range requests (images, small files)
        const fileBuffer = fs.readFileSync(filePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Type": mimeType,
                "Content-Length": stats.size.toString(),
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=3600",
            },
        });

    } catch (e) {
        console.error("[Serve API] Error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
