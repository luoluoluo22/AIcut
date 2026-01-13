---
description: 自动发布视频稿件到 Bilibili 创作中心
---

# Bilibili 视频发布工作流

此工作流用于将本地生成的视频文件自动上传并发布到 Bilibili。

## 前置要求
1. 确保浏览器已登录 Bilibili 账号。
2. 确保视频已渲染完成（通常在 `out/` 目录下）。
3. 准备好封面图片（可选，通过 `upload_file` 上传）。

## 步骤说明

### 1. 访问并初始化上传
- 打开 URL: `https://member.bilibili.com/platform/upload/video/frame`
- 等待页面加载完成。
- 如果页面加载了旧草稿，可直接使用；如果需要新投，检查是否需要覆盖。

### 2. 主视频上传
// turbo
- 使用 `upload_file` 工具，将 `uid` 指向页面上的第一个 `input[type="file"]`。
- 文件路径必须是绝对路径。

### 3. 填写基本信息

#### 标题 & 简介
- **标题**：定位 `input.input-val[placeholder*="标题"]` 并填入，记得触发 `input` 事件。
- **简介**：B 站简介通常是 `contenteditable="true"` 的 `div` 或 `textarea`。使用 `evaluate_script` 查找含 "简介" 上下文的输入框，设置 `innerText` 并派发 `input` 事件。

#### 封面上传 (关键难点)
- B 站封面上传的 input 往往隐藏较深。
- **策略**：
    1. 点击“封面设置”打开模态框。
    2. 使用脚本查找所有 `input[type="file"]`，筛选 `accept` 包含 "image" 的 input。
    3. 选中该 input 的 UID 进行上传。
    4. 上传后，如果需要确认，点击“完成”或“同步改动”。

#### 分区选择
- 分区选择器很难通过 CSS 类名稳定定位。
- **策略**：
    1. 使用 `evaluate_script` 查找文本内容为目标分区（如 "知识"）的元素并点击。
    2. 等待下拉出现。
    3. 再查找子分区文本（如 "人工智能"）并点击。
    4. 兜底方案：如果找不到特定文本，尝试点击页面上可见的第一个 `.bcc-select` 类元素触发下拉。

#### 标签输入
- 定位 `input.input-val[placeholder*="标签"]`。
- 模拟输入：设置 `value` -> 触发 `input` 事件。
- 模拟回车：连续触发 `keydown`, `keypress`, `keyup` (key='Enter', keyCode=13) 来生成标签。

### 4. 提交投稿
- 滚动页面到底部。
- 使用文本匹配查找“立即投稿”按钮（避免依赖动态 class）。
- 点击后等待跳转或“稿件投递成功”的提示。

## 常用稳健脚本片段

### 查找并点击特定文本元素
```javascript
const textToClick = "立即投稿"; // 或 "知识", "完成"
const el = Array.from(document.querySelectorAll('div, span, button')).find(el => 
  el.innerText && el.innerText.trim() === textToClick && el.offsetWidth > 0
);
if (el) el.click();
```

### 稳定的封面 Input 查找
```javascript
// 在 evaluate_script 中运行，返回找到的 input ID 供 upload_file 使用
const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
// B站封面 input 通常接受 image/*
const imgInput = inputs.find(i => i.accept && i.accept.includes('image'));
if (imgInput) {
  // 确保它有 ID，如果没有则赋予一个
  if (!imgInput.id) imgInput.id = 'cover_upload_input_' + Date.now();
  return { id: imgInput.id, found: true };
}
```

### 模拟回车添加标签
```javascript
const input = document.querySelector('input.input-val[placeholder*="标签"]');
if (input) {
  const tags = ["标签1", "标签2"];
  tags.forEach(tag => {
    input.value = tag;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // 模拟回车
    ['keydown', 'keypress', 'keyup'].forEach(type => {
        input.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', keyCode: 13, bubbles: true }));
    });
  });
}
```
