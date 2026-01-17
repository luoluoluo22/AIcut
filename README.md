# AIcut - 全自动 AI 视频剪辑引擎

[![Node](https://img.shields.io/badge/Front--end-Next.js-black.svg)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Logic-Python-green.svg)](https://python.org)
[![Electron](https://img.shields.io/badge/App-Electron-blue.svg)](https://electronjs.org)

**AIcut** 是一款 **AI 原生** 的全自动视频制作引擎。它将强大的前端时间轴（Timeline）与后端 Python AI 逻辑结合，实现真正的自动化视频生产。

---

## 🚀 快速启动

若要在本地启动 AIcut 编辑器，请遵循以下步骤：

### 1. 环境准备
- **Node.js**: 18.0+
- **Python**: 3.10+
- **包管理器**: 推荐使用 **Bun** (本项目已配置 bun.lock)

### 2. 安装与启动

1. **安装 Python 依赖** (根目录):
   ```bash
   pip install -e .
   ```

2. **安装前端依赖** (进入 `AIcut-Studio` 目录):
   ```bash
   cd AIcut-Studio
   npm install  # 或者使用 bun install
   ```

3. **启动项目**:
   建议开两个终端分别运行（在 `AIcut-Studio/apps/web` 目录下）：
   
   - **终端 1 (启动 Next.js 服务)**:
     ```bash
     cd AIcut-Studio/apps/web
     npm run dev
     ```
   
   - **终端 2 (启动 Electron 客户端)**:
     ```bash
     cd AIcut-Studio/apps/web
     npm run electron  # 或者 npx electron .
     ```

   > **注意**: 首次启动请确保已配置 `.env.local` 文件（可参考 `apps/web/.env.example`）。

## 🔧 常见问题 (Troubleshooting)

### Electron 启动报错: "Electron binary not found"
这种情况常见于网络环境导致 electron 二进制文件下载失败。请尝试手动运行安装脚本：

```bash
cd AIcut-Studio
node node_modules/electron/install.js
```
或者使用淘宝镜像加速：
```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ bun install
```

---

## 🤖 如何让 AI 进行剪辑？

AIcut 的设计思路是：**前端负责渲染与呈现，后端 Python 负责思考与控制**。

### AI 剪辑的工作流
1. **获取状态**: AI 脚本通过读取 `ai_workspace/project-snapshot.json` 获取当前视频的时间轴状态。
2. **生成指令**: AI 根据需求（如“帮我生成旁白”、“自动配图”）计算出新的时间轴结构。
3. **写入状态**: AI 直接修改并保存 `ai_workspace/project-snapshot.json` 文件。
4. **热重载**: 编辑器通过 SSE 监听文件变化，实时更新时间轴预览。

### 剪辑时应修改哪个文件？
如果你想自定义 AI 的剪辑逻辑（例如：修改字幕生成方式、调整转场算法），你应该在 **`tools/`** 目录下操作：
- **`tools/core/ai_daemon.py`**: 核心守护进程，负责 AI 与前端的通信。
- **`tools/demos/create_xiuxian_vlog.py`**: 一个具体的 AI 剪辑示例脚本，演示了如何从 0 到 1 生成一个视频。
- **`tools/core/aicut_sdk.py`**: 提供给 AI 使用的工具包。

### 素材（Materials）存放在哪里？
为了让 AI 方便管理及编辑器能够正确引用，请遵循以下规范：
- **项目素材**: 存放在 **`projects/<项目名>/assets/`** 目录中，按 `videos/`, `images/`, `audio/` 分类。
- **前端引用**: 前端通过符号链接访问，URL 格式为 `/materials/videos/xxx.mp4`。
- **AI 生成**: AI 生成的配音、图片会自动存放到当前项目的 assets 目录。

---

## 📁 核心项目结构

```
AIcut/
├── AIcut-Studio/            # 前端编辑器工程
│   └── apps/web/           # Next.js + Electron 核心源码
│       └── public/materials/ -> 符号链接到项目素材目录
├── projects/                # 🆕 多项目管理
│   └── demo/               # 示例项目
│       ├── assets/         # 项目素材 (视频/图片/音频)
│       └── snapshot.json   # 项目快照副本
├── ai_workspace/            # AI 通信目录 (实时同步)
│   ├── project-snapshot.json  # 当前活动项目状态
│   └── history/            # 快照历史版本 (自动备份)
├── tools/                   # AI 工具箱 (分类整理)
│   ├── core/               # 核心引擎 (SDK, Daemon)
│   ├── generators/         # 内容生成 (TTS, Grok, Flux)
│   ├── reconcile/          # 素材对齐
│   ├── demos/              # 演示脚本
│   ├── utils/              # 实用工具
│   ├── scrapers/           # 资源爬取
│   ├── recording/          # 录屏工具
│   ├── uploaders/          # 发布工具
│   └── _archive/           # 归档旧脚本
├── exports/                 # 导出的最终视频
└── docs/                    # 项目文档
```

---

## 🎥 进阶功能

- **字幕识别**: 右键点击视频片段，选择“识别字幕”。指令将发送给 `tools/subtitle_generator.py` 使用离线模型识别。
- **TTS 配音**: 右键点击文本片段，选择“生成语音”。逻辑见 `tools/generate_voiceovers.py`。

---

## 🧠 AI Agent 接入与提示词指南

如果你想让 **ChatGPT / Claude / DeepSeek** 等大模型直接控制 AIcut 进行剪辑，请将以下 **System Prompt** 发送给它：

### 📋 System Prompt (复制以下内容)

```markdown
Role: You are AIcut, an intelligent video editing agent. Your goal is to autonomously edit videos by controlling the AIcut Engine.

**Environment & Constraints:**
1.  **Canvas Resolution**: 1920x1080 (Landscape).
2.  **Coordinate System**: The origin (0,0) is TOP-LEFT. The center of the screen is **(960, 540)**. ALWAYS center visual elements at (960, 540) unless specified otherwise.
3.  **Source of Truth & Action Interface**: The file `ai_workspace/project-snapshot.json` is BOTH the current state and the control interface.
4.  **Action Mechanism**: You execute edits by **modifying and saving `ai_workspace/project-snapshot.json`**. The system watches this file and hot-reloads instantly.

**Workflow:**
1.  **Read**: Load `ai_workspace/project-snapshot.json` using Python's `json` module.
2.  **Think**: Plan changes to `tracks` (adding clips to `elements`) or `assets` (registering new files).
3.  **Act**: Write the modified JSON data back to `ai_workspace/project-snapshot.json`.

**Critical Rules:**
-   **Visuals**: Always set `x: 960, y: 540` for videos/images to center them.
-   **Structure**: Respect the JSON schema. `tracks` contain `elements`. `assets` contain resource metadata.
-   **Atomic**: Read -> Modify -> Write. Ensure your write is atomic if possible (or just write w/ indentation).
```

### 💡 常用指令示例

**1. "帮我把素材库里的所有视频连成一个短片，每段3秒"**
*AI 应该编写 Python 脚本：读取 snapshot -> 遍历 `assets` -> 清空 `tracks` -> 依次生成 `elements` 加入轨道 -> 保存 snapshot。*

**2. "生成一张新图片，并追加到视频末尾"**
*这是一个标准的文件驱动流程：*

```python
import json
import time

SNAPSHOT_PATH = "ai_workspace/project-snapshot.json"

def append_new_asset(new_file_path):
    # 1. Read
    with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
        snapshot = json.load(f)

    assets = snapshot.get("assets", [])
    tracks = snapshot.get("tracks", [])

    # 2. Register Asset
    new_asset_id = f"asset_{int(time.time())}"
    assets.append({
        "id": new_asset_id,
        "name": "New Image",
        "type": "image",
        "url": "/materials/new_image.png", # Web URL (mapped from symlink)
        "filePath": new_file_path,         # Absolute Local Path for Electron/Server
        "duration": 5
    })

    # 3. Find Main Track
    main_track = next((t for t in tracks if t.get("isMain")), None)
    
    # 4. Calculate End Time
    last_end = 0
    if main_track["elements"]:
        last = main_track["elements"][-1]
        last_end = last["startTime"] + last["duration"]

    # 5. Append Element
    main_track["elements"].append({
        "id": f"el_{int(time.time())}",
        "type": "media",
        "mediaId": new_asset_id,
        "startTime": last_end,
        "duration": 5,
        "x": 960, "y": 540, # Center it
        "scale": 1, "opacity": 1, "rotation": 0
    })

    # 6. Save (Trigger Hot-Reload)
    with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)
```

---

⭐ **AIcut** 让视频剪辑不再是繁琐的手动劳动。只需修改 Python 脚本，即可规模化复现你的剪辑创意。