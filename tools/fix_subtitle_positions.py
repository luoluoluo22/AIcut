
import json
import os

SNAPSHOT_PATH = os.path.join(os.getcwd(), "ai_workspace", "project-snapshot.json")

def fix_subtitle_positions():
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
    updated_count = 0

    # Locate subtitle track (type: text)
    for track in tracks:
        if track.get("type") == "text":
            for el in track.get("elements", []):
                # Update horizontal position to center (Absolute coordinates)
                el["x"] = 960 
                
                # Update vertical position to bottom (Absolute coordinates)
                # Canvas height is 1080. Text height is 100.
                # To place at bottom with some margin: 1080 - 50 (margin) - 100/2 (center anchor?) 
                # Assuming y is center of element or top-left? 
                # Video elements use 960, 540 which is exactly center.
                # So coordinates are likely center-based. 
                # To place center of text box at bottom:
                # y = 1080 - 50 (margin) - 50 (half height) = 980?
                # Let's try y=950 which was used successfully in previous test (before I broke it with y=450 in create_intro)
                el["y"] = 950 
                
                updated_count += 1
                
    if updated_count > 0:
        try:
            with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, indent=2, ensure_ascii=False)
            print(f"Successfully updated positions for {updated_count} subtitles.")
        except Exception as e:
            print(f"Error saving snapshot: {e}")
    else:
        print("No subtitle elements found to update.")

if __name__ == "__main__":
    fix_subtitle_positions()
