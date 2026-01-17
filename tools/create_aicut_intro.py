
import asyncio
import os
import json
import sys
import time
from pathlib import Path

# Add tools to path
sys.path.append(os.path.join(os.getcwd(), "tools"))
from generators.flux_api import generate_image_flux
import edge_tts

# Configuration
PROJECT_ROOT = os.getcwd()
SNAPSHOT_PATH = os.path.join(PROJECT_ROOT, "ai_workspace", "project-snapshot.json")
ASSETS_DIR = os.path.join(PROJECT_ROOT, "AIcut-Studio", "apps", "web", "public", "materials", "generated_intro")
AUDIO_DIR = os.path.join(ASSETS_DIR, "audio")
IMAGES_DIR = os.path.join(ASSETS_DIR, "images")

# Ensure directories exist
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

# Script Content
SCRIPT_CONTENT = [
    {
        "text": "欢迎来到 AIcut，这是一个革命性的 AI 视频剪辑引擎。",
        "prompt": "Futuristic high-tech video editing timeline interface, glowing neon blue and purple interactface, cyberpunk style, 8k resolution, cinematic lighting",
        "duration_est": 4.0
    },
    {
        "text": "它完美结合了前端的交互体验与后端的 Python 逻辑。",
        "prompt": "A split screen concept art, left side is modern ui, right side is clean python code, connecting via glowing data cables, 3d render, high quality",
        "duration_est": 5.0
    },
    {
        "text": "你只需编写简单的脚本，即可全自动生成复杂的视频内容。",
        "prompt": "A robot hand typing on a mechanical keyboard, generating video streams from the monitor, magic particles, macro shot, depth of field",
        "duration_est": 5.0
    },
    {
        "text": "释放你的双手，让创意通过代码自由飞翔！",
        "prompt": "A golden bird made of digital data flying out of a computer screen into the galaxy, epic scene, dreamlike, 8k",
        "duration_est": 4.0
    }
]

async def generate_assets():
    print("🚀 Starting AI Asset Generation...")
    
    generated_assets = []
    
    for i, item in enumerate(SCRIPT_CONTENT):
        print(f"\n--- Processing Segment {i+1} ---")
        
        # 1. Generate Image (Flux)
        image_filename = f"intro_img_{i}.jpg"
        image_abs_path = os.path.join(IMAGES_DIR, image_filename)
        image_rel_url = f"/materials/generated_intro/images/{image_filename}"
        
        if not os.path.exists(image_abs_path):
            print(f"🎨 Generating Image: {item['prompt'][:30]}...")
            success = generate_image_flux(item["prompt"], image_abs_path)
            if not success:
                print("❌ Image generation failed, pushing placeholder or skipping.")
                # We'll rely on error handling or existing files
        else:
            print(f"⏭️ Image exists: {image_filename}")

        # 2. Generate Audio (Edge TTS)
        audio_filename = f"intro_voice_{i}.mp3"
        audio_abs_path = os.path.join(AUDIO_DIR, audio_filename)
        audio_rel_url = f"/materials/generated_intro/audio/{audio_filename}"
        
        if not os.path.exists(audio_abs_path):
            print(f"🎙️ Generating Audio: {item['text'][:20]}...")
            communicate = edge_tts.Communicate(item["text"], "zh-CN-YunxiNeural")
            await communicate.save(audio_abs_path)
        else:
            print(f"⏭️ Audio exists: {audio_filename}")
            
        # Store for timeline
        generated_assets.append({
            "image_path": image_abs_path,
            "image_url": image_rel_url,
            "audio_path": audio_abs_path,
            "audio_url": audio_rel_url,
            "text": item["text"],
            "base_duration": item["duration_est"] # Will be updated by actual audio if possible
        })
        
    return generated_assets

