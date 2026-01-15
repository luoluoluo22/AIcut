import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MATERIALS_DIR = path.resolve(process.cwd(), "public/materials");
const SNAPSHOT_FILE = path.resolve(process.cwd(), "../../..", ".aicut/project-snapshot.json");

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const thumbnail = formData.get("thumbnail") as string; // Optional dataURL
        const width = parseInt(formData.get("width") as string) || 0;
        const height = parseInt(formData.get("height") as string) || 0;
        const duration = parseFloat(formData.get("duration") as string) || 0;

        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        if (!fs.existsSync(MATERIALS_DIR)) {
            fs.mkdirSync(MATERIALS_DIR, { recursive: true });
        }

        const fileName = file.name;
        const filePath = path.join(MATERIALS_DIR, fileName);
        const buffer = Buffer.from(await file.arrayBuffer());

        // Save to disk
        fs.writeFileSync(filePath, buffer);

        // Update Snapshot (Add asset)
        if (fs.existsSync(SNAPSHOT_FILE)) {
            const data = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
            const assetId = `asset_${Date.now().toString().slice(-6)}`;

            const newAsset = {
                id: assetId,
                name: fileName,
                type: file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image",
                url: `/materials/${fileName}`,
                filePath: filePath,
                thumbnailUrl: thumbnail || undefined,
                width: width || undefined,
                height: height || undefined,
                duration: duration || undefined,
                isLinked: true
            };

            // Check for duplicates
            const exists = data.assets.find((a: any) => a.url === newAsset.url);
            if (!exists) {
                data.assets.push(newAsset);
                fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2));
            }
        }

        return NextResponse.json({ success: true, url: `/materials/${fileName}` });
    } catch (e) {
        console.error("[Upload API] Error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
