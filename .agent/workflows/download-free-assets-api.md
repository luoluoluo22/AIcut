---
description: 使用 API 快速下载免费商用视频和音乐素材
---

# 免费素材 API 下载工作流

本工作流包含:
- **视频素材**: 通过 Pixabay/Pexels API 下载
- **音乐素材**: 通过 Mixkit 爬虫下载

## 📁 项目目录结构

**重要**: AIcut 采用项目制组织素材,配置与素材分离。

```
remotion-studio/
├── src/
│   └── projects/
│       ├── promo_video.json       # 项目配置
│       └── summer_seaside.json    # 项目配置
│
└── public/
    └── assets/
        └── projects/
            ├── promo_video/       # 项目素材
            │   ├── videos/
            │   ├── music/
            │   ├── audio/
            │   └── images/
            └── summer_seaside/
                └── ...
```

**优势**:
- ✅ 配置文件轻量,便于版本控制
- ✅ 素材在 `public/`,可直接通过 HTTP 访问
- ✅ JSON 配置使用绝对路径 `/assets/projects/promo_video/videos/xxx.mp4`
- ✅ 符合 Remotion 规范,大文件不会被打包

详细说明: `docs/PROJECT_ASSETS_STRUCTURE.md`

## 前置准备 (一次性)

### 1. 获取 API Keys

#### Pixabay (推荐,无需审核)
1. 访问: https://pixabay.com/api/docs/
2. 登录账号
3. API Key 会自动显示在页面上
4. 复制 Key 到 `.env` 文件

#### Pexels (需要简单申请)
1. 访问: https://www.pexels.com/api/
2. 登录并申请 API Key
3. 填写简单的使用说明
4. 通常几分钟内批准
5. 复制 Key 到 `.env` 文件

### 2. 配置环境变量

编辑项目根目录的 `.env` 文件:
```bash
# Pixabay API Key
PIXABAY_API_KEY=你的pixabay_key

# Pexels API Key
PEXELS_API_KEY=你的pexels_key
```

### 3. 安装依赖

```bash
# 视频 API 依赖
uv pip install python-dotenv requests

# 音乐爬虫依赖
uv pip install beautifulsoup4
```

## 快速使用

### 方式一: 批量下载 (推荐)

直接运行预配置的批量下载脚本:

```bash
python tools/free_stock_api.py
```

这会自动下载以下关键词的视频:
- stressed office worker
- video editing timeline
- beach waves
- running beach
- bamboo forest

下载位置: `remotion-studio/public/assets/materials/stock/`

### 方式二: 自定义下载

#### 使用 Pixabay API

```python
from tools.free_stock_api import PixabayAPI, download_video
from pathlib import Path

# 初始化 (自动从 .env 读取 Key)
pixabay = PixabayAPI()

# 搜索视频
videos = pixabay.search_videos(
    query="sunset beach",  # 搜索关键词
    per_page=5,            # 返回数量 (3-200)
    page=1                 # 页码
)

# 下载第一个视频
if videos:
    video = videos[0]
    print(f"标签: {video['tags']}")
    print(f"时长: {video['duration']}秒")
    
    url = pixabay.get_best_quality_url(video)
    output_path = Path("downloads/sunset.mp4")
    download_video(url, output_path)
```

#### 使用 Pexels API

```python
from tools.free_stock_api import PexelsAPI, download_video
from pathlib import Path

# 初始化
pexels = PexelsAPI()

# 搜索视频 (支持更多筛选)
videos = pexels.search_videos(
    query="ocean waves",
    per_page=10,
    orientation="landscape"  # 横向视频
)

# 下载高质量视频
if videos:
    video = videos[0]
    print(f"分辨率: {video['width']}x{video['height']}")
    
    # 获取至少 1080p 的视频
    url = pexels.get_best_quality_url(video, min_width=1920)
    output_path = Path("downloads/ocean.mp4")
    download_video(url, output_path)
```

## 推荐搜索关键词

### 痛点/压力场景
- `stressed office worker` - 压力办公
- `frustrated programmer` - 抓狂程序员
- `video editing timeline` - 视频剪辑时间轴
- `complex software interface` - 复杂软件界面
- `burnout computer work` - 疲惫工作

### 自然/旅行场景
- `summer beach waves` - 夏日海浪
- `woman running beach` - 海边奔跑
- `tropical vacation` - 热带度假
- `sunset ocean` - 海洋日落
- `bamboo forest zen` - 禅意竹林

