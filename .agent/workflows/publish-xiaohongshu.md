---
description: 自动发布视频笔记到小红书创作服务平台
---

# 小红书视频发布工作流

此工作流用于将本地生成的视频文件自动上传并发布到小红书创作服务平台。

## 前置要求
1. 确保浏览器已登录小红书创作服务平台 (扫码登录)。
2. 确保视频已渲染完成（`out/promo_video.mp4`）。
3. 准备好封面图片（`promo_banner.png`）。

## 步骤说明

### 1. 访问与登录检查
- 打开 URL: `https://creator.xiaohongshu.com/publish/publish`
- **检查登录**：
    - 页面如跳转至 `/login`，则提示用户登录。
    - 成功登录标志：URL 包含 `/publish` 且无登录框。

### 2. 视频上传
// turbo
- 查找 accepts 包含 "video" 或 "mp4" 的 `input[type="file"]`。
- 使用 `upload_file` 上传视频。
- *注意*：等待上传进度条完成或预览界面出现。

### 3.封面设置 (特殊交互)
小红书的封面设置通常在视频上传后的界面中。

1. **触发设置**：点击 "设置封面" 、 "编辑封面" 或 "选择封面" 按钮。
2. **Handle Input**：
    - 与抖音类似，新的 `input[type="file"]` (image) 会动态挂载。
    - **Trick**：
      ```javascript
      const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
      const imgInput = inputs.find(i => !i.accept || i.accept.includes('image'));
      if (imgInput) {
          // 强制显示并固定位置，方便调试和点击
          imgInput.style.display = 'block';
          imgInput.style.visibility = 'visible';
          imgInput.style.position = 'fixed';
          imgInput.style.zIndex = '999999';
          // ...
          return { found: true, id: imgInput.id };
      }
      ```
3. **上传图片**：使用 `upload_file` 上传 `promo_banner.png`。
4. **确认**：上传后可能需要点击模态框中的 "确认" 或 "完成" 按钮。

### 4. 填写元数据
- **标题**：
    - 限制：通常 20 字以内。
    - 脚本查找：`input` with placeholder "标题"。
    - 赋值：`input.value = "..."` + `dispatchEvent('input')`。
    - *Input Hack*：如果使用了 React/Vue 绑定，可能需要 `_valueTracker` hack。
- **正文**：
    - 查找：`#post-textarea` 或 `.c-editor` 或 `[contenteditable="true"]`。
    - 赋值：设置 `innerText` 或 `innerHTML` (包含换行 `<br>`)。
    - 触发：`dispatchEvent('input')`。

### 5. 发布
- 查找按钮：文本为 "发布" 的 `button`。
- 点击并等待跳转或成功提示。

## 关键代码片段 (Value Tracker Hack)

针对 React 受控组件无法通过简单 `value` 赋值触发更新的问题：

```javascript
const input = document.querySelector('input[placeholder*="标题"]');
if (input) {
    const tracker = input._valueTracker;
    if (tracker) {
        tracker.setValue("你的标题内容");
    }
    input.value = "你的标题内容";
    input.dispatchEvent(new Event('input', { bubbles: true }));
}
```
