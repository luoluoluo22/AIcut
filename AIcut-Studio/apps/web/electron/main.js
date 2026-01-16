/**
 * AIcut Electron 主进程
 * 负责创建窗口、管理 Python 进程、提供原生 API
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

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
    : `file://${path.join(__dirname, '../out/index.html')}`

  mainWindow.loadURL(startUrl)

  if (isDev) {
    mainWindow.webContents.openDevTools()
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

// 启动 Python AI Daemon
function startPythonDaemon() {
  const pythonScript = path.join(
    WORKSPACE_ROOT,
    'tools',
    'core',
    'ai_daemon.py'
  )

  if (!fs.existsSync(pythonScript)) {
    console.log('[Electron] Python daemon script not found:', pythonScript)
    return
  }

  console.log('[Electron] Starting Python AI Daemon...')

  const trySpawn = (cmd) => {
    console.log(`[Electron] Spawning: ${cmd} "${pythonScript}"`)
    const proc = spawn(cmd, ['-u', `"${pythonScript}"`], {
      cwd: WORKSPACE_ROOT,
      env: { ...process.env, WORKSPACE_ROOT, PYTHONIOENCODING: 'utf-8' },
      shell: true,
      windowsVerbatimArguments: true,
    })

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

    return proc
  }

  pythonProcess = trySpawn('python')
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
app.whenReady().then(() => {
  ensureDirectories()
  createWindow()
  startPythonDaemon()

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
            currentUrl.endsWith('index.html')
          ) {
            console.log(
              '[Electron] Navigating to last project:',
              appState.lastProjectId
            )
            const editorUrl = isDev
              ? `http://localhost:3000/editor/${appState.lastProjectId}`
              : `file://${path.join(__dirname, '../out/index.html')}#/editor/${appState.lastProjectId
              }`
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
