---
description: 从 Pexels 搜索并下载免费商用视频素材
---

# Pexels 免费视频素材下载工作流

## 背景说明

Pexels (pexels.com) 提供高质量的免费商用视频素材,所有内容均为 CC0 协议,可用于商业用途且无需署名。这是替代付费素材网站(如 VJ师)的最佳选择。

## 工作流程

### 方式一: 使用 API 直接调用 (推荐) ⚡

这是最快速的方式,无需打开浏览器,直接通过 API 获取素材。

#### 步骤:

1. **获取 API Key** (一次性操作):
   - Pixabay: 访问 https://pixabay.com/api/docs/ 注册免费账号
   - Pexels: 访问 https://www.pexels.com/api/ 注册免费账号
   - 两者都提供免费的 API key,无需付费

2. **使用封装好的工具**:
```python
# 使用 tools/free_stock_api.py
python tools/free_stock_api.py
```

3. **自定义下载**:
```python
from tools.free_stock_api import PixabayAPI, download_video
from pathlib import Path

# 初始化 API
pixabay = PixabayAPI(api_key="YOUR_API_KEY")

# 搜索视频
videos = pixabay.search_videos("beach waves", per_page=5)

# 下载第一个视频
if videos:
    url = pixabay.get_best_quality_url(videos[0])
    download_video(url, Path("output/beach.mp4"))
```

**优点**:
- ⚡ 速度快,无需等待页面加载
- 🎯 精确控制搜索参数
- 📦 批量下载方便
- 🔄 易于自动化

### 方式二: 使用浏览器 (备用)

当 API 不可用或需要预览素材时使用。

#### 步骤:

### 1. 确定需要的素材类型

明确需要什么主题的视频,例如:
- "video editing timeline" (视频剪辑时间轴)
- "stressed office worker" (压力大的办公室员工)
- "summer beach waves" (夏日海滩波浪)
- "woman running beach" (女性在海滩奔跑)
- "bamboo forest" (竹林)

### 2. 访问 Pexels 搜索页面

使用 browser_subagent 访问搜索 URL:
```
https://www.pexels.com/search/videos/{关键词}/
```

**注意**: Pexels 可能会出现人机验证(Cloudflare),需要:
- 等待验证页面加载完成
- 如果是自动验证,等待 5-10 秒
- 如果需要手动点击,使用 click_browser_pixel 完成验证

### 3. 浏览搜索结果

在搜索结果页面:
1. 滚动页面查看视频缩略图
2. 选择合适的横向(16:9)高清视频
3. 点击视频缩略图进入详情页

### 4. 获取下载链接

在视频详情页有两种方式获取下载链接:

**方式 A: 通过下载按钮**
1. 找到 "Free Download" 按钮
2. 点击后会显示不同分辨率选项
3. 选择合适的分辨率(建议 1920x1080 或 HD)
4. 获取最终的 .mp4 下载链接

**方式 B: 通过 video 标签**
使用 execute_browser_javascript 提取:
```javascript
(() => {
  const video = document.querySelector('video');
  return video ? video.src : null;
})()
```

### 5. 下载视频文件

使用 PowerShell 的 Invoke-WebRequest 下载:
```powershell
Invoke-WebRequest -Uri "{下载链接}" -OutFile "f:\桌面\开发\AIcut\remotion-studio\public\assets\materials\pexels\{文件名}.mp4"
```

### 6. 更新项目配置

在对应的 JSON 项目文件中更新素材路径:
```json
{
  "path": "/assets/materials/pexels/{文件名}.mp4"
}
```

## 常见问题

### Q: 遇到 Cloudflare 验证怎么办?
A: 
1. 等待 10 秒让自动验证完成
2. 如果仍然卡住,使用 browser_mouse_wheel 滚动页面触发加载
3. 必要时使用 click_browser_pixel 手动点击验证框

### Q: 如何选择合适的视频?
A:
1. 优先选择横向(16:9)视频
2. 查看视频时长,选择 5-15 秒的片段
3. 注意视频质量标签(HD, 4K)
4. 预览视频内容是否符合需求

### Q: 下载速度慢怎么办?
A:
1. Pexels 的 CDN 在国外,可能较慢
2. 可以选择较低分辨率(720p)
3. 或者使用代理加速

## 推荐搜索关键词

### 痛点场景
- "stressed office worker"
- "frustrated programmer"
- "video editing timeline"
- "complex software interface"
- "burnout computer"

### 夏日/旅行场景
- "summer beach waves"
- "woman running beach"
- "tropical vacation"
- "sunset ocean"
- "beach aerial view"

### 自然/禅意场景
- "bamboo forest"
- "zen garden"
- "peaceful nature"
- "water reflection"
- "green leaves wind"

## 示例代码

完整的下载流程示例:

```python
# 1. 使用 browser_subagent 搜索
browser_subagent(
    TaskName="Search Pexels for Beach Video",
    Task="""
    Go to https://www.pexels.com/search/videos/summer%20beach/
    Wait 10 seconds for any verification to complete.
    Find a high-quality horizontal beach video.
    Click on it.
    Get the download URL from the video tag or download button.
    Return: {"url": "..."}
    """,
    RecordingName="pexels_beach_search"
)

# 2. 下载文件
run_command(
    CommandLine='Invoke-WebRequest -Uri "{url}" -OutFile "f:\\桌面\\开发\\AIcut\\remotion-studio\\public\\assets\\materials\\pexels\\beach.mp4"',
    Cwd="f:\\桌面\\开发\\AIcut",
    SafeToAutoRun=True,
    WaitMsBeforeAsync=5000
)
```

## 版权说明

所有从 Pexels 下载的素材均为 CC0 协议:
- ✅ 可用于商业用途
- ✅ 无需署名
- ✅ 可以修改和编辑
- ✅ 可以重新分发

这使得 Pexels 成为制作公开发布视频(如 B站宣传片)的理想素材来源。
