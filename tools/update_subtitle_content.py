
import json
import os

SNAPSHOT_PATH = os.path.join(os.getcwd(), "ai_workspace", "project-snapshot.json")
TARGET_ELEMENT_ID = "el_sub_1_1768615606"
NEW_CONTENT = "你好"

def update_subtitle_content():
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
    found = False

    for track in tracks:
        if "elements" in track:
            for el in track["elements"]:
                if el["id"] == TARGET_ELEMENT_ID:
                    print(f"Found subtitle element: {el['name']} ({el['id']})")
                    print(f"Old content: {el.get('content')}")
                    
                    # Update content
                    el["content"] = NEW_CONTENT
                    
                    print(f"New content: {NEW_CONTENT}")
                    found = True
                    break
        if found: break

    if found:
        try:
            with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, indent=2, ensure_ascii=False)
            print("Successfully updated subtitle content.")
        except Exception as e:
            print(f"Error saving snapshot: {e}")
    else:
        print(f"Subtitle element with ID {TARGET_ELEMENT_ID} not found.")

if __name__ == "__main__":
    update_subtitle_content()
