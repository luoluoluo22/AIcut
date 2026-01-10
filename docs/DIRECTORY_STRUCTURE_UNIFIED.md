# 项目目录结构统一说明

## ✅ 最终确定的目录结构

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
            ├── promo_video/           # 项目素材
            │   ├── videos/
            │   ├── music/
            │   ├── audio/
            │   └── images/
            └── summer_seaside/
                └── ...
```

## 📋 设计决策

### 为什么选择这个结构?

**配置与素材分离**:
1. **配置文件** (`src/projects/*.json`)
   - 轻量级,只包含结构定义
   - 便于版本控制 (Git)
   - 易于编辑和维护

2. **素材文件** (`public/assets/projects/`)
   - 大文件,不适合频繁提交
   - 可选择性加入 Git 或使用 Git LFS
   - 符合 Remotion 的最佳实践

### 符合 Remotion 规范

- ✅ `public/` 目录的文件可直接通过 HTTP 访问
- ✅ 路径: `/assets/projects/promo_video/videos/xxx.mp4`
- ✅ 不会被 Webpack 打包,提高性能
- ✅ 适合大文件 (视频、音频)

## 🔄 迁移记录

**2026-01-10**: 从 `src/projects/{name}/assets/` 迁移到 `public/assets/projects/{name}/`

**原因**:
1. Remotion 推荐将媒体文件放在 `public/` 目录
2. 避免大文件被 Webpack 处理
3. 便于直接 HTTP 访问
4. 配置与素材分离,更清晰

## 📝 路径引用规范

### 在 JSON 配置中

使用绝对路径(相对于 `public/` 目录):

```json
{
  "clips": [
    {
      "path": "/assets/projects/promo_video/videos/beach_waves.mp4"
    }
  ],
  "audio": [
    {
      "path": "/assets/projects/promo_video/music/energetic/Track_989_989.mp3"
    }
  ]
}
```

### 在下载工具中

```python
# 视频下载
output_dir = Path(f"remotion-studio/public/assets/projects/{project_name}/videos")

# 音乐下载
output_dir = Path(f"remotion-studio/public/assets/projects/{project_name}/music")
```

## 🎯 最佳实践

### 1. 版本控制

`.gitignore` 配置:
```gitignore
# 排除大文件
public/assets/projects/**/*.mp4
public/assets/projects/**/*.mp3
public/assets/projects/**/*.mov

# 但保留小文件
!public/assets/projects/**/*.jpg
!public/assets/projects/**/*.png
!public/assets/projects/**/*.webp
```

或使用 Git LFS:
```bash
git lfs track "public/assets/projects/**/*.mp4"
git lfs track "public/assets/projects/**/*.mp3"
```

### 2. 项目文档

在每个项目配置旁边创建 `README.md`:

```
src/projects/
├── promo_video.json
├── promo_video.README.md      # 项目说明
├── summer_seaside.json
└── summer_seaside.README.md
```

内容示例:
```markdown
# Promo Video 项目

## 素材清单

### 视频 (public/assets/projects/promo_video/videos/)
- beach_waves.mp4 - Pixabay (ID: 12345)
- office_worker.mp4 - Pexels (ID: 67890)

### 音乐 (public/assets/projects/promo_video/music/)
- energetic/Track_989_989.mp3 - Mixkit

## 版权说明
所有素材均为免费商用。
```

### 3. 命名规范

- **项目名**: 小写+下划线 (`promo_video`, `summer_seaside`)
- **文件名**: 描述性英文 (`stressed_office_worker.mp4`)
- **避免**: 中文、空格、特殊字符

## 🛠️ 工具适配

所有下载工具已更新为新结构:

1. **视频下载**: `tools/free_stock_api.py`
   - 输出: `remotion-studio/public/assets/projects/{project}/videos/`

2. **音乐下载**: `tools/mixkit_music_scraper.py`
   - 输出: `remotion-studio/public/assets/projects/{project}/music/`

## 📚 相关文档

- `docs/PROJECT_ASSETS_STRUCTURE.md` - 详细结构说明
- `.agent/workflows/download-free-assets-api.md` - 下载工作流
- `docs/FREE_ASSETS_SYSTEM_SUMMARY.md` - 系统总结

---

**最后更新**: 2026-01-10
**状态**: ✅ 已统一
