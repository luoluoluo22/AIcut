/**
 * AIcut Electron 主进程
 * 负责创建窗口、管理 Python 进程、提供原生 API
 */

const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const url = require('url')

// 开发模式检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// 全局变量
let mainWindow = null
let pythonProcess = null

// 开发模式下的根目录应该是 AIcut 文件夹 (包含 tools/ 和 AIcut-Studio/)
const WORKSPACE_ROOT = isDev
  ? path.resolve(__dirname, '..', '..', '..', '..') // 从 apps/web/electron/ 回退 4 级到 AIcut
  : path.join(app.getPath('userData'), 'workspace')

console.log('[Electron] WORKSPACE_ROOT:', WORKSPACE_ROOT)
console.log(
  '[Electron] Tools Path:',
  path.join(WORKSPACE_ROOT, 'tools', 'core', 'ai_daemon.py')
)

const AICUT_DIR = path.join(WORKSPACE_ROOT, '.aicut')

// 确保工作目录存在
function ensureDirectories() {
  if (!fs.existsSync(AICUT_DIR)) {
    fs.mkdirSync(AICUT_DIR, { recursive: true })
  }
}

// 状态存储路径
const WINDOW_STATE_PATH = path.join(
  app.getPath('userData'),
  'window-state.json'
)
const APP_STATE_PATH = path.join(app.getPath('userData'), 'app-state.json')

// 创建主窗口
function createWindow() {
  let windowState = {
    width: 1280,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false,
  }
  try {
    if (fs.existsSync(WINDOW_STATE_PATH)) {
      windowState = JSON.parse(fs.readFileSync(WINDOW_STATE_PATH, 'utf-8'))
    }
  } catch (e) {
    console.error('Failed to load window state', e)
  }

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'AIcut Studio',
    backgroundColor: '#000000',
  })

  if (windowState.isMaximized) {
    mainWindow.maximize()
  }

  // 隐藏菜单栏
  mainWindow.setMenuBarVisibility(false)

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `http://localhost:${apiPort}`

  mainWindow.loadURL(startUrl)

  if (isDev) {
    // mainWindow.webContents.openDevTools()
  }

  const saveState = () => {
    const bounds = mainWindow.getBounds()
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
    }
    fs.writeFileSync(WINDOW_STATE_PATH, JSON.stringify(state))
  }

  mainWindow.on('resize', saveState)
  mainWindow.on('move', saveState)
  mainWindow.on('close', saveState)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const { startServer } = require('./serve-api')

// ... (existing constants)

let apiPort = 3000 // Default for Dev

// 启动 Python AI Daemon
function startPythonDaemon(port) {
  if (pythonProcess) return

  const isPackaged = app.isPackaged;

  // 确定 Python 解释器路径
  let pythonPath = 'python'; // 默认使用系统路径

  if (isPackaged) {
    // 打包后，解释器应该在 resources 目录下 (由 electron-builder 复制)
    // 根据 Windows 路径规则：resources/python/python.exe
    const bundledPython = path.join(process.resourcesPath, 'python', 'python.exe');
    if (fs.existsSync(bundledPython)) {
      pythonPath = bundledPython;
      console.log('[Electron] Using bundled Python:', pythonPath);
    }
  }

  const pythonScript = path.join(
    // 注意：在打包且使用内置 Server 的情况下，WORKSPACE_ROOT 可能仍指向 UserData
    // 但 tools 脚本位于 app.asar/resources/....
    // 这里也是一个潜在坑点。如果 tools 脚本被打包进 app.asar，Python 可能无法直接运行 py 文件
    // 先假设 tools 目录被复制到了 extraResources (package.json 配置了)
    // 如果没有配置 extraResources: "tools"，则需要在 startServer 里把 tools 释放出来，或者由 electron-builder 复制
    // package.json 里的 extraResources 确实包含了 "tools" -> "tools"
    isPackaged ? path.join(process.resourcesPath, 'tools', 'core', 'ai_daemon.py') :
      path.join(WORKSPACE_ROOT, 'tools', 'core', 'ai_daemon.py')
  );

  if (!fs.existsSync(pythonScript)) {
    console.log('[Electron] Python daemon script not found:', pythonScript);
    return;
  }

  console.log('[Electron] Starting Python AI Daemon on port:', port);

  const trySpawn = (cmd) => {
    console.log(`[Electron] Spawning: ${cmd} "${pythonScript}"`);
    const proc = spawn(cmd, ['-u', `"${pythonScript}"`], {
      cwd: isPackaged ? path.join(process.resourcesPath, 'tools') : WORKSPACE_ROOT,
      env: {
        ...process.env,
        WORKSPACE_ROOT: isPackaged ? path.join(process.resourcesPath) : WORKSPACE_ROOT, // Update root for packaged
        API_PORT: port.toString(), // Pass the dynamic port
        PYTHONIOENCODING: 'utf-8',
        // 如果是内置环境，强制让 Python 寻找内置的库路径
        PYTHONPATH: isPackaged ? path.join(process.resourcesPath, 'tools') : path.join(WORKSPACE_ROOT, 'tools')
      },
      shell: true,
      windowsVerbatimArguments: true,
    });

    const decodeOutput = (data) => {
      return data.toString() // 先用最基础的 String 转换，避免 TextDecoder 报错
    }

    proc.stdout.on('data', (data) => {
      const text = decodeOutput(data)
      process.stdout.write(`[Python Stdout] ${text}`) // 使用基础输出
      if (mainWindow) {
        mainWindow.webContents.send('python-output', text)
      }
    })

    proc.stderr.on('data', (data) => {
      const text = decodeOutput(data)
      process.stderr.write(`[Python Stderr] ${text}`)
      if (mainWindow) {
        mainWindow.webContents.send('python-output', text)
      }
    })

    proc.on('close', (code) => {
      if (code !== null) {
        console.log(`[Electron] Python daemon exited with code ${code}`)
      }
      if (pythonProcess === proc) pythonProcess = null
    })

    return proc;
  };

  pythonProcess = trySpawn(pythonPath);
}

