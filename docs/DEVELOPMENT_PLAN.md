# Antigravity Studio 开发路线图 (Phase 2 & 3)

## 阶段目标
将 Antigravity Studio 打造为国内首个深度集成 AI Agent 的 **Remotion 工业级视频渲染引擎**，实现从“AI 写脚本”到“AI 像素级控制”的闭环。

---

### Phase 2: 核心引擎增强 (Core Engine Hardening)

#### 1. 动态数据桥接器 (The Intelligent Data Bridge)
- [ ] **Schema 2.0**: 完善 `project_data.json` 协议，支持贝塞尔曲线关键帧定义。
- [ ] **实时 Prop 注入**: Python 端通过 HTTP/WebSocket 直接向 Remotion 预览器注入 `inputProps`，无需频繁读写文件。

#### 2. AI 视觉组件库 (AI-Native Components)
- [ ] **高级转场系统**: 基于 Framer Motion 实现 AI 可读的转场原语（如 `ZoomBlur`, `SlideReveal`）。
- [ ] **CSS 特效引擎**: 封装一套 AI 友好的滤镜 API，让 Agent 能说出“让画面变暗并带点蓝色调”即可自动修改 CSS Filter。

#### 3. 音频智能对齐 (Vocal-Sync)
- [ ] **VAD 与波形分析**: 引入浏览器的 Web Audio API 或后端 Python 分析，实现字幕与音频脉冲的绝对同步。
- [ ] **多轨动态混音**: AI 根据语调自动调节背景音乐音量（自动鸭声/Ducking）。

---

### Phase 3: AI 协同生态 (AI Collaborative Workflow)

#### 1. 语义化剪辑 (Semantic Editing)
- [ ] **节奏感感知 (Beat Detection)**：AI 自动识别 BGM 鼓点并自动切素材。
- [ ] **视觉内容理解**：集成多模态视觉模型，让 AI 根据视频内容自动配文案。

#### 2. 生产力工具化 (Professional Tooling)
- [ ] **零磁盘渲染 (Memory Pipeline)**：优化渲染流程，通过内存直接输出帧，彻底消除磁盘写入开销，提升 200% 导出效率。
- [ ] **局域网并行渲染 (Distributed Render)**：支持多机协同，将 10 分钟视频的渲染压缩至秒级。

---

### 长期愿景
**Antigravity Studio** 不仅仅是一个渲染器，它是 AI 在视频创作领域的“手”和“眼”。
