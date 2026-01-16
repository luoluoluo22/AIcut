import json
import requests
import os
import time

# 配置
API_URL = "http://localhost:3000/api/ai-edit"
SNAPSHOT_PATH = os.path.join(os.path.dirname(__file__), "../.aicut/project-snapshot.json")

def create_timeline():
    print(f"Reading snapshot from: {SNAPSHOT_PATH}")
    
    if not os.path.exists(SNAPSHOT_PATH):
        print("Error: Snapshot file not found!")
        return

    with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
        snapshot = json.load(f)

    assets = snapshot.get("assets", [])
    if not assets:
        print("Error: No assets found in snapshot!")
        return

    print(f"Found {len(assets)} assets.")

    # 1. 分类素材
    bgm_asset = next((a for a in assets if "AI还原纪录片.MP3" in a["name"]), None)
    cover_asset = next((a for a in assets if "封面" in a["name"]), None)
    
    # 过滤掉 BGM 和 封面，剩下的作为画面素材
    visual_assets = [
        a for a in assets 
        if a["type"] in ["video", "image"] 
        and a["id"] != (cover_asset["id"] if cover_asset else "")
    ]
    
    # 按照名字排序，确保顺序相对固定
    visual_assets.sort(key=lambda x: x["name"])

    # 2. 构建轨道
    tracks = []
    
    # --- 视频/图片主轨道 ---
    main_track = {
        "id": "track_main_visual",
        "name": "AI 画面轨",
        "type": "media",
        "isMain": True,
        "elements": []
    }
    
    current_time = 0
    
    # 2.1 放入封面 (5秒)
    if cover_asset:
        main_track["elements"].append({
            "id": "el_cover",
            "type": "media",
            "mediaId": cover_asset["id"],
            "name": "封面",
            "startTime": current_time,
            "duration": 5,
            "trimStart": 0,
            "trimEnd": 0,
            "opacity": 1,
            "volume": 1,
            "x": 960, "y": 540, "scale": 1, "rotation": 0
        })
        current_time += 5

    # 2.2 放入其他视频/图片
    for i, asset in enumerate(visual_assets):
        # 如果是视频，用原时长（最长10秒，避免太长）；如果是图片，给 3 秒
        max_duration = 10 if asset["type"] == "video" else 3
        duration = min(asset.get("duration", 0) or 3, max_duration)
        if duration < 1: duration = 3 # 兜底

        main_track["elements"].append({
            "id": f"el_visual_{i}",
            "type": "media",
            "mediaId": asset["id"],
            "name": asset["name"],
            "startTime": current_time,
            "duration": duration,
            "trimStart": 0,
            "trimEnd": 0,
            "opacity": 1,
            "volume": 1 if asset["type"] == "video" else 0, # 视频开声音
            "x": 960, "y": 540, "scale": 1, "rotation": 0
        })
        current_time += duration

    tracks.append(main_track)

    # --- 音频轨道 ---
    if bgm_asset:
        audio_track = {
            "id": "track_bgm",
            "name": "AI 配音轨",
            "type": "audio",
            "elements": [{
                "id": "el_bgm",
                "type": "media",
                "mediaId": bgm_asset["id"],
                "name": "解说配音",
                "startTime": 0,
                # BGM 长度铺满整个已有画面，或者取音频本身的长度
                "duration": bgm_asset.get("duration", 100), 
                "trimStart": 0,
                "trimEnd": 0,
                "volume": 0.8,
                "opacity": 0 
            }]
        }
        tracks.append(audio_track)

    # --- 标题字幕轨道 ---
    text_track = {
        "id": "track_text",
        "name": "AI 字幕",
        "type": "text",
        "elements": [{
            "id": "el_title",
            "type": "text",
            "name": "Title",
            "content": "AIcut 自动剪辑演示",
            "startTime": 0,
            "duration": 4, # 稍微比封面短一点
            "trimStart": 0,
            "trimEnd": 0,
            "x": 960, "y": 800,
            "fontSize": 80,
            "fontFamily": "Microsoft YaHei",
            "color": "#FFFFFF",
            "backgroundColor": "#000000AA",
            "textAlign": "center",
            "opacity": 1,
            "rotation": 0
        }]
    }
    tracks.append(text_track)

    # 3. 发送指令
    payload = {
        "action": "setFullState",
        "data": {
            "tracks": tracks
        }
    }

    print("Sending timeline to AIcut...")
    try:
        res = requests.post(API_URL, json=payload)
        if res.status_code == 200:
            print("Success! Timeline updated.")
            print(res.json())
        else:
            print(f"Failed: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    create_timeline()
