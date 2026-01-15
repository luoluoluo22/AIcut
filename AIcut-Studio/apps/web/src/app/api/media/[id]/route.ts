/**
 * Media Serve API - Serves temp media files for Remotion rendering
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";

const EXPORT_TEMP_DIR = path.join(os.tmpdir(), "aicut-export-media");

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Find the file with any extension
        const files = fs.readdirSync(EXPORT_TEMP_DIR);
        const matchingFile = files.find((f) => f.startsWith(id));

        if (!matchingFile) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const filePath = path.join(EXPORT_TEMP_DIR, matchingFile);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(matchingFile).toLowerCase();

        // Determine content type
        const contentTypes: Record<string, string> = {
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".ogg": "audio/ogg",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
        };

        const contentType = contentTypes[ext] || "application/octet-stream";

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": fileBuffer.length.toString(),
                "Cache-Control": "no-cache",
            },
        });
    } catch (error) {
        console.error("Media serve error:", error);
        return NextResponse.json(
            { error: "Failed to serve media" },
            { status: 500 }
        );
    }
}
