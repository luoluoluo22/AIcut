# AIcut 项目素材组织规范

## 目录结构

```
remotion-studio/
├── src/
│   └── projects/
│       ├── promo_video.json           # 项目配置
│       └── summer_seaside.json        # 项目配置
│
└── public/
    └── assets/
        └── projects/
            ├── promo_video/           # 宣传视频项目素材
            │   ├── videos/            # 视频素材
            │   │   ├── stressed_office_worker.mp4
            │   │   ├── video_editing_timeline.mp4
            │   │   └── ...
            │   ├── music/             # 音乐素材
            │   │   ├── energetic/
            │   │   ├── calm/
            │   │   └── ...
            │   ├── audio/             # 配音素材
            │   │   ├── p1_pain.mp3
            │   │   └── ...
            │   └── images/            # 图片素材
            │       └── poster.png
            │
            └── summer_seaside/        # 夏日海边项目素材
                ├── videos/
                ├── music/
                └── audio/
```

## 设计理念

### 1. 配置与素材分离
- **配置文件** (`src/projects/*.json`): 项目的结构定义
- **素材文件** (`public/assets/projects/`): 媒体资源
- 配置轻量,便于版本控制
- 素材可选择性加入 Git (或使用 Git LFS)

### 2. 符合 Remotion 规范
- `public/` 目录的文件可直接通过 HTTP 访问
- 路径引用: `/assets/projects/promo_video/videos/xxx.mp4`
- 不会被 Webpack 打包,提高性能
- 适合大文件(视频、音频)

## 优势

### ✅ 用户友好
- 所有素材一目了然
- 便于查看和管理
- 易于理解项目结构

### ✅ 便于分享
- 复制整个项目文件夹即可分享
- 包含所有必需的素材
- 不依赖全局素材库

### ✅ 版本控制
- 可以选择性地将素材加入 Git
- 或使用 `.gitignore` 排除大文件
- 便于团队协作

### ✅ 项目归档
- 完成的项目可以整体打包
- 素材不会丢失
- 便于后期修改

## 迁移指南

### 从全局素材库迁移

如果你之前使用全局素材库 (`public/assets/materials/`):

1. **创建项目素材目录**:
   ```bash
   mkdir -p remotion-studio/src/projects/your_project/assets/{videos,music,audio,images}
   ```

2. **复制素材**:
   ```bash
   cp public/assets/materials/videos/* remotion-studio/src/projects/your_project/assets/videos/
   ```

3. **更新 JSON 路径**:
   ```json
   // 旧路径
   "path": "/assets/materials/videos/beach.mp4"
   
   // 新路径
   "path": "./assets/videos/beach.mp4"
   ```

## 下载工具适配

### 视频下载

```python
from tools.free_stock_api import PixabayAPI, download_video
from pathlib import Path

# 指定项目目录
project_dir = Path("remotion-studio/src/projects/promo_video")
video_dir = project_dir / "assets" / "videos"

pixabay = PixabayAPI()
videos = pixabay.search_videos("beach", per_page=5)

for video in videos[:3]:
    url = pixabay.get_best_quality_url(video)
    download_video(url, video_dir / f"beach_{video['id']}.mp4")
```

### 音乐下载

```python
from tools.mixkit_music_scraper import MixkitMusicScraper
from pathlib import Path

# 指定项目目录
project_dir = Path("remotion-studio/src/projects/promo_video")
music_dir = project_dir / "assets" / "music"

scraper = MixkitMusicScraper()
tracks = scraper.get_music_by_mood("energetic")

scraper.download_track(tracks[0], music_dir)
```

## 最佳实践

### 1. 命名规范
- 使用描述性文件名: `stressed_office_worker.mp4` 而不是 `video1.mp4`
- 避免中文文件名,使用英文或拼音
- 使用下划线分隔单词

### 2. 文件大小控制
- 视频: 尽量使用 1080p,避免 4K (文件过大)
- 音乐: 使用 MP3 320kbps 或更低
- 图片: 使用 WebP 或优化的 JPEG

### 3. 版本控制建议

`.gitignore` 配置:
```gitignore
# 排除大文件
*.mp4
*.mp3
*.mov

# 但保留小文件
!*.jpg
!*.png
!*.webp
```

或者使用 Git LFS:
```bash
git lfs track "*.mp4"
git lfs track "*.mp3"
```

### 4. 项目文档

每个项目应包含 `README.md`:
```markdown
# 项目名称

## 素材清单

### 视频
- beach_waves.mp4 - 来源: Pixabay (ID: 12345)
- office_worker.mp4 - 来源: Pexels (ID: 67890)

### 音乐
- bgm_energetic.mp3 - 来源: Mixkit (Track 989)

### 配音
- p1_intro.mp3 - Edge TTS 生成

## 版权说明
所有素材均为免费商用,详见各素材来源。
```

## 示例项目结构

```
promo_video/
├── promo_video.json              # 项目配置
├── assets/
│   ├── videos/
│   │   ├── pain_timeline.mp4     # 痛点场景1
│   │   ├── pain_stressed.mp4     # 痛点场景2
│   │   ├── demo_beach.mp4        # 演示场景1
│   │   └── demo_running.mp4      # 演示场景2
│   ├── music/
│   │   └── bgm_energetic.mp3     # 背景音乐
│   ├── audio/
│   │   ├── p1_pain.mp3           # 第1段配音
│   │   ├── p2_magic.mp3          # 第2段配音
│   │   ├── p3_demo.mp3           # 第3段配音
│   │   └── p4_outro.mp3          # 第4段配音
│   └── images/
│       └── poster.png            # 封面图
└── README.md                     # 项目说明
```

---

**创建日期**: 2026-01-10
**最后更新**: 2026-01-10
