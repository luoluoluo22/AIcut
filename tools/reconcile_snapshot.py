import json
import os
import uuid

# Define base paths
WORKSPACE_ROOT = r"f:\桌面\开发\AIcut"
SNAPSHOT_PATH = os.path.join(WORKSPACE_ROOT, ".aicut", "project-snapshot.json")
MATERIALS_PUBLIC_DIR = os.path.join(WORKSPACE_ROOT, "AIcut-Studio", "apps/web/public/materials/ai-generated")
MATERIALS_LOCAL_DIR = os.path.join(WORKSPACE_ROOT, "materials", "snapshot_demo")

def fix_snapshot():
    if not os.path.exists(SNAPSHOT_PATH):
        print(f"Snapshot not found at {SNAPSHOT_PATH}")
        return

    with open(SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Update project basic info
    data['project']['name'] = "AIcut Local Project"
    
    # 2. Re-scan assets
    new_assets = []
    asset_map = {} # filename -> asset_id

    # Scan public materials
    if os.path.exists(MATERIALS_PUBLIC_DIR):
        for filename in os.listdir(MATERIALS_PUBLIC_DIR):
            if filename.startswith('.'): continue
            ext = os.path.splitext(filename)[1].lower()
            asset_type = "video" if ext in ['.mp4', '.mov'] else "image" if ext in ['.png', '.jpg', '.jpeg'] else "audio" if ext in ['.mp3', '.wav'] else "other"
            
            asset_id = str(uuid.uuid4())
            url = f"/materials/ai-generated/{filename}"
            
            asset_entry = {
                "id": asset_id,
                "name": filename,
                "type": asset_type,
                "url": url,
                "filePath": os.path.join(MATERIALS_PUBLIC_DIR, filename)
            }
            new_assets.append(asset_entry)
            asset_map[filename] = asset_id

    # Scan local materials (scene_cyber etc)
    # We'll map these to specific IDs if they match keywords
    local_images = os.path.join(MATERIALS_LOCAL_DIR, "images")
    if os.path.exists(local_images):
        for filename in os.listdir(local_images):
            asset_id = str(uuid.uuid4())
            # For local materials not in public/ yet, we might need a placeholder or actual path
            # But let's assume if they are in public/ we use those.
            # If not, we'll use the local path (Electron can handle it)
            asset_entry = {
                "id": asset_id,
                "name": filename,
                "type": "image",
                "filePath": os.path.join(local_images, filename)
            }
            new_assets.append(asset_entry)
            asset_map[filename] = asset_id

    data['assets'] = new_assets

    # 3. Fix tracks
    # We need to map 'asset_scene_cyber_img' to a real file
    # Based on the user's files:
    # f:\桌面\开发\AIcut\AIcut-Studio\apps\web\public\materials\ai-generated\ai_gen_1768485094370.jpg
    # f:\桌面\开发\AIcut\AIcut-Studio\apps\web\public\materials\ai-generated\ai_gen_1768486131632.jpg
    
    # Let's find best matches
    cyber_img_id = asset_map.get("ai_gen_1768485094370.jpg") or asset_map.get("scene_cyber.png")
    bamboo_img_id = asset_map.get("ai_gen_1768486131632.jpg") or asset_map.get("scene_bamboo.png")
    
    # Try to find the grok video too
    grok_video_id = asset_map.get("grok_video_27146.mp4")

    for track in data.get('tracks', []):
        for element in track.get('elements', []):
            if element.get('type') == 'media':
                old_id = element.get('mediaId')
                if old_id == 'asset_scene_cyber_img' and cyber_img_id:
                    element['mediaId'] = cyber_img_id
                    element['name'] = "Cyber Scene"
                elif old_id == 'asset_scene_bamboo_img' and bamboo_img_id:
                    element['mediaId'] = bamboo_img_id
                    element['name'] = "Bamboo Scene"
                elif old_id == 'asset_scene_cyber_aud':
                    # Look for v1.mp3 or similar
                    aud_id = asset_map.get("v1.mp3") or asset_map.get("scene_cyber.mp3")
                    if aud_id: element['mediaId'] = aud_id
                elif old_id == 'asset_scene_bamboo_aud':
                    aud_id = asset_map.get("v2.mp3") or asset_map.get("scene_bamboo.mp3")
                    if aud_id: element['mediaId'] = aud_id
                
                # If we have a grok video and it's a video track, maybe replace one?
                # Or just ensure valid references
                if element.get('mediaId') not in [a['id'] for a in new_assets]:
                    print(f"Warning: mediaId {element.get('mediaId')} in track {track['id']} is still broken")

    # 4. Save
    with open(SNAPSHOT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Snapshot updated successfully at {SNAPSHOT_PATH}")
    print(f"Found {len(new_assets)} assets.")

if __name__ == "__main__":
    fix_snapshot()
