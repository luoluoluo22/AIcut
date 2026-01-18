import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * POST /api/media/import-local
 * 从本地路径导入媒体文件到项目中
 * Body: { filePath: string, name: string, type: "audio" | "video" | "image" }
 */
export async function POST(req: NextRequest) {
    try {
        const { filePath, name, type, duration, startTime } = await req.json();

        // DEBUG LOGGING
        // Force logging
        const logPath = path.join(process.cwd(), "../../../debug_import.log");
        const logMsg = `[Import] NODE_ENV=${process.env.NODE_ENV}, Path: ${filePath}, Exists: ${fs.existsSync(filePath)}\n`;
        try {
            fs.appendFileSync(logPath, logMsg);
        } catch (e) { console.error("Log failed", e); }

        if (!filePath) {
            return NextResponse.json({ error: "Missing filePath" }, { status: 400 });
        }

        // 验证文件存在
        if (!fs.existsSync(filePath)) {
            const logPath = path.join(process.cwd(), "../../../debug_import.log");
            fs.appendFileSync(logPath, `[Import] FAIL: File not found: ${filePath}\n`);
            return NextResponse.json({ error: `File not found: ${filePath}` }, { status: 404 });
        }

        // 读取文件
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = name || path.basename(filePath);

        // 确定 MIME 类型
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".m4a": "audio/mp4",
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
        };
        const mimeType = mimeTypes[ext] || "application/octet-stream";

        // 生成唯一 ID
        const id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 返回文件内容和元数据
        return NextResponse.json({
            success: true,
            media: {
                id,
                name: fileName,
                type: type || (ext === ".mp3" || ext === ".wav" || ext === ".m4a" ? "audio" :
                    ext === ".mp4" || ext === ".webm" || ext === ".mov" ? "video" : "image"),
                duration: duration || 0,
                mimeType,
                // Base64 编码文件内容
                data: fileBuffer.toString("base64"),
                metadata: {
                    startTime: startTime || 0,
                    importedAt: new Date().toISOString(),
                    sourcePath: filePath
                }
            }
        });

    } catch (error) {
        console.error("[API] Import local media error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
