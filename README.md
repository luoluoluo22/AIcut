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

### 2. 安装与启动
1. **安装 Python 依赖** (根目录):
   ```bash
   pip install -e .
   ```
2. **安装前端依赖** (`AIcut-Studio/apps/web` 目录):
   ```bash
   cd AIcut-Studio/apps/web
   npm install  # 或使用 bun install
   ```
3. **一键启动项目**:
   ```bash
   npm run app
   ```
   此命令将同时启动 **Next.js 服务** 和 **Electron 应用**。

---

## 🤖 如何让 AI 进行剪辑？

AIcut 的设计思路是：**前端负责渲染与呈现，后端 Python 负责思考与控制**。

### AI 剪辑的工作流
1. **获取状态**: AI 脚本通过读取 `.aicut/project-snapshot.json` 获取当前视频的时间轴状态。
2. **生成指令**: AI 根据需求（如“帮我生成旁白”、“自动配图”）生成编辑指令。
3. **同步执行**: AI 修改 `.aicut/pending-edits.json` 或直接通过 `ai_daemon.py` 发送指令。
4. **热重载**: 编辑器感知到变化，实时更新时间轴预览。

### 剪辑时应修改哪个文件？
如果你想自定义 AI 的剪辑逻辑（例如：修改字幕生成方式、调整转场算法），你应该在 **`tools/`** 目录下操作：
- **`tools/ai_daemon.py`**: 核心守护进程，负责 AI 与前端的通信。
- **`tools/create_xiuxian_vlog.py`**: 一个具体的 AI 剪辑示例脚本，演示了如何从 0 到 1 生成一个视频。
- **`tools/aicut_sdk.py`**: 提供给 AI 使用的工具包。

### 素材（Materials）存放在哪里？
为了让 AI 方便管理及编辑器能够正确引用，请遵循以下规范：
- **本地素材**: 存放在项目根目录的 **`materials/`** 文件夹中。
- **系统引用**: 在时间轴 JSON 中，素材应该使用绝对路径或基于根目录的相对路径。AI 生成的配音、处理后的视频片段均会自动存放在该目录下。

---

## 📁 核心项目结构

```
AIcut/
├── AIcut-Studio/            # 前端编辑器工程
│   └── apps/web/           # Next.js + Electron 核心源码
├── tools/                   # AI 逻辑文件夹 (修改剪辑逻辑在此)
│   ├── ai_daemon.py        # AI 通信后端
│   └── ...                 # 各种辅助 AI 脚本
├── materials/               # 素材存放中心 (视频、音频、图片)
├── .aicut/                  # AI 通信临时数据 (缓存项目快照)
└── docs/                    # 项目文档与设计方案
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
3.  **Source of Truth**: The file `.aicut/project-snapshot.json` contains the current state (tracks, assets, project info).
4.  **Action API**: You execute edits by sending HTTP POST requests to `http://localhost:3000/api/ai-edit`.

**Available Capabilities (API Actions):**
-   **`setFullState`**: Completely overwrite the timeline tracks. (Preferred for complex edits).
    -   Payload: `{ "action": "setFullState", "data": { "tracks": [...] } }`
-   **`addSubtitle`**: Add a single subtitle.
    -   Payload: `{ "action": "addSubtitle", "data": { "text": "Hello", "startTime": 0, "duration": 3 } }`
-   **`importAudio`**: Import a local audio file.
    -   Payload: `{ "action": "importAudio", "data": { "filePath": "...", "startTime": 0 } }`

**Workflow:**
1.  **Read**: Analyze `.aicut/project-snapshot.json` to see available assets (images/videos/audio in `assets` list).
2.  **Think**: Plan a timeline structure (Intro -> Main Content -> Outro).
3.  **Act**: Generate a Python script (using `requests` lib) to construct the JSON structure and POST it to the API.

**Critical Rules:**
-   **Visuals**: Always set `x: 960, y: 540` for videos/images to center them.
-   **Audio**: Background music usually goes to a separate track with lower volume (e.g., 0.2).
-   **Assets**: You can ONLY use assets that already exist in the `snapshot.assets` list. Do not hallucinate file paths.
```

### 💡 常用指令示例

**1. "帮我把素材库里的所有视频连成一个短片，每段3秒，加个背景音乐"**
*AI 应该生成类似 `tools/create_demo_timeline.py` 的脚本，遍历 `assets`，计算 `startTime`，并发送 `setFullState` 请求。*

**2. "给当前视频前5秒加上标题‘AIcut Demo’"**
*AI 应该发送 `addSubtitle` 请求或通过 `setFullState` 添加一个 Text Track。*

---

⭐ **AIcut** 让视频剪辑不再是繁琐的手动劳动。只需修改 Python 脚本，即可规模化复现你的剪辑创意。