import json
import os
import time

SNAPSHOT_PATH = r"f:\桌面\开发\AIcut\ai_workspace\project-snapshot.json"

def main():
    print(f"Reading snapshot from {SNAPSHOT_PATH}...")
    
    with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    # 1. Add Asset
    new_asset = {
        "id": "asset_panda_bamboo",
        "name": "panda_bamboo.png",
        "type": "image",
        "url": "/materials/images/panda_bamboo.png",
        "duration": 2.74
    }
    
    # Check if asset exists
    existing_asset = next((a for a in data.get("assets", []) if a["id"] == new_asset["id"]), None)
    if not existing_asset:
        if "assets" not in data:
            data["assets"] = []
        data["assets"].append(new_asset)
        print("Added asset: panda_bamboo.png")
    else:
        print("Asset already exists.")

    # 2. Add Element to Track
    # Find main track
    track_id = "track_main"
    tracks = data.get("tracks", [])
    target_track = next((t for t in tracks if t["id"] == track_id), None)
    
    if not target_track:
        print(f"Track {track_id} not found!")
        return

    new_element = {
        "id": "el_panda_" + str(int(time.time())),
        "type": "media",
        "mediaId": "asset_panda_bamboo",
        "name": "panda_bamboo.png",
        "url": "/materials/images/panda_bamboo.png",
        "startTime": 3.380,
        "duration": 2.740,
        "trimStart": 0,
        "trimEnd": 0,
        "muted": False,
        "volume": 1.0,
        "x": 0.5,
        "y": 0.5,
        "scale": 1,
        "rotation": 0,
        "opacity": 1
    }
    
    # Check if we should clear existing elements? User didn't say so, but usually we append.
    # But let's check for overlap roughly or just append.
    target_track["elements"].append(new_element)
    print(f"Added element to {track_id} at {new_element['startTime']}s")

    # 3. Save
    print("Saving snapshot...")
    with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print("Done! The editor should hot-reload now.")

if __name__ == "__main__":
    main()
