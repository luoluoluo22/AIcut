---
description: 自动发布视频到 YouTube Studio
---

# YouTube 视频发布工作流

此工作流用于将本地生成的视频文件自动上传并发布到 YouTube Studio。

## 前置要求
1. 确保浏览器已登录 YouTube Studio (https://studio.youtube.com/)。
2. 确保视频已渲染完成（`out/promo_video.mp4`）。
3. 准备好封面图片（可选，需脚本支持）。

## 步骤说明

### 1. 访问与上传入口
- 打开 URL: `https://studio.youtube.com/`
- **点击上传**：
    - 优先查找 `aria-label="上传视频"` 的按钮。
    - 或点击 "创建" (`ytcp-button-shape`) -> "上传视频" (`ytcp-text-menu-item`)。
    - 脚本示例：
      ```javascript
      const btn = document.querySelector('[aria-label="上传视频"]');
      if (btn) btn.click();
      ```

### 2. 视频上传
// turbo
- 查找 `input[type="file"]` (通常在 Dialog 中)。
- 使用 `upload_file` 上传 `promo_video.mp4`。

### 3. 填写元数据 (详情页)
- **标题**：
    - 查找 `#textbox` (通常第一个是标题)。
    - 设置 `innerText` 并触发 `input` 事件。
- **描述**：
    - 查找 `#textbox` (通常第二个是描述)。
    - 设置 `innerText` 并触发 `input` 事件。
- **儿童内容设置**：
    - 必须选择 "是否面向儿童"。
    - 脚本查找：`tp-yt-paper-radio-button` (name="VIDEO_MADE_FOR_KIDS_MFK" 或根据文本匹配 "内容不是面向儿童的")。
    - 执行 `.click()`。

### 4. 封面上传 (可选)
- 查找 `input[type="file"]` (accepts image)。
- *注意*：YouTube 的 input 可能隐藏或 ID 动态。
- 技巧：使用 JS 将其强制显示 (`display: block`, `z-index: 9999`)，然后使用 `upload_file`。

### 5. 流程推进
- **点击下一步**：
    - 查找 ID 为 `next-button` 的元素。
    - 点击多次 (通常 3 次) 直到到达 "可见性" (Visibility) 步骤。
    - 每次点击后需等待 1-2 秒。

### 6. 发布设置
- **设置公开**：
    - 查找 `tp-yt-paper-radio-button` with name `PUBLIC` 或文本 "公开"。
    - 执行 `.click()`。
- **最终发布**：
    - 查找 ID 为 `done-button` 的元素 (发布)。
    - 执行 `.click()`。

## 关键代码片段 (Details Page)

```javascript
// 填写标题和描述
const textboxes = document.querySelectorAll('#textbox');
if (textboxes.length >= 2) {
    textboxes[0].innerText = "你的标题";
    textboxes[0].dispatchEvent(new Event('input', { bubbles: true }));
    
    textboxes[1].innerText = "你的描述";
    textboxes[1].dispatchEvent(new Event('input', { bubbles: true }));
}

// 选择"不是面向儿童"
const notForKids = document.querySelector('[name="VIDEO_MADE_FOR_KIDS_MFK"][value="VIDEO_MADE_FOR_KIDS_NOT_MFK"]');
if (notForKids) notForKids.click();

// 下一步
document.getElementById('next-button')?.click();

// 发布
document.getElementById('done-button')?.click();
```
