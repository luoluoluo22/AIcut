const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

/**
 * 创建并启动 API 服务器
 * @param {object} options
 * @param {string} options.workspaceRoot - 工作区根目录
 * @param {string} options.staticDir - 静态文件目录 (out)
 * @param {number} options.port - 监听端口 (0 为随机)
 * @returns {Promise<number>} 返回监听的端口
 */
function startServer({ workspaceRoot, staticDir, port = 0 }) {
    return new Promise((resolve, reject) => {
        const app = express();

        // 中间件
        app.use(cors());
        app.use(bodyParser.json({ limit: '50mb' }));

        // 初始化目录路径
        const EDITS_DIR = path.join(workspaceRoot, "ai_workspace");
        const PROJECTS_DIR = path.join(workspaceRoot, "projects");
        const HISTORY_DIR = path.join(EDITS_DIR, "history");
        const SNAPSHOT_FILE = path.join(EDITS_DIR, "project-snapshot.json");
        const PENDING_EDITS_FILE = path.join(EDITS_DIR, "pending-edits.json");

        // 确保目录存在
        [EDITS_DIR, PROJECTS_DIR, HISTORY_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        // --- 辅助函数 ---

        function loadPendingEdits() {
            try {
                if (fs.existsSync(PENDING_EDITS_FILE)) {
                    const data = JSON.parse(fs.readFileSync(PENDING_EDITS_FILE, "utf-8"));
                    if (Array.isArray(data)) return data.filter(e => e && e.id);
                }
            } catch (e) { console.error("Load edits error:", e); }
            return [];
        }

        function savePendingEdits(edits) {
            fs.writeFileSync(PENDING_EDITS_FILE, JSON.stringify(edits, null, 2));
        }

        function backupSnapshot() {
            if (!fs.existsSync(SNAPSHOT_FILE)) return;
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            const backupPath = path.join(HISTORY_DIR, `snapshot_${timestamp}.json`);
            fs.copyFileSync(SNAPSHOT_FILE, backupPath);
            // 清理旧备份 (保留20个)
            try {
                const files = fs.readdirSync(HISTORY_DIR)
                    .filter(f => f.startsWith("snapshot_") && f.endsWith(".json"))
                    .sort().reverse();
                files.slice(20).forEach(f => fs.unlinkSync(path.join(HISTORY_DIR, f)));
            } catch (e) { }
        }

        function archiveToProject(projectId) {
            if (!fs.existsSync(SNAPSHOT_FILE)) return false;
            const projectDir = path.join(PROJECTS_DIR, projectId);
            if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
            fs.copyFileSync(SNAPSHOT_FILE, path.join(projectDir, "snapshot.json"));
            return true;
        }

        // Helper: Determine which snapshot is newer (Workspace vs Archive)
        function getNewestSnapshotPath(projectId) {
            const archivePath = path.join(PROJECTS_DIR, projectId, "snapshot.json");
            if (!fs.existsSync(archivePath)) return { path: SNAPSHOT_FILE, isWorkspace: true };

            if (fs.existsSync(SNAPSHOT_FILE)) {
                try {
                    const workspaceSnapshot = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8"));
                    if (workspaceSnapshot?.project?.id === projectId) {
                        const statWorkspace = fs.statSync(SNAPSHOT_FILE);
                        const statArchive = fs.statSync(archivePath);
                        if (statWorkspace.mtime > statArchive.mtime) return { path: SNAPSHOT_FILE, isWorkspace: true };
                    }
                } catch (e) { }
            }
            return { path: archivePath, isWorkspace: false };
        }

        function loadProjectToWorkspace(projectId) {
            const { path: newestPath, isWorkspace } = getNewestSnapshotPath(projectId);
            if (!fs.existsSync(newestPath)) return false;

            if (isWorkspace && newestPath === SNAPSHOT_FILE) {
                console.log(`[Express Load] Workspace for ${projectId} is newest. Syncing to archive.`);
                archiveToProject(projectId);
                return true;
            }

            backupSnapshot();
            fs.copyFileSync(newestPath, SNAPSHOT_FILE);
            console.log(`[Express Load] Loaded ${newestPath}`);
            return true;
        }

        // --- SSE Setup ---
        let sseClients = [];

        function broadcast(event, data) {
            sseClients.forEach(client => {
                client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            });
        }

        // 监听文件变化以触发 SSE Update
        // 简单实现：轮询检查文件修改时间，或者由 POST 动作直接触发
        // 为了性能，我们让 POST handler 主动触发

        // --- API Routes ---

        // 1. SSE Endpoint
        app.get('/api/ai-edit/sync', (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });

            const clientId = Date.now();
            const newClient = { id: clientId, res };
            sseClients.push(newClient);

            console.log(`[API Server] SSE Client connected (${sseClients.length} total)`);

            // Send newest snapshot immediately (simulated getSnapshot)
            try {
                // If we can detect projectId from workspace, check if archive is newer
                let newestPath = SNAPSHOT_FILE;
                if (fs.existsSync(SNAPSHOT_FILE)) {
                    const snap = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
                    if (snap?.project?.id) {
                        const { path: p } = getNewestSnapshotPath(snap.project.id);
                        newestPath = p;
                    }
                }

                if (fs.existsSync(newestPath)) {
                    const snap = JSON.parse(fs.readFileSync(newestPath, 'utf-8'));
                    res.write(`event: snapshot_update\ndata: ${JSON.stringify(snap)}\n\n`);
                }
            } catch (e) { }

            req.on('close', () => {
                sseClients = sseClients.filter(c => c.id !== clientId);
                console.log(`[API Server] SSE Client disconnected (${sseClients.length} total)`);
            });
        });

        // 2. GET API
        app.get('/api/ai-edit', (req, res) => {
            const action = req.query.action;

            if (action !== 'getPendingEdits') {
                console.log(`[API Server GET] Action: ${action}`);
            }

            try {
                if (action === "getPendingEdits") {
                    const edits = loadPendingEdits();
                    const pending = edits.filter(e => !e.processed);
                    return res.json({ success: true, edits: pending });
                }

                if (action === "listProjects") {
                    const projects = [];
                    if (fs.existsSync(PROJECTS_DIR)) {
                        const dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
                        for (const dir of dirs) {
                            if (dir.isDirectory()) {
                                const sPath = path.join(PROJECTS_DIR, dir.name, "snapshot.json");
                                if (fs.existsSync(sPath)) {
                                    try {
                                        const d = JSON.parse(fs.readFileSync(sPath, "utf-8"));
                                        if (d.project) {
                                            projects.push({
                                                id: d.project.id || dir.name,
                                                name: d.project.name || dir.name,
                                                createdAt: d.project.createdAt,
                                                updatedAt: d.project.updatedAt,
                                                thumbnail: d.project.thumbnail,
                                                source: "filesystem"
                                            });
                                        }
                                    } catch (e) { }
                                }
                            }
                        }
                    }
                    return res.json({ success: true, projects });
                }

                res.json({ success: true, message: "API Ready" });
            } catch (e) {
                console.error(e);
                res.status(500).json({ success: false, error: e.message });
            }
        });

        // 3. POST API
        app.post('/api/ai-edit', (req, res) => {
            try {
                const { action, data } = req.body;
                console.log(`[API Server POST] Action: ${action}`);

                // 创建任务记录
                const edit = {
                    id: `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    action,
                    data,
                    timestamp: Date.now(),
                    processed: false
                };

                // 处理特殊 Action
                if (action === "markProcessed") {
                    const ids = req.query.ids?.split(",") || data?.ids || [];
                    const all = loadPendingEdits();
                    all.forEach(e => { if (ids.includes(e.id)) e.processed = true; });
                    savePendingEdits(all.slice(-100));
                    return res.json({ success: true });
                }

                if (action === "updateSnapshot") {
                    // 前端发来的全量更新
                    backupSnapshot();
                    let current = {};
                    if (fs.existsSync(SNAPSHOT_FILE)) {
                        try { current = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8')); } catch (e) { }
                    }
                    const merged = {
                        ...current,
                        project: { ...(current.project || {}), ...(data.project || {}) },
                        tracks: data.tracks || current.tracks,
                        assets: data.assets || current.assets || []
                    };
                    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(merged, null, 2));

                    // 广播更新
                    broadcast('snapshot_update', merged);
                    return res.json({ success: true });
                }

                if (action === "switchProject") {
                    const pid = data?.projectId;
                    if (!pid) return res.status(400).json({ error: "Missing projectId" });

                    // Archive current
                    try {
                        const cur = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
                        if (cur.project?.id && cur.project.id !== pid) archiveToProject(cur.project.id);
                    } catch (e) { }

                    if (loadProjectToWorkspace(pid)) {
                        // 广播新状态
                        try {
                            const newSnap = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf-8'));
                            broadcast('snapshot_update', newSnap);
                        } catch (e) { }

                        return res.json({ success: true, message: `Switched to ${pid}` });
                    } else {
                        return res.status(404).json({ success: false, error: "Project not found" });
                    }
                }

                // 默认：存入队列
                const all = loadPendingEdits();
                all.push(edit);
                savePendingEdits(all);

                // 广播事件给前端 (如果是前端自己发的其实不需要，但保持对称性)
                broadcast('edit', edit);

                res.json({ success: true, editId: edit.id });

            } catch (e) {
                console.error(e);
                res.status(500).json({ success: false, error: e.message });
            }
        });

        // 4. Media Import API (模拟 /api/media/import-local)
        app.post('/api/media/import-local', async (req, res) => {
            // 这个 API 主要是为了读取本地文件并返回给前端
            // 在 Electron 环境下，前端其实可以直接读，但也行
            const { filePath } = req.body;
            if (fs.existsSync(filePath)) {
                // 简单实现：不返回 base64，而是返回一个可访问的 URL
                // 这里我们已经在 host 静态文件了，可以将文件所在的目录挂载为静态目录?
                // 或者直接用 res.sendFile
                // 但前端期望 json { media: { data: base64 } }

                // 读取文件转 Base64
                const buffer = fs.readFileSync(filePath);
                const base64 = buffer.toString('base64');
                const mime = filePath.endsWith('.mp3') ? 'audio/mpeg' : (filePath.endsWith('.png') ? 'image/png' : 'application/octet-stream');

                res.json({
                    success: true,
                    media: {
                        name: path.basename(filePath),
                        mimeType: mime,
                        data: base64
                    }
                });
            } else {
                res.status(404).json({ success: false, error: "File not found" });
            }
        });

        // --- Static Files ---
        // 挂载项目素材目录，以便前端访问 /projects/demo/assets/...
        app.use('/projects', express.static(PROJECTS_DIR));

        // 挂载打包后的 Next.js 静态文件
        app.use(express.static(staticDir));

        // Editor Dynamic Route Fallback (for Next.js Static Export)
        // Since we generate editor/demo.html, we can reuse it for other projects
        // assuming client-side hydration picks up the URL ID.
        app.get('/editor/:id', (req, res, next) => {
            const requestedId = req.params.id;
            // Avoid recursing on static files
            if (requestedId.includes('.')) return next();

            const specificFile = path.join(staticDir, 'editor', `${requestedId}.html`);
            if (fs.existsSync(specificFile)) return res.sendFile(specificFile);

            const demoFile = path.join(staticDir, 'editor', 'demo.html');
            if (fs.existsSync(demoFile)) {
                console.log(`[Express] Fallback: Serving demo.html for /editor/${requestedId}`);
                return res.sendFile(demoFile);
            }
            next();
        });

        // Fallback: 所有其他请求返回 index.html (SPA)
        app.get('*', (req, res) => {
            if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API Not Found' });
            res.sendFile(path.join(staticDir, 'index.html'));
        });

        // Start
        const server = app.listen(port, '127.0.0.1', () => {
            const addr = server.address();
            console.log(`[Express] Server running at http://127.0.0.1:${addr.port}`);
            resolve(addr.port);
        });

        server.on('error', reject);
    });
}

module.exports = { startServer };
