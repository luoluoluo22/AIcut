
import json
import os
import time

SNAPSHOT_PATH = os.path.join(os.getcwd(), "ai_workspace", "project-snapshot.json")
IMAGE_REL_PATH = "/materials/images/panda_test.jpg"
IMAGE_ABS_PATH = os.path.join(os.getcwd(), "AIcut-Studio", "apps", "web", "public", "materials", "images", "panda_test.jpg")
ASSET_ID = "asset_panda_gen_" + str(int(time.time()))
ASSET_NAME = "panda_test.jpg"

TARGET_START = 10.180
TARGET_DURATION = 3.860

def replace_panda():
    if not os.path.exists(SNAPSHOT_PATH):
        print(f"Error: Snapshot not found at {SNAPSHOT_PATH}")
        return

    try:
        with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
            snapshot = json.load(f)
    except Exception as e:
        print(f"Error reading snapshot: {e}")
        return

    # 1. Register Asset
    assets = snapshot.get("assets", [])
    
    # Check if asset already exists (by url) to avoid duplicates
    existing_asset = next((a for a in assets if a.get("url") == IMAGE_REL_PATH), None)
    
    if existing_asset:
        final_asset_id = existing_asset["id"]
        print(f"Asset already exists with ID: {final_asset_id}")
    else:
        final_asset_id = ASSET_ID
        new_asset = {
            "id": final_asset_id,
            "name": ASSET_NAME,
            "type": "image",
            "url": IMAGE_REL_PATH,
            "filePath": IMAGE_ABS_PATH,  # Optional but good for Electron
            "width": 1024, # Flux default
            "height": 576
        }
        assets.append(new_asset)
        print(f"Registered new asset: {ASSET_NAME}")

    # 2. Find and Replace Element
    tracks = snapshot.get("tracks", [])
    found = False
    
    for track in tracks:
        if "elements" in track:
            for el in track["elements"]:
                # Match by approximate time
                if abs(el.get("startTime", 0) - TARGET_START) < 0.01:
                    print(f"Found match at {el['startTime']}s. Replacing...")
                    el["mediaId"] = final_asset_id
                    el["name"] = ASSET_NAME
                    # Reset trims for image
                    el["trimStart"] = 0
                    el["trimEnd"] = 0
                    found = True
    
    if found:
        try:
            with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, indent=2, ensure_ascii=False)
            print("Successfully replaced element with Panda image.")
        except Exception as e:
            print(f"Error saving snapshot: {e}")
    else:
        print(f"No element found at {TARGET_START}s to replace.")

if __name__ == "__main__":
    replace_panda()
