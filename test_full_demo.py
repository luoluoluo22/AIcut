
import sys
import os
import time
import uuid
import json

# Add tools/core to path for SDK
sys.path.append(os.path.join(os.getcwd(), "tools", "core"))

try:
    from aicut_sdk import AIcutClient
except ImportError:
    print("❌ Critical: Could not import aicut_sdk. Make sure tools/core/aicut_sdk.py exists.")
    sys.exit(1)

def run_full_demo():
    client = AIcutClient()

    # 1. Create Project Data
    pid = str(uuid.uuid4())
    name = f"Skill Demo {time.strftime('%H:%M:%S')}"
    scene_id = str(uuid.uuid4())
    
    print(f"🎬 Starting Skill-Compliant Demo Flow")
    print(f"📍 Project: {name} (ID: {pid})")

    # Follow schema from SKILL.md and recent user edits
    snapshot = {
        "project": {
            "id": pid,
            "name": name,
            "thumbnail": "",  # Empty string as per recent files
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "scenes": [{
                "id": scene_id,
                "name": "Main Scene",
                "isMain": True,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            }],
            "currentSceneId": scene_id,
            "backgroundColor": "#000000",
            "fps": 30,
            "canvasSize": {"width": 1920, "height": 1080},
            "canvasMode": "preset",
            "backgroundType": "color",
            "blurIntensity": 0,
            "markers": [],
            "bookmarks": []
        },
        "tracks": [
            # TEXT TRACK refers to SKILL Best Practices #5: "Text tracks normally go at index 0"
            {
                "id": str(uuid.uuid4()),
                "name": "Subtitles",
                "type": "text",
                "elements": [],
                "muted": False,
                "visible": True
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Main Track",
                "type": "media",
                "elements": [],
                "muted": False,
                "isMain": True,
                "visible": True
            }
        ],
        "assets": []
    }
    
    # 2. Init Project via API
    # Logic: 
    #   a. Archive current workspace (save whatever old project was there)
    #   b. Overwrite workspace with NEW snapshot (saveSnapshot)
    #   c. Archive NEW workspace (archiveProject with ID) to confirm registration
    
    print("🚀 Initializing project via API...")
    try:
        # a. Archive current
        client._post("archiveProject", {})
        
        # b. Save new snapshot
        client._post("saveSnapshot", snapshot)
        
        # c. Register/Archive new project
        client._post("archiveProject", {"projectId": pid})
        
        print("✅ Project Initialized in Backend.")
    except Exception as e:
        print(f"❌ Failed to init project: {e}")
        return

    print("⏳ Waiting 6 seconds for Frontend SSE sync...")
    time.sleep(6) 
    
    # 3. Add Subtitles via SDK (Strictly following Skill)
    print("📝 Adding Subtitles via SDK...")
    try:
        # These subtitles strictly follow the schema required by add_subtitles
        subs = [
            {"text": "Skill-Based Automation", "startTime": 0, "duration": 2},
            {"text": "Adding Text Track Explicitly", "startTime": 2.5, "duration": 2},
            {"text": "Strict adherence to constraints", "startTime": 5, "duration": 2}
        ]
        
        # The SDK uses the 'addMultipleSubtitles' action
        # Ensure Frontend processes this by putting it into pending edits
        client.add_subtitles(subs)
        print("✅ Subtitles request sent successfully.")
    except Exception as e:
        print(f"❌ Failed to add subtitles: {e}")

    print(f"🎉 Demo Complete! Project '{name}' created.")

if __name__ == "__main__":
    run_full_demo()
