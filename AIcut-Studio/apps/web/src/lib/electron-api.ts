/**
 * AIcut Electron API 类型定义
 * 用于 TypeScript 支持
 */

export interface ElectronAPI {
    // 文件系统
    readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
    getFileInfo: (filePath: string) => Promise<{
        success: boolean;
        exists?: boolean;
        size?: number;
        isFile?: boolean;
        isDirectory?: boolean;
        mtime?: string;
        error?: string;
    }>;
    listDirectory: (dirPath: string) => Promise<{
        success: boolean;
        items?: Array<{ name: string; isDirectory: boolean; path: string }>;
        error?: string;
    }>;
    showInFolder: (filePath: string) => Promise<{ success: boolean }>;

    // 对话框
    openFileDialog: (options?: {
        title?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
        properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles'>;
    }) => Promise<{
        canceled: boolean;
        filePaths: string[];
    }>;
    saveFileDialog: (options?: {
        title?: string;
        defaultPath?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<{
        canceled: boolean;
        filePath?: string;
    }>;

    // 应用信息
    getAppInfo: () => Promise<{
        name: string;
        version: string;
        electronVersion: string;
        nodeVersion: string;
        platform: string;
        isDev: boolean;
    }>;
    getPaths: () => Promise<{
        appRoot: string;
        workspaceRoot: string;
        userData: string;
        temp: string;
        aicutDir: string;
    }>;

    // FFmpeg
    runFFmpeg: (args: string[]) => Promise<{
        success: boolean;
        code?: number;
        stdout?: string;
        stderr?: string;
        error?: string;
    }>;

    // 事件
    on: (channel: string, callback: (...args: any[]) => void) => void;
    removeListener: (channel: string, callback: (...args: any[]) => void) => void;

    // 平台检测
    isElectron: boolean;
    platform: string;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

/**
 * 检查是否在 Electron 环境中运行
 */
export function isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

/**
 * 获取 Electron API（如果可用）
 */
export function getElectronAPI(): ElectronAPI | null {
    if (isElectron()) {
        return window.electronAPI!;
    }
    return null;
}
