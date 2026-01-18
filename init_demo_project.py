import sys
import os

# Add SDK path
sdk_dir = os.path.join(os.getcwd(), ".agent", "skills", "aicut-editing", "scripts")
sys.path.append(sdk_dir)

from aicut_sdk import AIcutClient
import uuid

def init_project(project_id, project_name):
    client = AIcutClient()
    
    # Get current snapshot as template
    try:
        snapshot = client.get_snapshot()
    except:
        snapshot = {}
    
    # Initialize basic project structure
    snapshot["project"] = {
        "id": project_id,
        "name": project_name,
        "createdAt": "2026-01-18T10:00:00.000Z",
        "updatedAt": "2026-01-18T10:00:00.000Z",
        "fps": 30,
        "canvasSize": {"width": 1920, "height": 1080},
        "backgroundType": "color",
        "backgroundColor": "#000000"
    }
    snapshot["tracks"] = [
        {"id": "main-track", "name": "Main Track", "type": "media", "elements": [], "isMain": True},
        {"id": "text-track", "name": "Text Track", "type": "text", "elements": []},
        {"id": "audio-track", "name": "Audio Track", "type": "audio", "elements": []}
    ]
    snapshot["assets"] = []
    
    # Update snapshot
    client.update_snapshot(snapshot)
    print(f"✅ Initialized project snapshot with ID: {project_id}")
    
    # Archive it
    client.archive_project(project_id)
    print(f"💾 Archived project: {project_name}")

if __name__ == "__main__":
    init_project("demo", "demo")
