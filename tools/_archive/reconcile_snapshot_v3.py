import json
import os
import uuid

# Paths
SNAPSHOT_PATH = r"f:\桌面\开发\AIcut\.aicut\project-snapshot.json"
BASE_MATERIALS_DIR = r"f:\桌面\开发\AIcut\AIcut-Studio\apps\web\public\materials"

def get_asset_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.mp4', '.mov', '.webm']: return 'video'
    if ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']: return 'image'
    if ext in ['.mp3', '.wav', '.ogg', '.m4a']: return 'audio'
    return 'other'

def fix():
    if not os.path.exists(SNAPSHOT_PATH): return

    with open(SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Assets mapping
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
    }

    new_assets = []
    
    # Recursively find all files in public/materials
    for root, dirs, files in os.walk(BASE_MATERIALS_DIR):
        for filename in files:
            if filename.startswith('.'): continue
            
            full_path = os.path.join(root, filename)
            # Calculate relative URL
            rel_path = os.path.relpath(full_path, os.path.join(BASE_MATERIALS_DIR, "..", ".."))
            # The public folder is the root for URLs
            # F:\... \public\materials\... -> /materials/...
            url_path = "/materials" + full_path.split("public\\materials")[1].replace("\\", "/")
            
            asset_type = get_asset_type(filename)
            
            if filename in mapping:
                info = mapping[filename]
                asset = {
                    "id": info['id'],
                    "name": info['name'],
                    "type": asset_type,
                    "url": url_path,
                    "filePath": full_path
                }
            else:
                asset_id = "asset_" + str(uuid.uuid4())[:8]
                asset = {
                    "id": asset_id,
                    "name": filename,
                    "type": asset_type,
                    "url": url_path,
                    "filePath": full_path
                }
            new_assets.append(asset)

    data['assets'] = new_assets

    # Update tracks to use these IDs
    asset_ids = {a['id'] for a in new_assets}
    
    for track in data.get('tracks', []):
        for element in track.get('elements', []):
            if element.get('type') == 'media':
                # Preserve valid IDs, fix invalid ones
                curr_id = element.get('mediaId')
                if curr_id not in asset_ids:
                    # Try to fix based on name
                    name = element.get('name', '').lower()
                    if "cyber" in name:
                        if track['type'] == 'media': element['mediaId'] = "asset_cyber_img"
                        elif track['type'] == 'audio': element['mediaId'] = "asset_cyber_aud"
                    elif "bamboo" in name:
                        if track['type'] == 'media': element['mediaId'] = "asset_bamboo_img"
                        elif track['type'] == 'audio': element['mediaId'] = "asset_bamboo_aud"
                    
                    # Final check
                    if element.get('mediaId') not in asset_ids:
                        same_type = [a['id'] for a in new_assets if a['type'] == track['type']]
                        if same_type: element['mediaId'] = same_type[0]

    with open(SNAPSHOT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Fixed. Found {len(new_assets)} assets.")

if __name__ == "__main__":
    fix()
