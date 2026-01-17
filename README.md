# AIcut - 全自动 AI 视频剪辑引擎

AIcut 是一款 **AI 原生** 的自动化视频制作工具。它将**专业时间轴（Timeline）**与 **Python AI 逻辑** 深度结合，通过双向实时同步实现“所写即所得”的自动化剪辑体验。

---

## 🚀 快速启动

### 1. 环境要求
- **Node.js**: 18.0+
- **Python**: 3.10+
- **推荐工具**: [pnpm](https://pnpm.io/) (前端), [uv](https://github.com/astral-sh/uv) (Python)

### 2. 一键配置 (Windows)
在根目录下运行安装脚本，自动处理依赖、虚拟环境及素材映射：
```powershell
./setup.ps1
```

### 3. 启动项目
只需执行以下指令：
```bash
cd AIcut-Studio
pnpm run app
```
> **💡 说明**: 该指令会同时启动 Next.js 前端和 Electron 壳。Electron 启动后会**自动在后台唤起 Python AI 后端**，无需手动干预。

---

## 🧠 核心架构：文件驱动同步

AIcut 采用 **UI 渲染与逻辑控制解耦** 的设计，所有状态存储于 `project-snapshot.json`：

1. **读取状态**: AI 脚本通过 Python 加载 `ai_workspace/project-snapshot.json`。
2. **计算修改**: AI 根据逻辑（如“自动配图”、“生成字幕”）计算新的 `tracks` 结构。
3. **指令写入**: AI 直接修改并保存该 JSON 文件。
4. **实时预览**: 编辑器监听文件变化，通过 SSE 实现 UI 的“热重载”。

---

## 📁 关键目录说明

```text
AIcut/
├── AIcut-Studio/          # 前端编辑器 (Next.js + Electron + Remotion)
├── projects/              # 项目资产库 (多项目管理)
│   └── demo/
│       ├── assets/        # 视频/图片/音频原件
│       └── snapshot.json  # 项目持久化存档
├── ai_workspace/          # AI 实时同步区
│   └── project-snapshot.json # 核心通信文件 (AI 读写此文件)
├── tools/                 # AI 剪辑脚本工具箱
│   ├── core/              # SDK (AIcutClient) 与守护进程
│   └── demos/             # 自动化剪辑示例脚本
├── exports/               # 导出的最终视频 (MP4)
└── setup.ps1              # 一键环境配置脚本
```

---

## 🤖 AI 开发者指南

### 使用 Python SDK 操作
我们封装了 `AIcutClient` 以简化对时间轴的操作：

```python
from tools.core.aicut_sdk import AIcutClient

client = AIcutClient()

# 示例：快速添加字幕
client.add_multiple_subtitles([
    {"text": "欢迎使用 AIcut 自动化剪辑", "startTime": 0, "duration": 5}
])
```

### 让 LLM 直接控制剪辑
若使用 ChatGPT/Claude 等模型，建议将 `ai_workspace/project-snapshot.json` 作为上下文发送。详见 `docs/SYSTEM_PROMPT.md`。

---

## 🔧 常见问题 (FAQ)

- **预览窗口全黑？** 检查 `projects/` 下的素材路径是否正确，并确认软链接已建立。
- **UI 不更新？** 确保 `ai_daemon.py` 正在运行，它负责在文件修改时通知前端。
- **导出报错？** 导出依赖 Remotion，请确保已安装 `ffmpeg` (setup.ps1 会协助配置)。

---

⭐ **AIcut** 让视频剪辑不再是重复劳动，而是可编程的生产力。