"""
免费素材下载工具 - 使用真实 API
支持 Pexels 和 Pixabay
"""

import requests
from pathlib import Path
from typing import List, Dict, Optional
import json
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class PixabayAPI:
    """Pixabay 视频素材 API 封装"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        初始化 Pixabay API
        
        Args:
            api_key: API Key (可选,默认从环境变量 PIXABAY_API_KEY 读取)
        """
        self.api_key = api_key or os.getenv('PIXABAY_API_KEY')
        if not self.api_key:
            raise ValueError(
                "未找到 Pixabay API Key!\n"
                "请在 .env 文件中设置 PIXABAY_API_KEY,\n"
                "或访问 https://pixabay.com/api/docs/ 获取免费 API key"
            )
        self.base_url = "https://pixabay.com/api/videos/"
    
    def search_videos(
        self,
        query: str,
        per_page: int = 20,
        page: int = 1
    ) -> List[Dict]:
        """搜索视频素材
        
        注意: Pixabay 视频 API 的 per_page 范围是 3-200
        """
        # 确保 per_page 在有效范围内
        per_page = max(3, min(200, per_page))
        
        params = {
            "key": self.api_key,
            "q": query,
            "per_page": per_page,
            "page": page
        }
        
        try:
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return data.get("hits", [])
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 400:
                print("❌ API Key 无效,请访问 https://pixabay.com/api/docs/ 获取免费 API key")
                print("   然后修改 free_stock_api.py 中的 api_key 参数")
            raise
    
    def get_best_quality_url(self, video: Dict) -> Optional[str]:
        """获取最佳质量的下载链接"""
        videos = video.get("videos", {})
        
        # 优先级: large > medium > small
        for quality in ["large", "medium", "small", "tiny"]:
            if quality in videos and videos[quality].get("url"):
                return videos[quality]["url"]
        
        return None


class PexelsAPI:
    """
    Pexels API 封装
    
    使用方法:
    1. 访问 https://www.pexels.com/api/
    2. 注册免费账号
    3. 获取 API Key
    4. 在 .env 文件中设置 PEXELS_API_KEY
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        初始化 Pexels API
        
        Args:
            api_key: API Key (可选,默认从环境变量 PEXELS_API_KEY 读取)
        """
        self.api_key = api_key or os.getenv('PEXELS_API_KEY')
        if not self.api_key:
            raise ValueError(
                "未找到 Pexels API Key!\n"
                "请在 .env 文件中设置 PEXELS_API_KEY,\n"
                "或访问 https://www.pexels.com/api/ 获取免费 API key"
            )
        self.base_url = "https://api.pexels.com/videos"
        self.headers = {"Authorization": self.api_key}
    
    def search_videos(
        self, 
        query: str, 
        per_page: int = 15,
        page: int = 1,
        orientation: Optional[str] = None
    ) -> List[Dict]:
        """搜索视频素材"""
        url = f"{self.base_url}/search"
        params = {
            "query": query,
            "per_page": per_page,
            "page": page
        }
        
        if orientation:
            params["orientation"] = orientation
            
        response = requests.get(url, headers=self.headers, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        return data.get("videos", [])
    
    def get_best_quality_url(self, video: Dict, min_width: int = 1920) -> Optional[str]:
        """获取最佳质量的下载链接"""
        video_files = video.get("video_files", [])
        
        # 按宽度降序排序
        sorted_files = sorted(
            video_files,
            key=lambda x: x.get("width", 0),
            reverse=True
        )
        
        # 找到第一个满足最小宽度要求的
        for file in sorted_files:
            if file.get("width", 0) >= min_width and file.get("link"):
                return file["link"]
        
        # 如果没有满足要求的,返回最高质量的
        if sorted_files:
            return sorted_files[0].get("link")
        
        return None


def download_video(url: str, output_path: Path) -> bool:
    """下载视频文件"""
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        print(f"⏬ 正在下载: {output_path.name}")
        response = requests.get(url, stream=True, timeout=30)
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


def batch_download_from_pixabay(
    keywords: List[str],
    output_dir: Path,
    videos_per_keyword: int = 1
):
    """
    批量从 Pixabay 下载视频
    
    Args:
        keywords: 关键词列表 (英文)
        output_dir: 输出目录
        videos_per_keyword: 每个关键词下载几个视频
    """
    pixabay = PixabayAPI()
    
    for keyword in keywords:
        print(f"\n🔍 搜索: '{keyword}'")
        try:
            # 确保 per_page 至少为 3 (Pixabay API 要求)
            actual_per_page = max(3, videos_per_keyword)
            videos = pixabay.search_videos(keyword, per_page=actual_per_page)
            
            if not videos:
                print(f"  ⚠️ 未找到相关视频")
                continue
            
            print(f"  找到 {len(videos)} 个视频")
            
            for i, video in enumerate(videos[:videos_per_keyword]):
                url = pixabay.get_best_quality_url(video)
                if url:
                    filename = f"{keyword.replace(' ', '_')}_{i+1}.mp4"
                    output_path = output_dir / filename
                    download_video(url, output_path)
        
        except Exception as e:
            print(f"  ❌ 搜索失败: {e}")


# 使用示例
if __name__ == "__main__":
    # 定义要下载的素材关键词
    keywords = [
        "stressed office worker",
        "video editing timeline",
        "beach waves",
        "running beach",
        "bamboo forest"
    ]
    
    # 输出目录 - 按项目组织
    project_name = "demo"  # 项目名称
    output_dir = Path(f"remotion-studio/public/assets/projects/{project_name}/videos")
    
    print("=" * 60)
    print("免费素材批量下载工具")
    print("=" * 60)
    print(f"项目: {project_name}")
    print(f"输出目录: {output_dir}")
    print(f"关键词数量: {len(keywords)}")
    print("=" * 60)
    
    # 开始下载
    batch_download_from_pixabay(keywords, output_dir, videos_per_keyword=1)
    
    print("\n" + "=" * 60)
    print("✅ 下载完成!")
    print("=" * 60)
