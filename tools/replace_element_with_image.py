
import json
import os

SNAPSHOT_PATH = os.path.join(os.getcwd(), "ai_workspace", "project-snapshot.json")
TARGET_ELEMENT_ID = "df570d75-7ee3-4a53-92d1-d27ab59697d3"

# Asset ID for 'AI还原纪录片-封面.jpg' found in previous view_file
TARGET_ASSET_ID = "asset_918155" 
TARGET_ASSET_NAME = "AI还原纪录片-封面.jpg"

def replace_with_image():
    if not os.path.exists(SNAPSHOT_PATH):
        print(f"Error: Snapshot not found at {SNAPSHOT_PATH}")
        return

    try:
        with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
            snapshot = json.load(f)
    except Exception as e:
        print(f"Error reading snapshot: {e}")
        return

    tracks = snapshot.get("tracks", [])
    assets = snapshot.get("assets", [])

    # Verify asset exists
    asset = next((a for a in assets if a["id"] == TARGET_ASSET_ID), None)
    if not asset:
        print(f"Warning: Asset {TARGET_ASSET_ID} not found in snapshot. Using it anyway but strictly it should be there.")
    
    found = False
    for track in tracks:
        if "elements" in track:
            for el in track["elements"]:
                if el["id"] == TARGET_ELEMENT_ID:
                    print(f"Found element {el['name']} ({el['id']}). Replacing with image...")
                    
                    # Update fields
                    el["mediaId"] = TARGET_ASSET_ID
                    el["name"] = TARGET_ASSET_NAME
                    # Keep duration and startTime to maintain timeline integrity
                    # Reset trim since images don't usually have trim
                    el["trimStart"] = 0
                    el["trimEnd"] = 0
                    
                    found = True
                    break
        if found: break

    if found:
        try:
            with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, indent=2, ensure_ascii=False)
            print("Successfully replaced element with test image.")
        except Exception as e:
            print(f"Error saving snapshot: {e}")
    else:
        print(f"Element with ID {TARGET_ELEMENT_ID} not found.")

if __name__ == "__main__":
    replace_with_image()
