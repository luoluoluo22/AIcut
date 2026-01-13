---
description: 自动发布视频稿件到抖音创作者中心
---

# 抖音视频发布工作流

此工作流用于将本地生成的视频文件自动上传并发布到抖音创作者中心。

## 前置要求
1. 确保浏览器已登录抖音创作者中心 (扫码登录)。
2. 确保视频已渲染完成（`out/promo_video.mp4`）。
3. 准备好封面图片（`promo_banner.png`）。

## 步骤说明

### 1. 访问与登录检查
- 打开 URL: `https://creator.douyin.com/creator-micro/content/upload`
- **检查登录**：
    - 如果页面包含 "扫码登录" 或二维码，提示用户扫码。
    - 等待 URL 变更为 `/content/upload` 且页面无二维码元素。

### 2. 视频上传
// turbo
- 使用 `evaluate_script` 查找 accepts 包含 "video" 的 `input[type="file"]`。
- 如果找不到显式的 input，尝试搜索所有 file input 并通过 `accept` 属性筛选。
- 使用 `upload_file` 上传视频文件。
- *注意*：上传后页面会刷新或跳转到编辑页，需等待几秒。

### 3.封面设置 (关键难点)
抖音的封面上传 input 是隐藏的，且位于模态框中。

1. **触发模态框**：点击页面上的 "选择封面" 或 "设置封面" 按钮。
2. **定位 Input**：
    - 模态框打开后，DOM 中会出现新的 `input[type="file"]` (accepts image)。
    - **技巧**：使用 JavaScript 强制将该 input 的 `display` 设为 `block`，`visibility` 设为 `visible`，并移动到 `z-index` 最顶层，确保 `upload_file` 能交互。
3. **上传图片**：使用 `upload_file` 上传封面图。
4. **确认上传**：点击模态框底部的 "完成" 按钮。

### 4. 填写元数据
- **标题**：
    - 定位 `placeholder` 包含 "标题" 的 `input`。
    - 填写内容并触发 `input`, `change`, `blur` 事件。
    - *React Trick*：如果普通赋值无效，可能需要 hack React 的 `_valueTracker` (见下方脚本)。
- **简介/标签**：
    - 定位 `contenteditable="true"` 的编辑器 (通常是 `.zone-container` 或 `.editor-kit-container` 内)。
    - 设置 `innerText` 包含简介和标签 (如 `#AI`)。
    - 触发 `input` 事件。

### 5. 发布
- 滚动页面到底部。
- 点击 "发布" 按钮。

## 常用稳健脚本片段

### 强制显示隐藏的封面 Input
```javascript
const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
// 找到接受图片的 input (通常是模态框里那个)
const imgInput = inputs.find(i => i.accept && i.accept.includes('image'));

if (imgInput) {
    imgInput.style.display = 'block';
    imgInput.style.visibility = 'visible';
    imgInput.style.position = 'fixed';
    imgInput.style.top = '10px';
    imgInput.style.left = '10px';
    imgInput.style.zIndex = '999999';
    imgInput.style.width = '100px';
    imgInput.style.height = '100px';
    
    // 确保有 ID 供 mcp 使用
    if (!imgInput.id) imgInput.id = 'cover_upload_hack_' + Date.now();
    return { found: true, id: imgInput.id };
}
```

### React Input 赋值 Hack
```javascript
const input = document.querySelector('input[placeholder*="标题"]');
if (input) {
    // 设置值
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeInputValueSetter.call(input, "你的标题");
    
    // 触发事件
    input.dispatchEvent(new Event('input', { bubbles: true }));
}
```
