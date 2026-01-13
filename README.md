# AIcut - 全自动 AI 视频剪辑引擎

[![Remotion](https://img.shields.io/badge/Engine-Remotion-blue.svg)](https://remotion.dev)
[![Python](https://img.shields.io/badge/Logic-Python-green.svg)](https://python.org)
[![MCP](https://img.shields.io/badge/Protocol-MCP-orange.svg)](https://modelcontextprotocol.io)

<p align="center">
  <img src="docs/promo_banner.png" alt="AIcut Banner" width="100%">
</p>

**AIcut** 是一款 **AI 原生** 的全自动视频制作引擎。只需给 AI 一个想法，它就能自动完成：素材搜索、脚本撰写、配音生成、字幕对齐、视频合成。

> 🎬 **告别手动剪辑，让 AI 成为你的私人剪辑师。**


## ✨ 核心特性

- 🤖 **AI 全自动剪辑**：通过 MCP 协议，AI 可直接操控视频时间轴、素材、特效。
- 🎙️ **智能配音**：支持 Edge TTS (云扬等)、Google Gemini TTS 自动生成旁白。
- 📝 **字幕自动对齐**：配音生成后自动生成精确到毫秒的 SRT 字幕。
- 🎨 **模块化特效**：Fade、Typewriter、Floating 等特效可自由叠加。
- 🚀 **并行渲染**：基于 Remotion 的多核并行导出，速度提升 300%+。
- 📁 **导出工程文件**：生成可编辑的 Remotion 项目或剪映草稿。

---

## 🚀 极速上手

### 1. 安装依赖
需要 Python 3.10+ 和 Node.js 18+。

```bash
# 1. 安装 Python 依赖
pip install -r requirements.txt

# 2. 安装渲染引擎依赖
cd remotion-studio
npm install
```

### 2. 启动预览
```bash
npm start
```
*浏览器自动打开 `http://localhost:3000`，即可看到生成的演示视频。*

> **提示**：如需使用自动下载素材功能，请参考下方的进阶配置。

---

## 🤖 如何让 AI 来剪辑视频？

AIcut 的核心设计理念是 **让 AI 能够直接操控视频制作流程**。以下是与 AI 协作的典型工作流：

### 方式一：通过 AI 对话直接剪辑 (推荐)

1. **准备 AntigravityIDE**：
   - 下载并安装 [AntigravityIDE](https://antigravity.dev)（AI 原生开发环境）
   - 登录你的账号

2. **让 AI 克隆项目**：
   ```
   "帮我克隆 https://github.com/luoluoluo22/AIcut 这个项目"
   ```

3. **让 AI 阅读项目**：
   ```
   "阅读一下这个项目的结构和文档，了解它是怎么工作的"
   ```

4. **告诉 AI 你的需求**：
   ```
   "帮我做一个关于'未来城市'的 30 秒宣传片，要有配音和字幕"
   ```

5. **AI 自动执行**：
   - 🔍 搜索并下载 Pexels/Pixabay 的免费商用素材
   - ✍️ 撰写脚本文案
   - 🎙️ 生成 TTS 配音（Edge TTS 云扬）
   - 📝 对齐字幕时间轴
   - 🎬 组装 JSON 配置并渲染预览

6. **预览和微调**：在 Remotion Studio 中预览，AI 可根据你的反馈继续调整。


### 方式二：手动调用工具脚本

如果你想更精细地控制流程，可以使用 `tools/` 目录下的脚本：

| 脚本                              | 功能                               |
| --------------------------------- | ---------------------------------- |
| `generate_voiceovers_segments.py` | 根据文案生成分段配音 (Edge TTS)    |
| `update_project_json.py`          | 将配音/字幕信息更新到项目 JSON     |
| `update_video_track.py`           | 更新视频轨道的素材编排             |
| `free_stock_api.py`               | 从 Pexels/Pixabay API 下载免费素材 |
| `mixkit_music_scraper.py`         | 爬取 Mixkit 免费背景音乐           |

**示例：生成配音并更新项目**
```bash
cd tools
python generate_voiceovers_segments.py  # 生成配音
python update_project_json.py           # 更新 JSON
```

---

## 📁 项目结构

```
AIcut/
├── remotion-studio/          # Remotion 渲染引擎
│   ├── src/
│   │   ├── Composition.tsx   # 核心渲染组件
│   │   ├── EffectsLibrary.tsx # 特效库
│   │   └── projects/         # 项目 JSON 定义
│   └── public/assets/        # 素材存放目录
├── tools/                    # Python 工具脚本
│   ├── generate_voiceovers_segments.py
│   ├── update_project_json.py
│   ├── free_stock_api.py
│   └── ...
├── docs/                     # 文档
│   └── PROMO_SCRIPT_小白版.md # 宣传片脚本
└── .agent/workflows/         # AI 工作流定义
```

### 素材管理规范
- 所有素材存放在 `remotion-studio/public/assets/projects/[project_name]/` 下
- 在项目 JSON 中，`path` 字段以 `/assets/projects/` 开头
- 示例：`"/assets/projects/demo/videos/beach_waves.mp4"`

---

## 🎥 渲染导出

```bash
cd remotion-studio

# 导出为 MP4 (1080p, 30fps)
npx remotion render src/index.tsx demo out/demo.mp4 --codec=h264
```

---

## ⚙️ 进阶配置

### 配置 API Key (可选)
如果需要使用 `free_stock_api.py` 自动下载 Pexels/Pixabay 素材：

1. 复制 `.env.example` 为 `.env`：
   ```bash
   # Windows PowerShell
   copy .env.example .env
   ```
2. 编辑 `.env` 文件，填入你的 Pexels/Pixabay API Key。

---

## 📜 License

MIT License - 开源免费，欢迎贡献！

---

⭐ **AIcut**：从想法到成片，只需一句话。让 AI 成为你的全自动剪辑师。