// 停止 Python 进程
function stopPythonDaemon() {
  if (pythonProcess) {
    console.log('[Electron] Stopping Python daemon...')
    pythonProcess.kill()
    pythonProcess = null
  }
}

// 生命周期管理
app.whenReady().then(async () => {
  ensureDirectories()

  if (!isDev) {
    // 生产模式：启动本地 API 服务器
    try {
      // 在打包环境中，__dirname 位于 resources/app.asar/electron
      // out 位于 resources/app.asar/out (由 files 配置决定)
      const staticDir = path.join(__dirname, '..', 'out');
      console.log('[Electron] Starting local server for:', staticDir);

      // 确保 WORKSPACE_ROOT 正确指向用户数据目录（生产环境）
      const wsRoot = path.join(app.getPath('userData'), 'workspace');
      if (!fs.existsSync(wsRoot)) fs.mkdirSync(wsRoot, { recursive: true });

      apiPort = await startServer({
        workspaceRoot: wsRoot,
        staticDir: staticDir,
        port: 0 // Random port
      });
      console.log('[Electron] Local server started on port:', apiPort);
    } catch (e) {
      console.error('[Electron] Failed to start local server:', e);
    }
  }

  // 注册自定义协议，用于正确加载打包后的静态资源
  if (!isDev) {
    // Remove old protocol handler...
    // In packaged mode, the local server handles static files, so the custom protocol handler is no longer needed.
    // The `startUrl` for `mainWindow.loadURL` will now point to the local server.
  }

  createWindow()
  startPythonDaemon(apiPort)

  // 尝试恢复上次的项目界面
  mainWindow.webContents.on('did-finish-load', () => {
    try {
      if (fs.existsSync(APP_STATE_PATH)) {
        const appState = JSON.parse(fs.readFileSync(APP_STATE_PATH, 'utf-8'))
        if (appState.lastProjectId) {
          // 如果存在上次的项目 ID，且不是在主页停留，则跳转 (仅限启动且 URL 是根路径时)
          const currentUrl = mainWindow.webContents.getURL()
          if (
            currentUrl.endsWith(':3000/') ||
            currentUrl.endsWith(`:${apiPort}/`) || // Check for dynamic port
            currentUrl.endsWith('index.html')
          ) {
            console.log(
              '[Electron] Navigating to last project:',
              appState.lastProjectId
            )
            const editorUrl = isDev
              ? `http://localhost:3000/editor/${appState.lastProjectId}`
              : `http://localhost:${apiPort}/editor/${appState.lastProjectId}` // Use dynamic port
            // 注意：Next.js client-side navigation 可能更好，但这里直接注入新 URL
            mainWindow.loadURL(editorUrl)
          }
        }
      }
    } catch (e) {
      console.error('Failed to restore app state', e)
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopPythonDaemon()
  if (process.platform !== 'darwin') app.quit()
})

// ============= IPC 处理器 =============

// 读取本地文件
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath)
    return { success: true, data: buffer.toString('base64') }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 写入本地文件
ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 选择本地文件 (legacy)
ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

// 打开文件对话框 (for media import with absolute paths)
ipcMain.handle('open-file-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

// 保存文件对话框
ipcMain.handle('save-file-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})

// 在资源管理器中显示
ipcMain.handle('show-item-in-folder', async (event, filePath) => {
  shell.showItemInFolder(filePath)
})

// 获取应用信息
ipcMain.handle('get-app-info', () => {
  return {
    name: app.getName(),
    version: app.getVersion(),
    isDev: isDev,
  }
})

// 获取应用路径
ipcMain.handle('get-paths', () => {
  return {
    appData: app.getPath('userData'),
    workspace: WORKSPACE_ROOT,
    temp: app.getPath('temp'),
    desktop: app.getPath('desktop'),
  }
})

// 记录最后一次的项目 ID
ipcMain.handle('set-last-project', (event, projectId) => {
  try {
    const appState = { lastProjectId: projectId }
    fs.writeFileSync(APP_STATE_PATH, JSON.stringify(appState))
    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})
