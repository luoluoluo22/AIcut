# AIcut 实时同步与 AI 剪辑协议指南

本指南旨在说明如何利用 AIcut 的 **“上帝视角”** 同步机制，通过外部脚本或 AI 指令直接操控网页端视频编辑器。

---

## 1. 核心文件路径

所有状态同步文件均存放在项目根目录的 `.aicut` 文件夹中：

| 文件名                      | 角色              | 路径 (项目根目录)                | 说明                                                           |
| :-------------------------- | :---------------- | :------------------------------- | :------------------------------------------------------------- |
| **`project-snapshot.json`** | **输出 (Output)** | `./.aicut/project-snapshot.json` | 网页端每隔 3 秒自动上报的当前状态（轨道、素材 ID、文字内容）。 |
| **`sync-input.json`**       | **输入 (Input)**  | `./.aicut/sync-input.json`       | 外部控制文件。修改并保存此文件，网页端会瞬间自动刷新重绘。     |

> **提示**：在 Python 中，你可以通过 `os.path.join(os.getcwd(), '.aicut', 'sync-input.json')` 获取路径。

---

## 2. AI 剪辑指令协议 (JSON Schema)

### 2.1 全量重写时间轴 (`setFullState`)
这是最强大的指令，可以直接覆盖网页端的所有轨道。

```json
{
  "action": "setFullState",
  "tracks": [
    {
      "id": "track_1",
      "name": "视频轨",
      "type": "media",
      "elements": [
        {
          "id": "clip_1",
          "type": "media",
          "mediaId": "从 snapshot 中获取的 UUID",
          "startTime": 0,
          "duration": 5,
          "trimStart": 0,
          "trimEnd": 0
        }
      ]
    },
    {
      "id": "track_2",
      "name": "字幕轨",
      "type": "text",
      "elements": [
        {
          "id": "text_1",
          "type": "text",
          "content": "你好 AIcut",
          "startTime": 1,
          "duration": 3,
          "x": 960,
          "y": 800,
          "fontSize": 60,
          "color": "#FFFFFF"
        }
      ]
    }
  ]
}
```

---

## 3. 给 AI 的 Prompt 提示词模板

当你需要让 AI 模型（如 Claude, GPT, Antigravity）帮你生成剪辑指令时，请复制以下提示词：

### 场景 A：智能排版（上帝视角）
> **Prompt**: “请读取路径 `%TEMP%\aicut-ai-edits\project-snapshot.json`。
> 1. 分析当前媒体库中已有的素材及其时长。
> 2. 为我生成一个全量 `setFullState` 的 JSON 数据。
> 3. 要求：将素材按照时间顺序排列在视频轨，并为每个素材在正中心生成对应的标题文字，颜色使用金色，字号 80。
> 4. 直接输出 JSON 内容，我会将其保存到 `sync-input.json`。”

### 场景 B：增加后期字幕
> **Prompt**: “参考快照文件，在不改变现有视频结构的情况下，为视频的前 3 秒添加一条字幕，内容为‘精彩即将开始’，位置在屏幕底部（y: 900），并开启半透明黑色背景。”

---

## 4. 如何进行剪辑 (核心字段说明)

- **`mediaId`**: 极其重要。必须从 `project-snapshot.json` 的 `assets` 列表中获取已上传素材的 ID，否则网页端无法显示。
- **坐标系统**: 
  - 画布中心通常是 `(960, 540)`。
  - 坐标原点 `(0, 0)` 在左上角。
- **时间单位**: 统一使用 **秒 (Seconds)**，支持小数。
- **轨道类型 (`type`)**: 
  - `media`: 视频、图片、音频。
  - `text`: 文字元素、字幕。

---

## 5. 极速开发流程建议

1. **手动操作**：在网页端上传素材、初步摆放。
2. **读取快照**：让脚本或 AI 读取 `project-snapshot.json` 拿到 `mediaId` 和基础结构。
3. **计算逻辑**：在外部进行复杂的计算（如根据音频对齐字幕、自动缩放坐标）。
4. **即时回写**：将结果写入 `sync-input.json`。
5. **实时预览**：观察网页端，效果不满意可反复微调 JSON，保存即生效。
