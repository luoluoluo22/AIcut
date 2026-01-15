/**
 * AIcut Electron 预加载脚本
 * 安全地暴露 Node.js API 给渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // ============= 文件系统操作 =============

    /**
     * 读取本地文件
     * @param {string} filePath - 文件绝对路径
     * @returns {Promise<{success: boolean, data?: string, error?: string}>}
     */
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

    /**
     * 写入本地文件
     * @param {string} filePath - 文件绝对路径
     * @param {string} data - Base64 编码的数据
     */
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

    /**
     * 获取文件信息
     * @param {string} filePath - 文件绝对路径
     */
    getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),

    /**
     * 列出目录内容
     * @param {string} dirPath - 目录绝对路径
     */
    listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),

    /**
     * 在文件管理器中显示文件
     * @param {string} filePath - 文件绝对路径
     */
    showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),

    // ============= 对话框 =============

    /**
     * 打开文件选择对话框
     * @param {Object} options - 对话框选项
     */
    openFileDialog: (options = {}) => ipcRenderer.invoke('open-file-dialog', options),

    /**
     * 打开保存文件对话框
     * @param {Object} options - 对话框选项
     */
    saveFileDialog: (options = {}) => ipcRenderer.invoke('save-file-dialog', options),

    // ============= 应用信息 =============

    /**
     * 获取应用信息
     */
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),

    /**
     * 获取各种路径
     */
    getPaths: () => ipcRenderer.invoke('get-paths'),

    // ============= FFmpeg 操作 =============

    /**
     * 执行 FFmpeg 命令
     * @param {string[]} args - FFmpeg 参数数组
     */
    runFFmpeg: (args) => ipcRenderer.invoke('run-ffmpeg', args),

    // ============= 事件监听 =============

    /**
     * 监听主进程消息
     * @param {string} channel - 频道名
     * @param {Function} callback - 回调函数
     */
    on: (channel, callback) => {
        const validChannels = ['python-output', 'file-changed', 'export-progress'];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },

    /**
     * 移除事件监听
     * @param {string} channel - 频道名
     * @param {Function} callback - 回调函数
     */
    removeListener: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    },

    // ============= 平台检测 =============

    /**
     * 是否在 Electron 环境中运行
     */
    isElectron: true,

    /**
     * 平台信息
     */
    platform: process.platform,

    /**
     * 记录最后打开的项目 ID
     */
    setLastProject: (projectId) => ipcRenderer.invoke('set-last-project', projectId),
});

console.log('[Preload] Electron API exposed to renderer');
