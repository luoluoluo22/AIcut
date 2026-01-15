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

        // Prepare paths
        const materialsDir = path.join(process.cwd(), 'public', 'materials', 'ai-generated');
        if (!fs.existsSync(materialsDir)) {
            fs.mkdirSync(materialsDir, { recursive: true });
        }

        const filename = `ai_gen_${Date.now()}.jpg`;
        const outputPath = path.join(materialsDir, filename);

        // Calculate absolute path to the python script
        const scriptPath = path.resolve(process.cwd(), '../../../tools/flux_api.py');

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

        // Return local URL
        return NextResponse.json({
            url: `/materials/ai-generated/${filename}`,
            filename: filename,
            prompt
        });

    } catch (e: any) {
        console.error("[AI Gen] Internal Error:", e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