### 科技/AI 场景
- `futuristic technology` - 未来科技
- `data visualization` - 数据可视化
- `artificial intelligence` - 人工智能
- `coding programming` - 编程代码
- `digital transformation` - 数字化转型

### 商业/办公场景
- `business meeting` - 商务会议
- `teamwork collaboration` - 团队协作
- `modern office` - 现代办公室
- `startup workspace` - 创业工作空间

## API 限制和建议

### Pixabay
- **速率限制**: 5000 次/小时
- **per_page 范围**: 3-200
- **建议**: 适合批量下载,素材数量多

### Pexels
- **速率限制**: 200 次/小时
- **per_page 范围**: 1-80
- **建议**: 适合精选高质量素材,4K 视频多

### 使用技巧

1. **优先使用 Pixabay**: 速率限制更宽松
2. **Pexels 用于高质量**: 需要 4K 或特定风格时使用
3. **缓存搜索结果**: 避免重复调用 API
4. **合理设置 per_page**: 不要一次请求太多

## 版权说明

所有通过 API 下载的素材:
- ✅ **CC0 协议** (Pixabay) 或 **Pexels License**
- ✅ **可商业使用**
- ✅ **无需署名**
- ✅ **可修改和重新分发**

完全适合用于:
- Bilibili 视频
- YouTube 视频
- 商业广告
- 网站展示

## 故障排除

### API Key 无效
```
❌ 400 Client Error: Bad Request
```
**解决**: 
1. 检查 `.env` 文件中的 Key 是否正确
2. 确保没有多余的空格或引号
3. 重新从官网复制 Key

### 速率限制
```
❌ 429 Too Many Requests
```
**解决**:
1. 等待一段时间 (通常 1 小时后重置)
2. 切换到另一个平台的 API
3. 减少请求频率

### per_page 参数错误
```
❌ [ERROR 400] "per_page" is out of valid range
```
**解决**:
- Pixabay: 确保 per_page 在 3-200 之间
- Pexels: 确保 per_page 在 1-80 之间

## 高级用法

### 批量下载多个关键词

```python
from tools.free_stock_api import batch_download_from_pixabay
from pathlib import Path

keywords = [
    "sunset beach",
    "mountain landscape",
    "city night"
]

output_dir = Path("downloads/nature")
batch_download_from_pixabay(
    keywords, 
    output_dir, 
    videos_per_keyword=2  # 每个关键词下载 2 个
)
```

### 筛选特定分辨率

```python
pexels = PexelsAPI()
videos = pexels.search_videos("ocean", per_page=20)

# 只要 4K 视频
uhd_videos = [v for v in videos if v['width'] >= 3840]

for video in uhd_videos:
    url = pexels.get_best_quality_url(video)
    download_video(url, Path(f"4k_{video['id']}.mp4"))
```

---

## 🎵 音乐素材下载 (Mixkit 爬虫)

### 快速使用

#### 批量下载预定义音乐库

```bash
python tools/mixkit_music_scraper.py
```

这会自动下载:
- **energetic** (高能量): 5 首
- **calm** (平静): 3 首
- **epic** (史诗): 3 首
- **happy** (快乐): 3 首

下载位置: `remotion-studio/public/assets/materials/music/`

#### 自定义下载

```python
from tools.mixkit_music_scraper import MixkitMusicScraper
from pathlib import Path

# 初始化爬虫
scraper = MixkitMusicScraper()

# 获取指定分类的音乐列表
tracks = scraper.get_music_by_mood("energetic")

print(f"找到 {len(tracks)} 首音乐")

# 下载前 3 首
for track in tracks[:3]:
    print(f"标题: {track['title']}")
    print(f"作者: {track['author']}")
    print(f"URL: {track['mp3_url']}")
    
    scraper.download_track(track, Path("downloads/music"))
```

#### 批量下载指定分类

```python
from tools.mixkit_music_scraper import MixkitMusicScraper
from pathlib import Path

scraper = MixkitMusicScraper()

# 下载 10 首 energetic 音乐
output_dir = Path("remotion-studio/public/assets/materials/music/energetic")
scraper.batch_download_by_mood("energetic", output_dir, max_tracks=10)
```

### 支持的音乐分类

