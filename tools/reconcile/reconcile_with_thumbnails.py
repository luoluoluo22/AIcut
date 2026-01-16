import json
import os
import uuid
import cv2
from PIL import Image
import numpy as np
import hashlib

# Paths
SNAPSHOT_PATH = r"f:\桌面\开发\AIcut\ai_workspace\project-snapshot.json"
BASE_MATERIALS_DIR = r"f:\桌面\开发\AIcut\AIcut-Studio\apps\web\public\materials"
THUMBNAILS_DIR = os.path.join(BASE_MATERIALS_DIR, "_thumbnails")

# Ensure thumbnails directory exists
if not os.path.exists(THUMBNAILS_DIR):
    os.makedirs(THUMBNAILS_DIR)

def calculate_file_hash(file_path):
    """Generates a stable ID based on file metadata and content head."""
    try:
        stat = os.stat(file_path)
        # Use size + mtime + first 1MB of content
        hasher = hashlib.sha256()
        hasher.update(str(stat.st_size).encode())
        
        # Read first 1MB and last 1KB inside the same context
        with open(file_path, "rb") as f:
            chunk = f.read(1024 * 1024)
            hasher.update(chunk)
            
            # Optional: Read last 1KB (end of file)
            if stat.st_size > 1024 * 1024:
                f.seek(-1024, 2)
                hasher.update(f.read())
            
        return "h_" + hasher.hexdigest()[:12]
    except Exception as e:
        print(f"Hashing error for {file_path}: {e}")
        return "asset_" + str(uuid.uuid4())[:8]

def get_asset_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.mp4', '.mov', '.webm', '.mkv']: return 'video'
    if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']: return 'image'
    if ext in ['.mp3', '.wav', '.ogg', '.m4a']: return 'audio'
    return 'other'

def generate_video_thumbnail(video_path, asset_id):
    """Generates a thumbnail for a video and returns the relative URL path."""
    thumb_filename = f"{asset_id}.jpg"
    thumb_path = os.path.join(THUMBNAILS_DIR, thumb_filename)
    
    # If thumbnail already exists, skip generation
    if os.path.exists(thumb_path):
        return f"/materials/_thumbnails/{thumb_filename}"

    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Error: Could not open video {video_path}")
            return None

        # Get total frames
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Target frame: 10% or at least 1st second (assume 24fps)
        target_frame = max(1, min(total_frames // 10, 24))
        
        cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
        ret, frame = cap.read()
        
        if ret:
            # Resize for efficiency (e.g., max width 480px, maintain aspect ratio)
            height, width = frame.shape[:2]
            max_w = 480
            if width > max_w:
                new_h = int(height * (max_w / width))
                frame = cv2.resize(frame, (max_w, new_h), interpolation=cv2.INTER_AREA)
            
            # Save using OpenCV
            cv2.imwrite(thumb_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            cap.release()
            return f"/materials/_thumbnails/{thumb_filename}"
        
        cap.release()
    except Exception as e:
        print(f"Unexpected error generating thumbnail for {video_path}: {e}")
    
    return None

def generate_image_thumbnail(image_path, asset_id):
    """Resizes an image for a thumbnail and returns the relative URL path."""
    thumb_filename = f"{asset_id}.jpg"
    thumb_path = os.path.join(THUMBNAILS_DIR, thumb_filename)
    
    if os.path.exists(thumb_path):
        return f"/materials/_thumbnails/{thumb_filename}"

    try:
        with Image.open(image_path) as img:
            img.thumbnail((480, 480))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(thumb_path, "JPEG", quality=85)
            return f"/materials/_thumbnails/{thumb_filename}"
    except Exception as e:
        print(f"Error generating image thumbnail for {image_path}: {e}")
    
    return None

def reconcile():
    if not os.path.exists(SNAPSHOT_PATH):
        print(f"Snapshot not found at {SNAPSHOT_PATH}")
        return

    with open(SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Key config for mapping
    mapping = {
        "ai_gen_1768485094370.jpg": {"name": "赛博街道-背景图", "id": "asset_cyber_img"},
        "ai_gen_1768486131632.jpg": {"name": "竹林深处-背景图", "id": "asset_bamboo_img"},
        "grok_video_27146.mp4": {"name": "Grok-赛博视频", "id": "asset_grok_v1"},
        "v1.mp3": {"name": "语音-赛博街道", "id": "asset_cyber_aud"},
        "v2.mp3": {"name": "语音-竹林深处", "id": "asset_bamboo_aud"},
        "scene_cyber.png": {"name": "赛博原画", "id": "asset_cyber_raw"},
        "scene_bamboo.png": {"name": "竹林原画", "id": "asset_bamboo_raw"},
        "scene_cyber.mp3": {"name": "背景音-赛博", "id": "asset_cyber_bgm"},
        "scene_bamboo.mp3": {"name": "背景音-竹林", "id": "asset_bamboo_bgm"},
        "AI还原纪录片.MP3": {"name": "还原纪录片音频", "id": "asset_documentary_aud"},
    }

    new_assets = []
    
    print("Scanning materials and generating thumbnails...")
    for root, dirs, files in os.walk(BASE_MATERIALS_DIR):
        # Skip the thumbnails dir itself
        if "_thumbnails" in root: continue
        
        for filename in files:
            if filename.startswith('.'): continue
            
            full_path = os.path.join(root, filename)
            url_path = "/materials" + full_path.split("public\\materials")[1].replace("\\", "/")
            asset_type = get_asset_type(filename)
            
            # Determine ID based on Content Hash
            if filename in mapping:
                asset_id = mapping[filename]['id']
                asset_name = mapping[filename]['name']
            else:
                asset_id = calculate_file_hash(full_path)
                asset_name = filename
            
            asset = {
                "id": asset_id,
                "name": asset_name,
                "type": asset_type,
                "url": url_path,
                "filePath": full_path,
                "isLinked": True
            }

            # Generate Thumbnails
            if asset_type == 'video':
                thumb_url = generate_video_thumbnail(full_path, asset_id)
                if thumb_url: asset['thumbnailUrl'] = thumb_url
                
                # Get video duration (optional but helpful)
                try:
                    cap = cv2.VideoCapture(full_path)
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    if fps > 0:
                        asset['duration'] = frame_count / fps
                    cap.release()
                except: pass

            elif asset_type == 'image':
                thumb_url = generate_image_thumbnail(full_path, asset_id)
                if thumb_url: asset['thumbnailUrl'] = thumb_url
                
            new_assets.append(asset)

    data['assets'] = new_assets

    with open(SNAPSHOT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Reconciliation successful. Total assets: {len(new_assets)}")

if __name__ == "__main__":
    reconcile()
