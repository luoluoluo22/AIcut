import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
        }

        console.log(`[AI Gen] Generating image (via Python) for: ${prompt}`);

        // Determine output directory based on current project
        let outputDir;
        try {
            // Attempt to find the project root and read snapshot
            // We assume workspace root is 3 levels up from apps/web (f:\桌面\开发\AIcut)
            const workspaceRoot = path.resolve(process.cwd(), '../../../');
            const snapshotPath = path.join(workspaceRoot, 'ai_workspace', 'project-snapshot.json');

            if (fs.existsSync(snapshotPath)) {
                const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
                const projectId = snapshot.project?.id;

                if (projectId) {
                    outputDir = path.join(workspaceRoot, 'projects', projectId, 'assets', 'images');
                }
            }
        } catch (err) {
            console.error("[AI Gen] Failed to resolve project path:", err);
        }

        // Fallback if project path resolution fails
        if (!outputDir) {
            outputDir = path.join(process.cwd(), 'public', 'materials', 'ai-generated');
        }

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filename = `ai_gen_${Date.now()}.jpg`;
        const outputPath = path.join(outputDir, filename);

        // Calculate absolute path to the python script
        const scriptPath = path.resolve(process.cwd(), '../../../tools/generators/flux_api.py');

        console.log(`[AI Gen] Script path: ${scriptPath}`);

        // Spawn Python process
        await new Promise<void>((resolve, reject) => {
            const process = spawn('python', [scriptPath, '--prompt', prompt, '--output', outputPath]);

            let outputLog = '';

            process.stdout.on('data', (d) => {
                const s = d.toString();
                outputLog += s;
                console.log(`[Python] ${s.trim()}`);
            });

            process.stderr.on('data', (d) => {
                const s = d.toString();
                outputLog += s;
                console.error(`[Python Err] ${s.trim()}`);
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Python script exited with code ${code}. Logs: ${outputLog.slice(-200)}`));
                }
            });

            process.on('error', (err) => {
                reject(err);
            });
        });

        // Verify file exists
        if (!fs.existsSync(outputPath)) {
            throw new Error("Python script finished successfully but output file was not found.");
        }

        console.log(`[AI Gen] Saved to ${outputPath}`);

        // Return local URL using serve API for absolute robustness
        const serveUrl = `/api/media/serve?path=${encodeURIComponent(outputPath)}`;
        return NextResponse.json({
            url: serveUrl,
            filename: filename,
            prompt
        });

    } catch (e: any) {
        console.error("[AI Gen] Internal Error:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
