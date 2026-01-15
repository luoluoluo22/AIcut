import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const mode = formData.get('mode') as 'text' | 'image';
        const prompt = (formData.get('prompt') as string) || '';
        const imageFile = formData.get('image') as File | null;

        if (!mode) {
            return NextResponse.json({ error: 'Missing mode' }, { status: 400 });
        }

        // Prepare directories
        // public/materials/ai-generated -> use base project root or current app public dir
        const publicDir = path.resolve(process.cwd(), 'public/materials/ai-generated');
        const tempDir = path.resolve(process.cwd(), 'temp/uploads');

        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        let imagePath = '';
        if (mode === 'image' && imageFile) {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            imagePath = path.join(tempDir, `ref_${Date.now()}_${imageFile.name}`);
            fs.writeFileSync(imagePath, buffer);
        }

        const scriptPath = path.resolve(process.cwd(), '../../../tools/grok_adapter.py');
        console.log(`[AI Video] Starting ${mode}-to-video generation...`);
        console.log(`[AI Video] Saving to: ${publicDir}`);

        // Call Python Adapter
        const resultPath = await new Promise<string>((resolve, reject) => {
            const args = [
                scriptPath,
                '--mode', mode,
                '--prompt', prompt,
                '--output_dir', publicDir // Pass absolute path
            ];
            if (imagePath) {
                args.push('--image', imagePath);
            }

            const pythonProcess = spawn('python', args);

            let stdout = '';
            let stderr = '';

            pythonProcess.stdout.on('data', (data) => {
                const str = data.toString();
                stdout += str;
                process.stdout.write(`[Adapter]: ${str}`);
            });

            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
                process.stderr.write(`[Adapter Error]: ${data.toString()}`);
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    // Look for the special OUTPUT_PATH marker, usually at the end
                    const lines = stdout.split('\n');
                    const lastLineWithPath = lines.find(l => l.includes('OUTPUT_PATH:'));
                    if (lastLineWithPath) {
                        const finalPath = lastLineWithPath.split('OUTPUT_PATH:')[1].trim();
                        resolve(finalPath);
                    } else {
                        reject(new Error('Process finished but no OUTPUT_PATH was found in logs.'));
                    }
                } else {
                    reject(new Error(`Python process failed with code ${code}. Check logs.`));
                }
            });
        });

        // Clean up temp image
        if (imagePath && fs.existsSync(imagePath)) {
            try { fs.unlinkSync(imagePath); } catch (e) { }
        }

        const filename = path.basename(resultPath);
        const urlPath = `/materials/ai-generated/${filename}`;

        return NextResponse.json({
            url: urlPath,
            name: filename,
            type: 'video'
        });

    } catch (error: any) {
        console.error('[AI Video] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