| 分类   | 英文名    | 说明            | 推荐用途           |
| ------ | --------- | --------------- | ------------------ |
| 高能量 | energetic | 快节奏,充满活力 | 宣传片、运动视频   |
| 平静   | calm      | 舒缓,放松       | 冥想、自然风景     |
| 史诗   | epic      | 宏大,震撼       | 预告片、大场面     |
| 快乐   | happy     | 欢快,积极       | 生活vlog、儿童内容 |
| 悲伤   | sad       | 忧郁,感伤       | 情感故事           |
| 浪漫   | romantic  | 温馨,浪漫       | 婚礼、情侣视频     |
| 欢快   | upbeat    | 轻快,活泼       | 日常vlog           |
| 黑暗   | dark      | 神秘,紧张       | 悬疑、恐怖         |

### 技术原理

**爬虫工作原理:**
1. 访问 Mixkit 分类页面 (如 `/mood/energetic/`)
2. 解析页面 HTML,提取 `data-algolia-analytics-item-id` 属性
3. 根据 Track ID 构建 MP3 URL: `https://assets.mixkit.co/music/{ID}/{ID}.mp3`
4. 直接下载 MP3 文件

**发现的 API 规律:**
- MP3 直链模式: `https://assets.mixkit.co/music/{track_id}/{track_id}.mp3`
- Track ID 位置: 下载按钮的 `data-algolia-analytics-item-id` 属性
- 无需 API Key,直接访问即可下载
- 所有音乐均为 CC0 协议,完全免费商用

### 音乐库组织建议

```
remotion-studio/public/assets/materials/music/
├── energetic/          # 高能量音乐
│   ├── Track_989_989.mp3
│   ├── Track_51_51.mp3
│   └── ...
├── calm/              # 平静音乐
│   ├── Track_443_443.mp3
│   └── ...
├── epic/              # 史诗音乐
│   ├── Track_322_322.mp3
│   └── ...
└── happy/             # 快乐音乐
    ├── Track_866_866.mp3
    └── ...
```

### 版权说明

Mixkit 音乐:
- ✅ **CC0 协议** 或 **Mixkit License**
- ✅ **100% 免费商用**
- ✅ **无需署名**
- ✅ **可修改和重新分发**

### 注意事项

1. **避免 Envato 预览**: 页面中可能包含 Envato Elements 的推广音乐,这些是带水印的预览版。爬虫已自动过滤,只下载 `assets.mixkit.co` 域名的音乐。

2. **合理使用**: 虽然没有速率限制,但建议:
   - 下载间隔 0.5 秒以上
   - 一次不要下载过多
   - 尊重网站服务器资源

3. **稳定性**: 爬虫依赖页面结构,如果 Mixkit 更新网站可能需要调整代码。

### 故障排除

#### 找不到音乐
```
✅ 找到 0 首音乐
```
**解决**:
1. 检查分类名称是否正确
2. 访问网站确认该分类是否存在
3. 可能页面结构已更新,需要调整爬虫代码

#### 下载失败
```
❌ 下载失败: 404 Not Found
```
**解决**:
1. 检查网络连接
2. 确认 MP3 URL 是否有效
3. 可能音乐已被移除

---

## 📊 视频 vs 音乐对比

| 特性     | 视频 (API)         | 音乐 (爬虫)       |
| -------- | ------------------ | ----------------- |
| 获取方式 | 官方 API           | 网页爬虫          |
| API Key  | 需要               | 不需要            |
| 速率限制 | 有 (200-5000/小时) | 无                |
| 稳定性   | 高                 | 中 (依赖页面结构) |
| 使用难度 | 简单               | 中等              |
| 素材质量 | 极高 (4K)          | 高 (320kbps MP3)  |

## 🎯 完整工作流示例

### 制作一个完整的宣传视频

```python
from tools.free_stock_api import PixabayAPI, download_video
from tools.mixkit_music_scraper import MixkitMusicScraper
from pathlib import Path

# 1. 下载视频素材
pixabay = PixabayAPI()
videos = pixabay.search_videos("technology future", per_page=5)

video_dir = Path("project/videos")
for i, video in enumerate(videos[:3]):
    url = pixabay.get_best_quality_url(video)
    download_video(url, video_dir / f"tech_{i+1}.mp4")

# 2. 下载背景音乐
music_scraper = MixkitMusicScraper()
tracks = music_scraper.get_music_by_mood("epic")

music_dir = Path("project/music")
music_scraper.download_track(tracks[0], music_dir)

print("✅ 素材准备完成!")
print(f"  视频: {video_dir}")
print(f"  音乐: {music_dir}")
```

---

**最后更新**: 2026-01-10
