import requests
import json
import time

API_URL = "http://localhost:3000/api/ai-edit"

def get_current_state():
    """获取当前项目的全局快照 (Global View)"""
    print("正在从 Web 端获取当前项目状态...")
    response = requests.get(f"{API_URL}?action=getSnapshot")
    data = response.json()
    if data.get("success"):
        return data["snapshot"]
    else:
        print("尚未获取到快照，请确保编辑器已打开且停留超过 5 秒。")
        return None

def sync_to_web(tracks):
    """同步修改后的时间轴回 Web 端"""
    response = requests.post(API_URL, json={
        "action": "setFullState",
        "data": { "tracks": tracks }
    })
    return response.json()

# --- 演示：上帝视角的 AI 自动化过程 ---

# 1. 获取现在的状态
state = get_current_state()

if state:
    print("\n--- [上帝视角] 我看到了以下内容 ---")
    project = state.get("project", {})
    assets = state.get("assets", [])
    tracks = state.get("tracks", [])
    
    print(f"项目名称: {project.get('name')}")
    print(f"画布尺寸: {project.get('canvasSize')}")
    print(f"媒体库素材数量: {len(assets)}")
    for i, asset in enumerate(assets):
        print(f"  [{i}] 素材: {asset['name']} (ID: {asset['id']}, 类型: {asset['type']})")
    
    print(f"当前轨道数量: {len(tracks)}")

    # 2. 模拟 AI 逻辑：如果媒体库里有素材，我就把它们统统排到时间轴上，并加上统一的金色大字幕
    if assets:
        print("\n--- [AI 决策] 发现素材，开始全自动排版 ---")
        
        # 构建新的媒体轨道
        new_media_elements = []
        current_time = 0
        for asset in assets:
            if asset['type'] in ['video', 'image']:
                duration = asset.get('duration', 5) or 5
                new_media_elements.append({
                    "id": f"el_{asset['id']}",
                    "type": "media",
                    "name": asset['name'],
                    "mediaId": asset['id'],
                    "startTime": current_time,
                    "duration": duration,
                    "trimStart": 0, "trimEnd": 0
                })
                current_time += duration
        
        # 覆盖现有的媒体轨道（或创建）
        new_tracks = [
            {
                "id": "ai_media_track",
                "name": "AI 自动视频轨",
                "type": "media",
                "elements": new_media_elements,
                "isMain": True
            },
            {
                "id": "ai_subtitle_track",
                "name": "AI 风格字幕轨",
                "type": "text",
                "elements": [
                    {
                        "id": "global_title", "type": "text", "name": "标题", 
                        "content": "AI 全自动合成演示",
                        "startTime": 0, "duration": current_time, 
                        "trimStart": 0, "trimEnd": 0,
                        "x": 960, "y": 200, "fontSize": 100, "fontWeight": "bold",
                        "color": "#FFD700", "backgroundColor": "rgba(0,0,0,0.5)",
                        "textAlign": "center", "opacity": 0.8
                    }
                ]
            }
        ]
        
        # 3. 推送最新的全局状态
        print("正在同步 AI 的全自动剪辑结果...")
        result = sync_to_web(new_tracks)
        print(f"同步结果: {result}")
else:
    print("失败：请先在浏览器打开项目并等待几秒。")
