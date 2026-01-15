import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const EDITS_DIR = path.resolve(process.cwd(), "../../..", ".aicut");
const SNAPSHOT_FILE = path.join(EDITS_DIR, "project-snapshot.json");

/**
 * DELETE /api/media/delete-local
 * 删除媒体文件及其物理磁盘文件
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
        const assetIndex = data.assets.findIndex((a: any) => a.id === id);

        if (assetIndex === -1) {
            return NextResponse.json({ error: "Asset not found in snapshot" }, { status: 404 });
        }

        const asset = data.assets[assetIndex];

        // 1. 删除物理文件
        if (asset.filePath && fs.existsSync(asset.filePath)) {
            try {
                fs.unlinkSync(asset.filePath);
                console.log(`[Delete API] Deleted physical file: ${asset.filePath}`);
            } catch (err) {
                console.error(`[Delete API] Failed to delete file: ${asset.filePath}`, err);
                // 继续执行，即使文件删除失败（可能被占用），也应该从快照中移除
            }
        }

        // 2. 从快照中移除
        data.assets.splice(assetIndex, 1);

        // 3. 同时从轨道中移除所有引用该媒体的元素
        if (data.tracks) {
            data.tracks.forEach((track: any) => {
                if (track.elements) {
                    track.elements = track.elements.filter((el: any) => el.mediaId !== id);
                }
            });
        }

        fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2));

        return NextResponse.json({ success: true, message: "Asset and physical file deleted" });
    } catch (e) {
        console.error("[Delete API] Error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
