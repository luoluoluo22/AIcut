import json
import os
import uuid

# Paths
SNAPSHOT_PATH = r"f:\桌面\开发\AIcut\.aicut\project-snapshot.json"
MATERIALS_DIR = r"f:\桌面\开发\AIcut\AIcut-Studio\apps\web\public\materials\ai-generated"

def fix():
    if not os.path.exists(SNAPSHOT_PATH): return

    with open(SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Assets mapping
    # ai_gen_1768485094370.jpg (Cyber)
    # ai_gen_1768486131632.jpg (Bamboo)
    # grok_video_27146.mp4
    # v1.mp3 (Cyber Aud)
    # v2.mp3 (Bamboo Aud)

    files = os.listdir(MATERIALS_DIR) if os.path.exists(MATERIALS_DIR) else []
    
    # Generate mapping and assets list
    new_assets = []
    
    # Pre-defined mapping for consistency
    mapping = {
        "ai_gen_1768485094370.jpg": {"name": "赛博街道-背景图", "id": "asset_cyber_img"},
        "ai_gen_1768486131632.jpg": {"name": "竹林深处-背景图", "id": "asset_bamboo_img"},
        "grok_video_27146.mp4": {"name": "Grok-赛博视频", "id": "asset_grok_v1"},
        "v1.mp3": {"name": "语音-赛博街道", "id": "asset_cyber_aud"},
        "v2.mp3": {"name": "语音-竹林深处", "id": "asset_bamboo_aud"},
    }

    processed_ids = set()

    for filename in files:
        if filename in mapping:
            info = mapping[filename]
            asset = {
                "id": info['id'],
                "name": info['name'],
                "type": "video" if filename.endswith('.mp4') else "image" if filename.endswith('.jpg') else "audio",
                "url": f"/materials/ai-generated/{filename}",
                "filePath": os.path.join(MATERIALS_DIR, filename)
            }
            new_assets.append(asset)
            processed_ids.add(info['id'])
        else:
            # Handle other files
            asset_id = "asset_" + str(uuid.uuid4())[:8]
            asset = {
                "id": asset_id,
                "name": filename,
                "type": "video" if filename.endswith('.mp4') else "image" if filename.endswith(('.jpg', '.png')) else "audio",
                "url": f"/materials/ai-generated/{filename}",
                "filePath": os.path.join(MATERIALS_DIR, filename)
            }
            new_assets.append(asset)

    data['assets'] = new_assets

    # Update tracks to use these IDs
    for track in data.get('tracks', []):
        for element in track.get('elements', []):
            if element.get('type') == 'media':
                name = element.get('name', '').lower()
                if "cyber" in name:
                    if track['type'] == 'media': element['mediaId'] = "asset_cyber_img"
                    elif track['type'] == 'audio': element['mediaId'] = "asset_cyber_aud"
                elif "bamboo" in name:
                    if track['type'] == 'media': element['mediaId'] = "asset_bamboo_img"
                    elif track['type'] == 'audio': element['mediaId'] = "asset_bamboo_aud"
                
                # Double check mediaId exists in assets
                valid_ids = [a['id'] for a in new_assets]
                if element.get('mediaId') not in valid_ids:
                    # Fallback to a random valid asset of same type if possible
                    same_type = [a['id'] for a in new_assets if a['type'] == track['type']]
                    if same_type:
                        element['mediaId'] = same_type[0]

    with open(SNAPSHOT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Fixed.")

if __name__ == "__main__":
    fix()
