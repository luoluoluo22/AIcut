
import json
import os
import time

SNAPSHOT_PATH = os.path.join(os.getcwd(), "ai_workspace", "project-snapshot.json")

# Information from user request
RANGE_START = 10.180
RANGE_END = 14.040
DURATION = 3.860
TRACK_ID = "track_main"

# Asset to use (reusing the cover image)
ASSET_ID = "asset_918155"
ASSET_NAME = "AI还原纪录片-封面.jpg"

def insert_image_at_markers():
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

    # Find the target track
    target_track = next((t for t in tracks if t.get("id") == TRACK_ID), None)
    if not target_track:
        # Fallback to main track if track_main not found by ID (though it should be)
        print(f"Track {TRACK_ID} not found, searching for main track...")
        target_track = next((t for t in tracks if t.get("isMain")), None)
    
    if not target_track:
        print("Error: No suitable track found.")
        return

    print(f"Using track: {target_track.get('name')} ({target_track.get('id')})")

    # Create new element
    new_element = {
        "id": f"el_img_{int(time.time())}",
        "type": "media",
        "mediaId": ASSET_ID,
        "name": ASSET_NAME,
        "startTime": RANGE_START,
        "duration": DURATION,
        "trimStart": 0,
        "trimEnd": 0,
        "muted": False,
        "x": 960,
        "y": 540,
        "scale": 1,
        "rotation": 0,
        "opacity": 1,
        "volume": 0 # Images don't have volume but keeping schema consistent
    }

    # Append to elements
    if "elements" not in target_track:
        target_track["elements"] = []
    
    target_track["elements"].append(new_element)

    # Optional: Sort elements by startTime
    target_track["elements"].sort(key=lambda x: x["startTime"])

    print(f"Inserted image '{ASSET_NAME}' at {RANGE_START}s (Duration: {DURATION}s)")

    # Save back
    try:
        with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, ensure_ascii=False)
        print("Snapshot updated successfully.")
    except Exception as e:
        print(f"Error saving snapshot: {e}")

if __name__ == "__main__":
    insert_image_at_markers()
