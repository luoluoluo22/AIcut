import json
import requests
import os
import uuid

API_URL = "http://localhost:3000/api/ai-edit"

def create_and_switch_project(new_name):
    new_id = f"proj_{str(uuid.uuid4())[:8]}"
    print(f"Creating and switching to new project: {new_name} ({new_id})")
    
    # 构建一个空的项目快照
    new_snapshot = {
        "project": {
            "id": new_id,
            "name": new_name,
            "fps": 30,
            "canvasSize": {"width": 1920, "height": 1080}
        },
        "tracks": [
            {
                "id": "track_1",
                "name": "Video Track",
                "type": "media",
                "isMain": True,
                "elements": []
            }
        ],
        "assets": []
    }
    
    payload = {
        "action": "updateSnapshot",
        "data": new_snapshot
    }
    
    try:
        res = requests.post(API_URL, json=payload)
        if res.status_code == 200:
            print(f"Successfully pushed new snapshot for {new_id}.")
            print("The editor should now automatically redirect to the new project URL.")
        else:
            print(f"Failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_and_switch_project("AI 自动生成的第二个项目")
