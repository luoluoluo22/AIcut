# 免费素材下载系统 - 完整总结

## 🎉 系统概述

AIcut 现在拥有完整的免费素材自动化下载系统,包括:
- ✅ **视频素材**: 通过 Pixabay/Pexels API
- ✅ **音乐素材**: 通过 Mixkit 网页爬虫

所有素材均为 **100% 免费商用**,无需署名,可用于 Bilibili、YouTube 等平台。

## 📁 文件结构

```
AIcut/
├── .env                              # API Keys 配置
├── tools/
│   ├── free_stock_api.py            # 视频 API 工具
│   └── mixkit_music_scraper.py      # 音乐爬虫工具
├── .agent/workflows/
│   └── download-free-assets-api.md  # 完整工作流文档
└── docs/
    ├── FREE_STOCK_API_GUIDE.md      # API 使用指南
    └── FREE_MUSIC_SOLUTIONS.md      # 音乐解决方案
```

## 🚀 快速开始

### 1. 配置 API Keys

编辑 `.env` 文件:
```bash
PIXABAY_API_KEY=8725709-010196be6193736da9ba93ffe
PEXELS_API_KEY=64sPCgMIzhNF3sREXZbwlYR3ZZNXiffrqDQbqXtj0kuHf3ZIm5UncA53
```

### 2. 下载视频素材

```bash
python tools/free_stock_api.py
```

自动下载 5 个关键词的视频到: `remotion-studio/public/assets/materials/stock/`

### 3. 下载音乐素材

```bash
python tools/mixkit_music_scraper.py
```

自动下载 4 个分类的音乐到: `remotion-studio/public/assets/materials/music/`

## 📊 功能对比

| 功能         | 视频 API        | 音乐爬虫     |
| ------------ | --------------- | ------------ |
| **平台**     | Pixabay, Pexels | Mixkit       |
| **方式**     | 官方 API        | 网页爬虫     |
| **API Key**  | 需要            | 不需要       |
| **速率限制** | 200-5000/小时   | 无           |
| **稳定性**   | 高              | 中           |
| **素材质量** | 极高 (4K)       | 高 (320kbps) |
| **使用难度** | 简单            | 中等         |

## 🎯 使用场景

### 场景一: 制作宣传视频

```python
from tools.free_stock_api import PixabayAPI, download_video
from tools.mixkit_music_scraper import MixkitMusicScraper
from pathlib import Path

# 下载视频
pixabay = PixabayAPI()
videos = pixabay.search_videos("technology", per_page=5)
for video in videos[:3]:
    url = pixabay.get_best_quality_url(video)
    download_video(url, Path("project/videos/tech.mp4"))

# 下载音乐
scraper = MixkitMusicScraper()
tracks = scraper.get_music_by_mood("epic")
scraper.download_track(tracks[0], Path("project/music"))
```

### 场景二: 建立素材库

```bash
# 下载多种类型的视频
python tools/free_stock_api.py

# 下载多种风格的音乐
python tools/mixkit_music_scraper.py
```

### 场景三: 精选高质量素材

```python
from tools.free_stock_api import PexelsAPI

pexels = PexelsAPI()
videos = pexels.search_videos("ocean sunset", orientation="landscape")

# 只要 4K 视频
uhd_videos = [v for v in videos if v['width'] >= 3840]
```

## 📝 技术实现

### 视频 API

**Pixabay API:**
- 端点: `https://pixabay.com/api/videos/`
- 参数: `key`, `q`, `per_page` (3-200), `page`
- 返回: JSON 包含视频列表和下载链接

**Pexels API:**
- 端点: `https://api.pexels.com/videos/search`
- 认证: Header `Authorization: {api_key}`
- 参数: `query`, `per_page` (1-80), `orientation`
- 返回: JSON 包含视频列表和多分辨率链接

### 音乐爬虫

**发现的规律:**
1. Mixkit 使用 Algolia 搜索服务
2. Track ID 存储在 `data-algolia-analytics-item-id` 属性
3. MP3 URL 模式: `https://assets.mixkit.co/music/{ID}/{ID}.mp3`
4. 无需认证,直接下载

**实现方式:**
1. 使用 `requests` 获取页面 HTML
2. 使用 `BeautifulSoup` 解析 DOM
3. 提取所有 Track ID
4. 构建 MP3 URL 并下载

## ✅ 已下载的素材

### 视频 (5个)
- `stressed_office_worker_1.mp4` - 压力办公
- `video_editing_timeline_1.mp4` - 视频编辑
- `beach_waves_1.mp4` - 海浪
- `running_beach_1.mp4` - 海边奔跑
- `bamboo_forest_1.mp4` - 竹林

### 音乐 (14首)
- **energetic** (5首): Track_989, Track_51, Track_1068, Track_706, Track_126
- **calm** (3首): Track_443, Track_127, Track_657
- **epic** (1首): Track_322
- **happy** (3首): Track_866, Track_839, Track_1076
- **宣传片 BGM**: bgm_energetic.mp3 (Sports Highlights - Mixkit)

## 🔧 维护和更新

### 视频 API

**优势:**
- 官方支持,稳定可靠
- 不会因网站改版而失效
- 有完整的文档和错误处理

**注意事项:**
- 需要定期检查 API Key 是否有效
- 注意速率限制 (Pexels 200/小时, Pixabay 5000/小时)

### 音乐爬虫

**优势:**
- 无需 API Key
- 无速率限制
- 直接访问 MP3 文件

**注意事项:**
- 依赖页面结构,可能需要更新
- 如果 Mixkit 改版,需要调整选择器
- 建议定期测试确保正常工作

**更新检查清单:**
1. 访问 https://mixkit.co/free-stock-music/
2. 检查页面结构是否改变
3. 验证 `data-algolia-analytics-item-id` 属性是否存在
4. 测试 MP3 URL 是否有效

## 📚 相关文档

1. **工作流**: `.agent/workflows/download-free-assets-api.md`
   - 完整的使用说明
   - 代码示例
   - 故障排除

2. **API 指南**: `docs/FREE_STOCK_API_GUIDE.md`
   - API 详细说明
   - 参数解释
   - 高级用法

3. **音乐方案**: `docs/FREE_MUSIC_SOLUTIONS.md`
   - 音乐来源对比
   - 版权说明
   - 替代方案

## 🎓 最佳实践

1. **建立本地素材库**: 定期下载常用素材,避免重复调用 API
2. **按项目分类**: 为不同项目创建独立的素材文件夹
3. **记录素材来源**: 在项目中记录使用的素材 ID 和来源
4. **定期更新**: 每月更新一次素材库,获取新内容
5. **备份重要素材**: 将常用素材备份到云端

## 🔮 未来改进

1. **AI 标签识别**: 自动分析视频内容并打标签
2. **智能推荐**: 根据项目需求推荐合适的素材
3. **批量管理**: 开发素材管理界面
4. **自动更新**: 定时检查并下载新素材
5. **质量评分**: 对素材进行质量评分和筛选

---

**创建日期**: 2026-01-10
**最后更新**: 2026-01-10
**维护者**: AIcut Team
