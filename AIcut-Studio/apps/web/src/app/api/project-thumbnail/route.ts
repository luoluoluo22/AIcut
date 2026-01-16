import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const WORKSPACE_ROOT = path.join(process.cwd(), "../../../");
const PROJECTS_DIR = path.join(WORKSPACE_ROOT, "projects");

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
        return new NextResponse("Missing projectId", { status: 400 });
    }

    try {
        const snapshotPath = path.join(PROJECTS_DIR, projectId, "snapshot.json");
        if (!fs.existsSync(snapshotPath)) {
            return new NextResponse("Project not found", { status: 404 });
        }

        const data = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
        const assets = data.assets || [];

        // Find first image asset
        let thumbnailAsset = assets.find((a: any) => a.type === "image");

        // If no image, try video thumbnail
        if (!thumbnailAsset) {
            thumbnailAsset = assets.find((a: any) => a.type === "video" && a.thumbnailUrl);
            if (thumbnailAsset) {
                thumbnailAsset = { ...thumbnailAsset, url: thumbnailAsset.thumbnailUrl };
            }
        }

        if (!thumbnailAsset?.url) {
            return new NextResponse("No thumbnail available", { status: 404 });
        }

        // Convert relative URL to absolute file path
        let thumbnailFile = thumbnailAsset.url;
        if (thumbnailFile.startsWith("/materials/")) {
            thumbnailFile = thumbnailFile.replace("/materials/", "");
        }

        const absolutePath = path.join(PROJECTS_DIR, projectId, "assets", thumbnailFile);

        if (!fs.existsSync(absolutePath)) {
            return new NextResponse(`Thumbnail file not found: ${thumbnailFile}`, { status: 404 });
        }

        // Read and return the image
        const imageBuffer = fs.readFileSync(absolutePath);
        const ext = path.extname(absolutePath).toLowerCase();

        let contentType = "image/jpeg";
        if (ext === ".png") contentType = "image/png";
        else if (ext === ".gif") contentType = "image/gif";
        else if (ext === ".webp") contentType = "image/webp";

        return new NextResponse(imageBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (e) {
        console.error("Failed to get project thumbnail:", e);
        return new NextResponse("Server error", { status: 500 });
    }
}
