import json
import os
import uuid

# Configuration
SNAPSHOT_PATH = r"f:\桌面\开发\AIcut\.aicut\project-snapshot.json"
MATERIALS_DIR = r"f:\桌面\开发\AIcut\AIcut-Studio\apps\web\public\materials"

def fix():
    if not os.path.exists(SNAPSHOT_PATH):
        print("Snapshot not found.")
        return

    with open(SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Scan physical files
    files = os.listdir(MATERIALS_DIR) if os.path.exists(MATERIALS_DIR) else []
    print(f"Physical files found: {files}")

    # 2. Build Assets List from disk (Link-only mode)
    new_assets = []
    asset_id_map = {} # filename -> id
    
    # Mapping for predefined items
    predefined = {
        "v1.mp3": ("asset_cyber_aud", "语音-赛博街道"),
        "v2.mp3": ("asset_bamboo_aud", "语音-竹林深处"),
        "scene_cyber.png": ("asset_cyber_img", "赛博-背景图"),
        "scene_bamboo.png": ("asset_bamboo_img", "竹林-背景图"),
        "grok_video_27146.mp4": ("asset_grok_v1", "Grok-赛博视频"),
    }

    for filename in files:
        if filename.startswith('.'): continue
        
        ext = os.path.splitext(filename)[1].lower()
        if ext in ['.mp4', '.mov']: med_type = 'video'
        elif ext in ['.mp3', '.wav']: med_type = 'audio'
        else: med_type = 'image'

        if filename in predefined:
            aid, name = predefined[filename]
        else:
            aid = f"asset_{uuid.uuid4().hex[:8]}"
            name = filename

        asset_id_map[filename] = aid
        new_assets.append({
            "id": aid,
            "name": name,
            "type": med_type,
            "url": f"/materials/{filename}",
            "filePath": os.path.join(MATERIALS_DIR, filename),
            "isLinked": True
        })

    # Update data
    data['assets'] = new_assets
    valid_ids = {a['id'] for a in new_assets}

    # 3. Clean up Tracks (Remove elements with missing media)
    for track in data.get('tracks', []):
        new_elements = []
        for el in track.get('elements', []):
            if el.get('type') == 'media':
                mid = el.get('mediaId')
                # Try to fix by name if ID is old UUID/IndexedDB ID
                el_name = el.get('name', '').lower()
                
                # Check if current mid is already valid
                if mid in valid_ids:
                    new_elements.append(el)
                    continue

                # Auto-fix specific scenes
                target_id = None
                if "cyber" in el_name:
                    target_id = "asset_cyber_img" if track['type'] == 'media' else "asset_cyber_aud"
                elif "bamboo" in el_name:
                    target_id = "asset_bamboo_img" if track['type'] == 'media' else "asset_bamboo_aud"
                
                if target_id and target_id in valid_ids:
                    el['mediaId'] = target_id
                    new_elements.append(el)
                else:
                    print(f"Removing element {el.get('name')} - media not found on disk.")
            else:
                new_elements.append(el)
        track['elements'] = new_elements

    # Save
    with open(SNAPSHOT_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"Reconciliation complete. Snapshot updated with {len(new_assets)} local assets.")

if __name__ == "__main__":
    fix()
