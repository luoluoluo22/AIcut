# AIcut 项目目录结构说明

## 核心目录结构 (Electron 架构)

```text
AIcut/
├── AIcut-Studio/              # Electron 桌面应用
│   └── apps/
│       └── web/               # Next.js 前端应用
│           ├── src/           # 源代码 (React + Remotion)
│           └── public/        # 运行时静态文件
│               └── materials/ # 生成的 AI 素材 (图片/视频)
│
├── tools/                     # Python 自动化工具链
│   ├── grok_adapter.py        # Grok 视频生成核心适配器
│   ├── flux_api.py            # Flux 图片生成 API
│   ├── subtitle_generator.py  # 字幕与语音生成
│   └── ai_daemon.py           # 异步任务守护进程
│
├── docs/                      # 项目文档与演示素材
├── exports/                   # 最终导出的视频文件
├── chrome_debug_profile/      # 自动化的 Chrome 用户配置
└── .aicut/                    # 项目持久化备份与快照
```

## 设计决策

### 1. 深度集成 Electron
项目已完全从独立的 `remotion-studio` 迁移至 `AIcut-Studio`。Remotion 现在作为桌面应用内部的组件运行，利用 Electron 的本地能力驱动 Python 工具链。

### 2. 自动化工具链 (Tools)
所有的 AI 生成能力（Grok, Flux）都通过 Python 脚本实现。前端通过 Node.js 的 `child_process` 调用这些工具，从而绕过复杂的浏览器证书和网络代理问题。

### 3. 数据持久化
项目快照存储在 `.aicut/project-snapshot.json` 中，通过 `tools/ai_daemon.py` 与前端实时同步。

## 路径引用规范

### 素材路径
生成的所有 AI 素材存放于：
`AIcut-Studio/apps/web/public/materials/ai-generated/`

在代码中应始终使用相对于 `public` 的路径进行引用（例如 `/materials/ai-generated/xxx.mp4`）。

### 自动清理
为了确保仓库不因二进制文件过载，`.gitignore` 已配置为忽略 `materials/` 和 `temp/` 目录。生产素材应通过正式导出的流程存放到 `exports/`。

---

**最后更新**: 2026-01-15
**状态**: ✅ 已全面转向 Electron 架构
