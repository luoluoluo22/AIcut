# AIcut - AI 原生并行视频引擎

[![Remotion](https://img.shields.io/badge/Engine-Remotion-blue.svg)](https://remotion.dev)
[![Python](https://img.shields.io/badge/Logic-Python-green.svg)](https://python.org)
[![MCP](https://img.shields.io/badge/Protocol-MCP-orange.svg)](https://modelcontextprotocol.io)

**AIcut** 是一款从剪映工作流全面转向 **Remotion 二次开发** 的 AI 驱动视频制作引擎。它利用现代 Web 技术（React + Chromium）解决了传统 FFmpeg 自动化剪辑中的视觉抖动、性能瓶颈及开发复杂性，致力于打造一个让 AI 能深度参与、实时反馈的工业级视频生产环境。

## 🎯 为什么转向 Remotion？

在项目初期探索剪映 (JianYing) 自动化时，我们发现封闭生态和传统滤镜存在以下局限，遂决定重构并引入 Remotion 架构：

- 🚀 **AI 深度切入**：利用声明式 React 定义视频，让 AI 通过操控 JSON 即可实现对亚像素级动画、CSS 滤镜的精准控制。
- ✨ **超平滑视觉**：通过浏览器亚像素渲染解决 FFmpeg `zoompan` 的浮点数位移跳变（Jitter）。
- 🚄 **并行导出**：内置并行渲染架构，拆分帧序列多路并发，渲染速度提升 300% 以上。
- 🛠️ **实时预览**：基于 WebSocket 的数据桥接，实现“AI 操作-前端即时反馈”的丝滑体验。

## 🛠️ 项目结构

### 📁 资产管理 (Asset Management)
为了确保预览和渲染的一致性，遵循以下素材规范：
1.  **项目制管理**：所有素材存放在 `remotion-studio/public/assets/projects/[project_name]/` 下。
2.  **路径引用**：在项目 JSON 中，`path` 字段应始终以 `/assets/projects/` 开头。
    *   ✅ 正确：`"/assets/projects/felt_utakata/memory_1.mp4"`
3.  **多项目支持**：项目定义文件存放在 `remotion-studio/src/projects/` 下，系统会自动扫描并加载。

### 核心模块
### 1. 逻辑后端 (Logic Node)
- **MCP Server**: 暴露给 AI 的能力接口，用于解析语义并转化为视频轨道指令。
- **Data Bridge**: 维护核心项目 JSON，连接 AI 指令与预览界面。

### 2. 渲染引擎 (Render Node)
- **Remotion Studio**: 基于 React 开发的高级视觉合成系统。
- **Modular Effects**: 支持 `Fade`, `Typewriter`, `Floating` 等模块化特效插件。

## 📋 功能模块

### 🛤️ 时间轴管理
- **智能轨道分配**: AI 自动计算层级（背景 -> 素材 -> 遮罩 -> 文字）。
- **关键帧注入**: 支持亚像素级的 Scale, Position, Opacity 动画。

### 🎨 视觉增强
- **模块化特效引擎**: 支持在 JSON 中配置 `effects` 数组，实现特效的“洋葱模型”无限叠加。
- **电影级滤镜**: 支持 CSS 滤镜及高级视觉组件的动态加载。

## 📦 快速开始

### 1. 环境准备
确保已安装 `uv` (Python 依赖管理) 和 `npm/pnpm` (Node.js 环境)。

### 2. 启动渲染/预览端 (Remotion)
```bash
cd remotion-studio
npm install
npm start
```

### 3. 创建项目
在 `remotion-studio/src/projects/` 下创建一个新的 `.json` 文件，系统将自动在 Studio 侧边栏中注册该项目。

---

⭐ **AIcut**：重新定义 AI 与屏幕之间的距离。