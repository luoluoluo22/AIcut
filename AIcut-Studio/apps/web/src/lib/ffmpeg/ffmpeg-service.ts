// MOCKED FFmpeg service
import { ExportFormat, ExportQuality, ExportOptions } from "@/types/export";
import { TProject } from "@/types/project";

// Define a minimal interface for what we used from FFmpeg
export interface MockFFmpeg {
    loaded: boolean;
    load: () => Promise<void>;
    on: () => void;
    writeFile: () => Promise<void>;
    readFile: () => Promise<Uint8Array>;
    deleteFile: () => Promise<void>;
    exec: () => Promise<number>;
    terminate: () => void;
}

let ffmpeg: MockFFmpeg | null = null;

export const loadFFmpeg = async () => {
    if (ffmpeg) {
        return ffmpeg;
    }

    ffmpeg = {
        loaded: true,
        load: async () => { },
        on: () => { },
        writeFile: async () => { },
        readFile: async () => new Uint8Array(),
        deleteFile: async () => { },
        exec: async () => 0,
        terminate: () => { },
    };

    return ffmpeg;
}

export const renderVideo = async (options: ExportOptions) => {
    console.log("Mock Rendering video with options:", options);
    // Simulate progress
    options.onProgress?.(0.1);
    await new Promise(r => setTimeout(r, 200));
    options.onProgress?.(0.5);
    await new Promise(r => setTimeout(r, 200));
    options.onProgress?.(1.0);

    return new Uint8Array([0, 0, 0]);
}
