# AIcut Studio (Frontend Codebase)

这是 **AIcut** 的前端工程源码目录（Next.js + Electron）。

> 🛑 **重要提示**：
> 
> 请 **不要** 直接根据本目录下的说明进行安装或启动。
> 本项目作为 AIcut 的一部分，依赖根目录的 Python 环境和相关配置。
>
> 👉 **请务必查看项目根目录下的 [README.md](../../README.md) 获取完整的安装与启动指南。**

---

## 🛠️ 技术栈速览

- **Core**: Next.js (App Router), Electron, Remotion
- **Stage**: Zustand (State Management)
- **UI**: Tailwind CSS, shadcn/ui
- **Comms**: Server-Sent Events (SSE) with Python Daemon

## � 关键路径

- `apps/web/src`：前端核心源码
- `apps/web/electron`：Electron 主进程代码
