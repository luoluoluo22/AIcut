
import json
import time
import os

SNAPSHOT_PATH = os.path.join(os.getcwd(), "ai_workspace", "project-snapshot.json")

def add_subtitle():
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

    # Check if a text track already exists
    text_track = next((t for t in tracks if t.get("type") == "text"), None)

    if not text_track:
        text_track = {
            "id": f"track_text_{int(time.time())}",
            "name": "Subtitles",
            "type": "text",
            "isMain": False,
            "elements": []
        }
        tracks.append(text_track)
        print("Created new text track.")
    else:
        print("Using existing text track.")
        # Clear existing elements for this test to avoid duplicates/confusion
        text_track["elements"] = []

    # Create new text element with CORRECT fields
    new_element = {
        "id": f"el_text_{int(time.time())}",
        "type": "text",
        "name": "Subtitle 1",
        "content": "这是一个测试字幕", # Fixed: text -> content
        "startTime": 0,
        "duration": 3,
        "x": 0, # Relative to center? Type def says "relative to canvas center", usually means offset from center. Let's try 0,0 first.
        "y": 400, # Positive Y is down. 400 pixels down from center (540) = 940px (near bottom)
        "width": 800, # Required by BaseTimelineElement? Not in interface but maybe good to have?
        "height": 100,
        "scale": 1, 
        "rotation": 0,
        "opacity": 1,
        
        # Text Specific Styles
        "fontSize": 60,
        "fontFamily": "Inter",
        "color": "#ffffff",
        "backgroundColor": "transparent",
        "textAlign": "center",
        "fontWeight": "bold",
        "fontStyle": "normal",
        "textDecoration": "none",
        
        "trimStart": 0,
        "trimEnd": 0
    }

    text_track["elements"].append(new_element)
    print(f"Added text element: {new_element['content']}")

    # Save back
    try:
        with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, ensure_ascii=False)
        print("Snapshot updated successfully.")
    except Exception as e:
        print(f"Error saving snapshot: {e}")

if __name__ == "__main__":
    add_subtitle()
