import json
import requests
import os
import time

# 配置
API_URL = "http://localhost:3000/api/ai-edit"
SNAPSHOT_PATH = os.path.join(os.path.dirname(__file__), "../ai_workspace/project-snapshot.json")
NEW_IMAGE_NAME = "new_generated_scene.png"
# 注意：这里需要填写真实的绝对路径，或者是相对于前端 public 目录的路径映射
# 根据之前的 snapshot，filePath 是绝对路径
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
NEW_IMAGE_PATH = os.path.join(PROJECT_ROOT, "AIcut-Studio", "apps", "web", "public", "materials", NEW_IMAGE_NAME)
NEW_IMAGE_URL = f"/materials/{NEW_IMAGE_NAME}"

def add_image_to_timeline():
    print(f"Reading snapshot from: {SNAPSHOT_PATH}")
    
    if not os.path.exists(SNAPSHOT_PATH):
        print("Error: Snapshot file not found!")
        return

    with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
        snapshot = json.load(f)

    assets = snapshot.get("assets", [])
    tracks = snapshot.get("tracks", [])
    
    # 1. 注册新素材 (Assets Registration)
    # 检查是否已存在
    existing_asset = next((a for a in assets if a["name"] == NEW_IMAGE_NAME), None)
    
    if existing_asset:
        new_asset_id = existing_asset["id"]
        print(f"Asset already exists: {new_asset_id}")
    else:
        new_asset_id = f"asset_gen_{int(time.time())}"
        new_asset = {
            "id": new_asset_id,
            "name": NEW_IMAGE_NAME,
            "type": "image",
            "url": NEW_IMAGE_URL,
            "filePath": NEW_IMAGE_PATH,
            "isLinked": True,
            "width": 1920, # 假设尺寸，最好真实获取，但演示暂且固定
            "height": 1080
        }
        assets.append(new_asset)
        print(f"Registered new asset: {new_asset_id}")

    # 2. 修改时间轴 (Timeline Sequencing)
    # 找到主视频轨
    main_track = next((t for t in tracks if t.get("isMain") or t.get("type") == "media"), None)
    
    if not main_track:
        print("Error: Main track not found")
        return

    # 计算插入时间：放在最后
    last_element_end = 0
    if main_track["elements"]:
        last_el = main_track["elements"][-1]
        last_element_end = last_el["startTime"] + last_el["duration"] - last_el.get("trimEnd", 0) - last_el.get("trimStart", 0)
    
    # 插入新元素
    new_element = {
        "id": f"el_gen_{int(time.time())}",
        "type": "media",
        "mediaId": new_asset_id,
        "name": "Generated Image",
        "startTime": last_element_end,
        "duration": 3,
        "trimStart": 0,
        "trimEnd": 0,
        "opacity": 1,
        "volume": 1,
        "x": 960, "y": 540, "scale": 1, "rotation": 0 # 居中
    }
    main_track["elements"].append(new_element)
    print(f"Added element to track at {last_element_end}s")

    # 3. 提交更新 (Commit Changes)
    # 我们使用 updateSnapshot 来同时更新 assets 和 tracks
    # 注意：我们的后端 API 已经升级为 Smart Merge，所以即使我们发送了 assets，它也会合并。
    # 但为了确保新素材从前端也能看到，我们需要显式地把包含新 asset 的完整列表发过去。
    
    payload = {
        "action": "updateSnapshot",
        "data": {
            "project": snapshot.get("project"),
            "tracks": tracks,
            "assets": assets 
        }
    }

    print("Sending update to AIcut...")
    try:
        res = requests.post(API_URL, json=payload)
        if res.status_code == 200:
            print("Success! Image added to timeline.")
        else:
            print(f"Failed: {res.status_code} - {res.text}")
            
        # 额外触发一次 setFullState 以确保时间轴刷新（双保险）
        # requests.post(API_URL, json={"action": "setFullState", "data": {"tracks": tracks}})
        
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    add_image_to_timeline()