def update_timeline(assets_data):
    print("\n📝 Updating Project Timeline...")
    
    try:
        with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
            snapshot = json.load(f)
    except Exception as e:
        print(f"❌ Error reading snapshot: {e}")
        return

    # Clear existing tracks completely for a fresh "Full Edit"
    snapshot["tracks"] = []
    snapshot["assets"] = [] # We will re-register only what we use, or append? 
    # Let's keep existing assets in 'assets' list to be safe, but rebuild tracks.
    # Actually, let's just append our new assets to 'assets'
    
    current_assets = snapshot.get("assets", [])
    
    # Create Tracks
    track_video = {"id": "track_main", "name": "Video", "type": "media", "isMain": True, "elements": []}
    track_voice = {"id": "track_voice", "name": "Voiceover", "type": "media", "isMain": False, "elements": []}
    track_subs = {"id": "track_subs", "name": "Subtitles", "type": "text", "isMain": False, "elements": []}
    
    current_time = 0.0
    
    for i, data in enumerate(assets_data):
        # 1. Register Assets
        img_id = f"asset_intro_img_{i}_{int(time.time())}"
        audio_id = f"asset_intro_voice_{i}_{int(time.time())}"
        
        # Add Image Asset
        current_assets.append({
            "id": img_id,
            "name": f"Intro Image {i}",
            "type": "image",
            "url": data["image_url"],
            "filePath": data["image_path"],
            "width": 1024,
            "height": 576,
            "duration": 5 # Default
        })
        
        # Add Audio Asset
        current_assets.append({
            "id": audio_id,
            "name": f"Intro Voice {i}",
            "type": "audio",
            "url": data["audio_url"],
            "filePath": data["audio_path"],
            "duration": data["base_duration"] # Approximation
        })
        
        # Duration Logic: Use estimated duration (since we can't easily probe mp3 length without extra libs here)
        # In a real app, we'd read the file header.
        seg_duration = data["base_duration"]
        
        # 2. Add Video/Image Element
        track_video["elements"].append({
            "id": f"el_vid_{i}_{int(time.time())}",
            "type": "media",
            "mediaId": img_id,
            "name": f"Scene {i}",
            "startTime": current_time,
            "duration": seg_duration,
            "x": 960, "y": 540,
            "scale": 1, "opacity": 1, "rotation": 0,
            "trimStart": 0, "trimEnd": 0,
            "muted": True
        })
        
        # 3. Add Voice Element
        track_voice["elements"].append({
            "id": f"el_voice_{i}_{int(time.time())}",
            "type": "media",
            "mediaId": audio_id,
            "name": f"Voice {i}",
            "startTime": current_time,
            "duration": seg_duration,
            "x": 0, "y": 0,
            "scale": 1, "opacity": 1, "rotation": 0,
            "trimStart": 0, "trimEnd": 0,
            "volume": 1.0,
            "muted": False
        })
        
        # 4. Add Subtitle Element
        track_subs["elements"].append({
            "id": f"el_sub_{i}_{int(time.time())}",
            "type": "text",
            "name": f"Sub {i}",
            "content": data["text"],
            "startTime": current_time,
            "duration": seg_duration,
            "x": 0, "y": 450, # Bottom
            "width": 1000, "height": 100,
            "scale": 1, "rotation": 0, "opacity": 1,
            "fontSize": 50,
            "fontFamily": "Inter",
            "color": "#ffffff",
            "backgroundColor": "rgba(0,0,0,0.5)",
            "textAlign": "center",
            "fontWeight": "bold",
            "fontStyle": "normal",
            "textDecoration": "none",
            "trimStart": 0, "trimEnd": 0
        })
        
        current_time += seg_duration

    snapshot["assets"] = current_assets
    snapshot["tracks"] = [track_subs, track_voice, track_video] # Text on top
    snapshot["project"]["duration"] = current_time
    
    # Save
    with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)
    
    print("✅ Project snapshot updated successfully!")

if __name__ == "__main__":
    assets = asyncio.run(generate_assets())
    update_timeline(assets)
