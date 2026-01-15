/**
 * Export Progress API - Server-Sent Events for real-time progress
 */

import { NextRequest } from "next/server";

// Store for export progress (in-memory, per-server)
const exportProgress = new Map<string, { progress: number; status: string; error?: string }>();

export function setExportProgress(exportId: string, progress: number, status: string, error?: string) {
    exportProgress.set(exportId, { progress, status, error });
}

export function getExportProgress(exportId: string) {
    return exportProgress.get(exportId);
}

export function clearExportProgress(exportId: string) {
    exportProgress.delete(exportId);
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const exportId = searchParams.get("id");

    if (!exportId) {
        return new Response("Missing export ID", { status: 400 });
    }

    const encoder = new TextEncoder();
    let isClosed = false;
    let intervalId: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
        start(controller) {
            const sendEvent = (data: object) => {
                if (isClosed) return;
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch (e) {
                    // Controller might be closed, mark as closed
                    isClosed = true;
                    cleanup();
                }
            };

            const cleanup = () => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                clearExportProgress(exportId);
            };

            // Poll for progress updates
            intervalId = setInterval(() => {
                if (isClosed) {
                    cleanup();
                    return;
                }

                const progress = getExportProgress(exportId);

                if (progress) {
                    sendEvent(progress);

                    if (progress.status === "complete" || progress.status === "error") {
                        isClosed = true;
                        cleanup();
                        try {
                            controller.close();
                        } catch (e) {
                            // Already closed
                        }
                    }
                }
            }, 300); // Check every 300ms

            // Cleanup after 5 minutes (timeout)
            timeoutId = setTimeout(() => {
                isClosed = true;
                cleanup();
                try {
                    controller.close();
                } catch (e) {
                    // Already closed
                }
            }, 5 * 60 * 1000);
        },
        cancel() {
            // Client disconnected
            isClosed = true;
            if (intervalId) {
                clearInterval(intervalId);
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            clearExportProgress(exportId);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
