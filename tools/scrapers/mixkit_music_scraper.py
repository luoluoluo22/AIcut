"""
Mixkit 免费音乐爬虫
基于网络监听分析的 API 规律编写
"""

import requests
from pathlib import Path
from typing import List, Dict
from bs4 import BeautifulSoup
import time

class MixkitMusicScraper:
    """Mixkit 音乐爬虫"""
    
    def __init__(self):
        self.base_url = "https://mixkit.co"
        self.asset_url = "https://assets.mixkit.co/music"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def get_music_by_mood(self, mood: str = "energetic") -> List[Dict]:
        """
        获取指定心情分类的音乐列表
        
        Args:
            mood: 心情分类 (energetic, calm, epic, happy, sad, etc.)
            
        Returns:
            音乐列表,每个包含 id, title, author, mp3_url
        """
        url = f"{self.base_url}/free-stock-music/mood/{mood}/"
        
        print(f"🔍 正在获取 {mood} 音乐列表...")
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找所有带 data-algolia-analytics-item-id 的下载按钮
        download_buttons = soup.find_all('button', {'data-algolia-analytics-item-id': True})
        
        tracks = []
        for btn in download_buttons:
            track_id = btn.get('data-algolia-analytics-item-id')
            
            # 找到包含这个按钮的音乐项容器
            container = btn.find_parent('div', class_=lambda x: x and 'item-grid' in x)
            if not container:
                container = btn.find_parent('div')
            
            # 提取标题
            title_el = container.find('h2') if container else None
            title = title_el.text.strip() if title_el else f"Track_{track_id}"
            
            # 提取作者 (通常在 "by Author" 格式中)
            author = "Unknown"
            if container:
                text = container.get_text()
                if 'by ' in text:
                    author_part = text.split('by ')[-1].split('\n')[0].strip()
                    author = author_part
            
            # 构建 MP3 URL (基于分析的规律)
            mp3_url = f"{self.asset_url}/{track_id}/{track_id}.mp3"
            
            tracks.append({
                'id': track_id,
                'title': title,
                'author': author,
                'mp3_url': mp3_url,
                'mood': mood
            })
        
        print(f"✅ 找到 {len(tracks)} 首音乐")
        return tracks
    
    def download_track(self, track: Dict, output_dir: Path) -> bool:
        """
        下载单首音乐
        
        Args:
            track: 音乐信息字典
            output_dir: 输出目录
            
        Returns:
            是否成功
        """
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # 清理文件名
            safe_title = "".join(c for c in track['title'] if c.isalnum() or c in (' ', '-', '_')).strip()
            filename = f"{safe_title}_{track['id']}.mp3"
            output_path = output_dir / filename
            
            # 如果已存在,跳过
            if output_path.exists():
                print(f"⏭️  已存在: {filename}")
                return True
            
            print(f"⏬ 正在下载: {track['title']}")
            
            response = requests.get(track['mp3_url'], stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\r  进度: {percent:.1f}%", end='')
            
            print(f"\n✅ 下载成功: {output_path}")
            return True
            
        except Exception as e:
            print(f"\n❌ 下载失败: {e}")
            return False
    
    def batch_download_by_mood(
        self, 
        mood: str, 
        output_dir: Path,
        max_tracks: int = None
    ):
        """
        批量下载指定心情的音乐
        
        Args:
            mood: 心情分类
            output_dir: 输出目录
            max_tracks: 最多下载数量 (None 表示全部)
        """
        tracks = self.get_music_by_mood(mood)
        
        if max_tracks:
            tracks = tracks[:max_tracks]
        
        print(f"\n📦 开始批量下载 {len(tracks)} 首音乐...")
        
        success_count = 0
        for i, track in enumerate(tracks, 1):
            print(f"\n[{i}/{len(tracks)}]")
            if self.download_track(track, output_dir):
                success_count += 1
            time.sleep(0.5)  # 避免请求过快
        
        print(f"\n{'='*60}")
        print(f"✅ 下载完成! 成功: {success_count}/{len(tracks)}")
        print(f"{'='*60}")


def download_music_library():
    """下载常用的音乐库"""
    scraper = MixkitMusicScraper()
    
    # 定义要下载的分类和数量
    categories = {
        'energetic': 5,   # 高能量音乐
        'calm': 3,        # 平静音乐
        'epic': 3,        # 史诗音乐
        'happy': 3,       # 快乐音乐
    }
    
    # 输出目录 - 按项目组织
    project_name = "promo_video"  # 项目名称
    base_dir = Path(f"remotion-studio/public/assets/projects/{project_name}/music")
    
    print("=" * 60)
    print("Mixkit 音乐库批量下载")
    print("=" * 60)
    print(f"项目: {project_name}")
    print(f"输出目录: {base_dir}")
    print("=" * 60)
    
    for mood, count in categories.items():
        print(f"\n{'='*60}")
        print(f"分类: {mood.upper()}")
        print(f"{'='*60}")
        
        output_dir = base_dir / mood
        scraper.batch_download_by_mood(mood, output_dir, max_tracks=count)


# 使用示例
if __name__ == "__main__":
    # 方式一: 下载预定义的音乐库
    download_music_library()
    
    # 方式二: 自定义下载
    # scraper = MixkitMusicScraper()
    # tracks = scraper.get_music_by_mood("energetic")
    # for track in tracks[:3]:
    #     scraper.download_track(track, Path("downloads/music"))
