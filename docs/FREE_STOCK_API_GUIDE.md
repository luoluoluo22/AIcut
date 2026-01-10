# 免费素材 API 工具使用指南

## 概述

我们已经封装了 Pexels 和 Pixabay 的 API,可以通过编程方式快速获取免费商用视频素材,无需手动浏览网页。

## 工具位置

```
f:\桌面\开发\AIcut\tools\free_stock_api.py
```

## 快速开始

### 1. 获取 API Key (免费)

#### Pixabay (推荐,无需审核)
1. 访问: https://pixabay.com/api/docs/
2. 点击 "Get API Key"
3. 注册账号(使用 GitHub 或 Google 登录更快)
4. 复制你的 API Key

#### Pexels (需要简单审核)
1. 访问: https://www.pexels.com/api/
2. 注册账号
3. 填写简单的申请表(说明用途:个人项目/学习)
4. 通常几分钟内就会收到 API Key

### 2. 配置 API Key

编辑 `tools/free_stock_api.py`:

```python
# Pixabay
pixabay = PixabayAPI(api_key="YOUR_PIXABAY_KEY_HERE")

# Pexels
pexels = PexelsAPI(api_key="YOUR_PEXELS_KEY_HERE")
```

### 3. 批量下载素材

```bash
cd f:\桌面\开发\AIcut
python tools/free_stock_api.py
```

## API 使用示例

### 搜索并下载单个视频

```python
from tools.free_stock_api import PixabayAPI, download_video
from pathlib import Path

# 初始化
pixabay = PixabayAPI(api_key="YOUR_KEY")

# 搜索
videos = pixabay.search_videos("stressed office worker", per_page=5)

# 下载第一个结果
if videos:
    video = videos[0]
    print(f"标题: {video['tags']}")
    print(f"时长: {video['duration']}秒")
    
    url = pixabay.get_best_quality_url(video)
    output_path = Path("downloads/office_stress.mp4")
    download_video(url, output_path)
```

### 批量下载多个关键词

```python
from tools.free_stock_api import batch_download_from_pixabay
from pathlib import Path

keywords = [
    "video editing timeline",
    "stressed programmer",
    "beach sunset",
    "bamboo forest"
]

output_dir = Path("remotion-studio/public/assets/materials/stock")
batch_download_from_pixabay(keywords, output_dir, videos_per_keyword=2)
```

### 使用 Pexels API

```python
from tools.free_stock_api import PexelsAPI, download_video
from pathlib import Path

pexels = PexelsAPI(api_key="YOUR_PEXELS_KEY")

# 搜索横向视频
videos = pexels.search_videos(
    "summer beach",
    per_page=10,
    orientation="landscape"  # 只要横向视频
)

for video in videos[:3]:
    url = pexels.get_best_quality_url(video, min_width=1920)  # 至少 1080p
    if url:
        filename = f"beach_{video['id']}.mp4"
        download_video(url, Path(f"downloads/{filename}"))
```

## API 参数说明

### Pixabay.search_videos()

| 参数     | 类型 | 说明              | 默认值 |
| -------- | ---- | ----------------- | ------ |
| query    | str  | 搜索关键词(英文)  | 必填   |
| per_page | int  | 每页结果数(3-200) | 20     |
| page     | int  | 页码              | 1      |

### Pexels.search_videos()

| 参数        | 类型 | 说明                                    | 默认值 |
| ----------- | ---- | --------------------------------------- | ------ |
| query       | str  | 搜索关键词(英文)                        | 必填   |
| per_page    | int  | 每页结果数(1-80)                        | 15     |
| page        | int  | 页码                                    | 1      |
| orientation | str  | 方向: "landscape", "portrait", "square" | None   |

## 推荐搜索关键词

### 痛点场景
- `stressed office worker`
- `frustrated programmer`
- `video editing timeline`
- `complex software interface`
- `burnout computer work`

### 自然/旅行场景
- `summer beach waves`
- `woman running beach`
- `tropical vacation`
- `sunset ocean`
- `bamboo forest zen`

### 科技/AI 场景
- `futuristic technology`
- `data visualization`
- `artificial intelligence`
- `coding programming`
- `digital transformation`

## 速率限制

### Pixabay
- 免费账号: 5000 次/小时
- 足够个人项目使用

### Pexels
- 免费账号: 200 次/小时
- 建议缓存搜索结果

## 版权说明

通过 API 下载的所有素材均为:
- ✅ CC0 协议 (Pixabay) 或 Pexels License
- ✅ 可商业使用
- ✅ 无需署名
- ✅ 可修改和重新分发

## 故障排除

### API Key 无效
```
❌ 400 Client Error: Bad Request
```
**解决**: 检查 API Key 是否正确复制,是否有多余的空格

### 速率限制
```
❌ 429 Too Many Requests
```
**解决**: 等待一段时间,或使用另一个平台的 API

### 网络超时
```
❌ Timeout
```
**解决**: 检查网络连接,或增加 timeout 参数

## 与浏览器方式对比

| 特性     | API 方式 | 浏览器方式   |
| -------- | -------- | ------------ |
| 速度     | ⚡ 极快   | 🐌 较慢       |
| 批量下载 | ✅ 简单   | ❌ 复杂       |
| 自动化   | ✅ 容易   | ⚠️ 困难       |
| 预览效果 | ❌ 不能   | ✅ 可以       |
| 稳定性   | ✅ 高     | ⚠️ 受验证影响 |

## 建议

1. **优先使用 API 方式**进行批量下载
2. **浏览器方式**仅用于预览和挑选特定素材
3. **缓存搜索结果**避免重复调用 API
4. **使用有意义的文件名**方便后续管理

---

最后更新: 2026-01-10
