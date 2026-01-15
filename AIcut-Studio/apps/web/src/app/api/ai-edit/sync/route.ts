import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const EDITS_DIR = path.resolve(process.cwd(), "../../..", ".aicut");
const SYNC_FILE = path.join(EDITS_DIR, "sync-input.json");

/**
 * SSE 实时同步接口 - 实现“监控文件，自动热更新时间轴”
 */
export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // 确保目录存在
            if (!fs.existsSync(EDITS_DIR)) {
                fs.mkdirSync(EDITS_DIR, { recursive: true });
            }

            // 发送初始连接成功消息
            controller.enqueue(encoder.encode("event: connected\ndata: { \"status\": \"ready\" }\n\n"));

            // --- 核心逻辑：监听文件系统 ---
            const watcher = fs.watch(EDITS_DIR, (eventType, filename) => {
                const isSyncFile = filename === "sync-input.json";
                const isSnapshotFile = filename === "project-snapshot.json";

                if (isSyncFile || isSnapshotFile) {
                    try {
                        const targetFile = path.join(EDITS_DIR, filename);
                        if (fs.existsSync(targetFile)) {
                            const content = fs.readFileSync(targetFile, "utf-8");
                            if (!content.trim()) return;

                            const data = JSON.parse(content);

                            // 如果是快照文件变了，我们提取里面的 tracks 和 project 并伪装成 setFullState 发给网页
                            if (isSnapshotFile) {
                                if (data.tracks || data.project) {
                                    console.log("[SSE] Snapshot file change detected, pushing update to Web...");
                                    controller.enqueue(encoder.encode(`event: update\ndata: ${JSON.stringify({
                                        action: "setFullState",
                                        tracks: data.tracks,
                                        project: data.project
                                    })}\n\n`));
                                }
                            } else {
                                // 如果是控制文件变了，直接转发
                                console.log("[SSE] Sync input file change detected, pushing update to Web...");
                                controller.enqueue(encoder.encode(`event: update\ndata: ${JSON.stringify(data)}\n\n`));
                            }
                        }
                    } catch (e) {
                        // 忽略读取时的瞬时错误（如文件正在被写入）
                    }
                }
            });

            // 当连接关闭时，停止监听
            req.signal.addEventListener("abort", () => {
                watcher.close();
                controller.close();
                console.log("[SSE] Client disconnected, watcher closed.");
            });
        },
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
