/**
 * Video Export API Route
 * Uses Remotion to render the project to MP4
 * 
 * Accepts FormData with:
 * - projectData: JSON string with tracks and metadata
 * - format: "mp4" or "webm"
 * - quality: "low" | "medium" | "high" | "very_high"
 * - exportId: unique ID for progress tracking
 * - media_[id]: actual media files
 */

import { NextRequest, NextResponse } from "next/server";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";
import { setExportProgress } from "./progress/route";

export const maxDuration = 300; // 5 minutes max

// Temp directory for export media files
const EXPORT_TEMP_DIR = path.join(os.tmpdir(), "aicut-export-media");

// Get optimal concurrency based on CPU cores
const getOptimalConcurrency = () => {
    const cpus = os.cpus().length;
    // Use about 75% of CPU cores for rendering
    return Math.max(2, Math.floor(cpus * 0.75));
};

export async function POST(request: NextRequest) {
    let savedFiles: string[] = [];
    let exportId: string | null = null;

    try {
        // Parse FormData
        const formData = await request.formData();

        const projectDataStr = formData.get("projectData") as string;
        const format = (formData.get("format") as string) || "mp4";
        const quality = (formData.get("quality") as string) || "medium";
        exportId = (formData.get("exportId") as string) || null;

        if (!projectDataStr) {
            return NextResponse.json(
                { error: "No project data provided" },
                { status: 400 }
            );
        }

        const projectData = JSON.parse(projectDataStr);

        console.log("Export request received");
        console.log("Duration:", projectData.durationInFrames, "frames");
        console.log("Media files:", projectData.mediaMetadata?.length || 0);
        console.log("Export ID:", exportId);

        // Update progress
        if (exportId) {
            setExportProgress(exportId, 5, "preparing");
        }

        // Create temp directory
        if (!fs.existsSync(EXPORT_TEMP_DIR)) {
            fs.mkdirSync(EXPORT_TEMP_DIR, { recursive: true });
        }

        // Get the base URL for serving media files
        const origin = request.headers.get("origin") || `http://localhost:${process.env.PORT || 3000}`;

        // Save uploaded media files to temp directory
        const mediaFilesData: Array<{
            id: string;
            name: string;
            type: string;
            filePath: string;
            httpUrl: string;
        }> = [];

        for (const meta of projectData.mediaMetadata || []) {
            const fileKey = `media_${meta.id}`;
            const file = formData.get(fileKey) as File | null;

            if (file) {
                const ext = path.extname(meta.name) || `.${meta.type === 'video' ? 'mp4' : meta.type === 'audio' ? 'mp3' : 'png'}`;
                const filePath = path.join(EXPORT_TEMP_DIR, `${meta.id}${ext}`);

                const arrayBuffer = await file.arrayBuffer();
                fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

                savedFiles.push(filePath);

                const httpUrl = `${origin}/api/media/${meta.id}`;

                mediaFilesData.push({
                    id: meta.id,
                    name: meta.name,
                    type: meta.type,
                    filePath,
                    httpUrl,
                });

                console.log(`Saved: ${filePath} (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
            }
        }

        if (exportId) {
            setExportProgress(exportId, 10, "bundling");
        }

        // Build final project data for Remotion
        const remotionProjectData = {
            tracks: projectData.tracks,
            mediaFiles: mediaFilesData.map(m => ({
                id: m.id,
                name: m.name,
                type: m.type,
                httpUrl: m.httpUrl,
            })),
            fps: projectData.fps,
            width: projectData.width,
            height: projectData.height,
            durationInFrames: projectData.durationInFrames,
            backgroundColor: projectData.backgroundColor,
        };

        // Quality to CRF mapping
        const qualityMap: Record<string, number> = {
            low: 28,
            medium: 23,
            high: 18,
            very_high: 15,
        };
        const crf = qualityMap[quality] || 23;

        // Create output directory
        const outputDir = path.join(os.tmpdir(), "aicut-exports");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, `export-${Date.now()}.${format}`);

        console.log("Starting Remotion bundle...");

        // Bundle the Remotion project
        const bundleLocation = await bundle({
            entryPoint: path.resolve(process.cwd(), "src/remotion/index.tsx"),
            webpackOverride: (config) => config,
        });

        console.log("Bundle created at:", bundleLocation);

        if (exportId) {
            setExportProgress(exportId, 15, "selecting");
        }

        // Select the composition
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: "AIcutExport",
            inputProps: {
                projectData: remotionProjectData,
            },
        });

        // Override composition settings
        const finalComposition = {
            ...composition,
            width: projectData.width || 1920,
            height: projectData.height || 1080,
            fps: projectData.fps || 30,
            durationInFrames: projectData.durationInFrames || 300,
        };

        const concurrency = getOptimalConcurrency();
        console.log(
            "Starting render:",
            finalComposition.width, "x", finalComposition.height,
            "@", finalComposition.fps, "fps,",
            finalComposition.durationInFrames, "frames,",
            "concurrency:", concurrency
        );

        if (exportId) {
            setExportProgress(exportId, 20, "rendering");
        }

        // Render the video with optimized settings
        await renderMedia({
            composition: finalComposition,
            serveUrl: bundleLocation,
            codec: format === "webm" ? "vp8" : "h264",
            outputLocation: outputPath,
            inputProps: {
                projectData: remotionProjectData,
            },
            crf,
            concurrency,  // Parallel rendering
            onProgress: ({ progress }) => {
                const percent = Math.round(20 + progress * 75); // 20% to 95%
                console.log(`Rendering: ${Math.round(progress * 100)}%`);
                if (exportId) {
                    setExportProgress(exportId, percent, "rendering");
                }
            },
        });

        console.log("Render complete:", outputPath);

        if (exportId) {
            setExportProgress(exportId, 98, "finalizing");
        }

        // Read the file
        const videoBuffer = fs.readFileSync(outputPath);

        // Clean up temp files
        fs.unlinkSync(outputPath);
        for (const file of savedFiles) {
            try {
                fs.unlinkSync(file);
            } catch (e) {
                // Ignore
            }
        }

        if (exportId) {
            setExportProgress(exportId, 100, "complete");
        }

        // Return the video file
        return new NextResponse(videoBuffer, {
            headers: {
                "Content-Type": format === "webm" ? "video/webm" : "video/mp4",
                "Content-Disposition": `attachment; filename="export.${format}"`,
                "Content-Length": videoBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("Export failed:", error);

        // Clean up temp files on error
        for (const file of savedFiles) {
            try {
                fs.unlinkSync(file);
            } catch (e) {
                // Ignore
            }
        }

        if (exportId) {
            setExportProgress(exportId, 0, "error", error instanceof Error ? error.message : "Unknown error");
        }

        return NextResponse.json(
            {
                error: "Export failed",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
