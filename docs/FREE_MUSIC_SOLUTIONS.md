# 免费音乐素材解决方案

## 现状总结

目前**没有像 Pexels/Pixabay 那样简单易用的免费音乐 API**。大多数音乐 API 要么:
1. 需要付费订阅
2. 使用 AI 生成音乐(质量参差不齐)
3. 需要复杂的授权流程

## 推荐方案

### 方案一: Mixkit (推荐) ⭐⭐⭐⭐⭐

**优势:**
- ✅ 完全免费,无需 API Key
- ✅ 高质量人工制作音乐
- ✅ 无需署名
- ✅ 可商业使用
- ✅ 直接 MP3 下载链接

**使用方法:**

1. **浏览器下载** (当前方式):
   - 访问: https://mixkit.co/free-stock-music/
   - 按心情/标签筛选
   - 直接下载 MP3

2. **半自动化方式** (推荐):
   ```python
   import requests
   from bs4 import BeautifulSoup
   
   # Mixkit 的音乐页面
   url = "https://mixkit.co/free-stock-music/mood/energetic/"
   
   # 获取页面
   response = requests.get(url)
   soup = BeautifulSoup(response.text, 'html.parser')
   
   # 提取音乐链接 (需要分析页面结构)
   # 音乐文件通常在: https://assets.mixkit.co/music/preview/mixkit-*.mp3
   ```

**已下载的音乐:**
- `bgm_energetic.mp3` - Sports Highlights (Mixkit)

### 方案二: Pixabay Music (手动下载)

虽然 Pixabay 没有音乐 API,但网站提供免费音乐:

**网址**: https://pixabay.com/music/

**特点:**
- ✅ 免费商用
- ✅ 无需署名
- ✅ 质量高
- ❌ 无 API,需手动下载

**使用方法:**
1. 访问音乐页面
2. 按类型/心情筛选
3. 试听后下载

### 方案三: YouTube Audio Library

**网址**: https://studio.youtube.com/channel/UC.../music

**特点:**
- ✅ 完全免费
- ✅ 高质量
- ⚠️ 部分需要署名
- ❌ 需要 YouTube 账号
- ❌ 无 API

### 方案四: Free Music Archive (FMA)

**网址**: https://freemusicarchive.org/

**特点:**
- ✅ 大量音乐
- ⚠️ 授权复杂(CC BY, CC BY-SA, CC0 等)
- ✅ 有 API (但需要仔细检查每首歌的授权)

**API 文档**: https://freemusicarchive.org/api

## 实用建议

### 对于 AIcut 项目

1. **短期方案**: 
   - 继续使用 Mixkit 手动下载
   - 建立本地音乐库 (`assets/materials/music/`)
   - 按类型分类: `energetic/`, `calm/`, `epic/` 等

2. **中期方案**:
   - 编写 Mixkit 爬虫脚本
   - 自动提取音乐下载链接
   - 批量下载到本地

3. **长期方案**:
   - 考虑使用 AI 音乐生成 API (如 Mubert)
   - 或者购买音乐库订阅 (如 Epidemic Sound)

## Mixkit 半自动化脚本示例

```python
"""
Mixkit 音乐下载辅助脚本
注意: Mixkit 没有官方 API,这个脚本通过分析页面结构获取下载链接
"""

import requests
from pathlib import Path

def download_mixkit_music(music_id: int, output_path: Path):
    """
    下载 Mixkit 音乐
    
    Args:
        music_id: 音乐 ID (从 URL 中获取,如 mixkit-sports-highlights-51 中的 51)
        output_path: 保存路径
    """
    # Mixkit 的预览 MP3 URL 格式
    url = f"https://assets.mixkit.co/music/preview/mixkit-*-{music_id}.mp3"
    
    # 注意: 实际文件名包含音乐名称,需要从页面获取
    # 这里只是示例,实际使用需要先访问页面获取完整文件名
    
    response = requests.get(url, stream=True)
    if response.status_code == 200:
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅ 下载成功: {output_path}")
    else:
        print(f"❌ 下载失败: {response.status_code}")

# 使用示例
# download_mixkit_music(51, Path("music/sports_highlights.mp3"))
```

## 推荐音乐库结构

```
remotion-studio/public/assets/materials/music/
├── energetic/          # 高能量音乐
│   ├── sports_highlights.mp3
│   ├── upbeat_rock.mp3
│   └── ...
├── calm/              # 平静音乐
│   ├── peaceful_piano.mp3
│   └── ...
├── epic/              # 史诗音乐
│   ├── cinematic_trailer.mp3
│   └── ...
└── corporate/         # 企业/商务音乐
    ├── modern_tech.mp3
    └── ...
```

## 版权注意事项

### 安全使用的音乐来源

1. **Mixkit** - 100% 安全,无需署名
2. **Pixabay Music** - 100% 安全,无需署名
3. **YouTube Audio Library** - 检查每首歌的授权要求
4. **Free Music Archive** - 仔细检查 CC 授权类型

### 避免使用

- ❌ 未经授权的流行音乐
- ❌ 来源不明的"免费"音乐
- ❌ 需要署名但你无法提供的音乐

## 总结

**目前最佳方案**: 
1. 使用 **Mixkit** 手动下载高质量音乐
2. 建立本地音乐库
3. 在 AIcut 中引用本地文件

**未来改进**:
- 开发 Mixkit 自动化下载脚本
- 或考虑 AI 音乐生成 API

---

**最后更新**: 2026-01-10
