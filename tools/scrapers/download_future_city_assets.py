"""
Future City Project - Asset Downloader
Uses API keys from .env file
"""
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")
OUTPUT_DIR = "remotion-studio/public/assets/projects/future_city/videos"

QUERIES = [
    ("futuristic city", "future_city_1.mp4"),
    ("cyberpunk city night", "cyberpunk_night.mp4"),
    ("technology city", "smart_city.mp4"),
]

def download_from_pexels(query, filename):
    """Try Pexels API first"""
    if not PEXELS_API_KEY:
        print("  ⚠️ PEXELS_API_KEY not found in .env")
        return False
    
    url = "https://api.pexels.com/videos/search"
    headers = {"Authorization": PEXELS_API_KEY}
    params = {"query": query, "per_page": 5, "orientation": "landscape"}
    
    print(f"🔍 [Pexels] Searching: {query}...")
    response = requests.get(url, headers=headers, params=params)
    
    if response.status_code != 200:
        print(f"  ❌ Pexels failed: {response.status_code} - {response.text[:100]}")
        return False
    
    videos = response.json().get("videos", [])
    if not videos:
        print(f"  ❌ No videos found")
        return False
    
    video = videos[0]
    video_files = video.get("video_files", [])
    
    # Find HD quality
    hd_file = None
    for vf in video_files:
        if vf.get("quality") == "hd" and vf.get("width", 0) >= 1280:
            hd_file = vf
            break
    
    if not hd_file and video_files:
        hd_file = video_files[0]
    
    if not hd_file:
        print(f"  ❌ No downloadable file")
        return False
    
    download_url = hd_file.get("link")
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    print(f"  ⬇️ Downloading from Pexels...")
    video_response = requests.get(download_url, stream=True)
    
    if video_response.status_code == 200:
        with open(filepath, "wb") as f:
            for chunk in video_response.iter_content(chunk_size=8192):
                f.write(chunk)
        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        print(f"  ✅ Saved: {filename} ({size_mb:.1f} MB)")
        return True
    else:
        print(f"  ❌ Download failed: {video_response.status_code}")
        return False

def download_from_pixabay(query, filename):
    """Fallback to Pixabay"""
    if not PIXABAY_API_KEY:
        print("  ⚠️ PIXABAY_API_KEY not found in .env")
        return False
    
    url = "https://pixabay.com/api/videos/"
    params = {
        "key": PIXABAY_API_KEY,
        "q": query,
        "per_page": 3,
    }
    
    print(f"🔍 [Pixabay] Searching: {query}...")
    response = requests.get(url, params=params)
    
    if response.status_code != 200:
        print(f"  ❌ Pixabay failed: {response.status_code}")
        return False
    
    hits = response.json().get("hits", [])
    if not hits:
        print(f"  ❌ No videos found")
        return False
    
    video = hits[0]
    video_url = video.get("videos", {}).get("medium", {}).get("url")
    if not video_url:
        video_url = video.get("videos", {}).get("small", {}).get("url")
    
    if not video_url:
        print(f"  ❌ No downloadable file")
        return False
    
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    print(f"  ⬇️ Downloading from Pixabay...")
    video_response = requests.get(video_url, stream=True)
    
    if video_response.status_code == 200:
        with open(filepath, "wb") as f:
            for chunk in video_response.iter_content(chunk_size=8192):
                f.write(chunk)
        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        print(f"  ✅ Saved: {filename} ({size_mb:.1f} MB)")
        return True
    else:
        print(f"  ❌ Download failed")
        return False

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("=" * 50)
    print("🎬 Future City Asset Downloader")
    print(f"📁 Output: {OUTPUT_DIR}")
    print(f"🔑 Pexels Key: {PEXELS_API_KEY[:10]}..." if PEXELS_API_KEY else "🔑 Pexels Key: Not found")
    print(f"🔑 Pixabay Key: {PIXABAY_API_KEY[:10]}..." if PIXABAY_API_KEY else "🔑 Pixabay Key: Not found")
    print("=" * 50)
    
    success = 0
    for query, filename in QUERIES:
        # Try Pexels first, then Pixabay
        if download_from_pexels(query, filename):
            success += 1
        elif download_from_pixabay(query, filename):
            success += 1
        print()
    
    print("=" * 50)
    print(f"✅ Downloaded {success}/{len(QUERIES)} videos")

if __name__ == "__main__":
    main()
