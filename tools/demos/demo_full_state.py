import requests
import time

# 定义 API 地址
API_URL = "http://localhost:3000/api/ai-edit"

def update_ui(tracks):
    """通过 setFullState 全量更新 UI"""
    print(f"发送全量更新指令...包含 {len(tracks)} 个轨道")
    response = requests.post(API_URL, json={
        "action": "setFullState",
        "data": {
            "tracks": tracks
        }
    })
    return response.json()

# 1. 初始状态：三个白色字幕
initial_tracks = [
    {
        "id": "main_video",
        "name": "视频轨道",
        "type": "media",
        "elements": [],
        "isMain": True
    },
    {
        "id": "subtitle_track",
        "name": "字幕轨道",
        "type": "text",
        "elements": [
            {
                "id": "sub1", "type": "text", "name": "字幕1", "content": "这是第一段演示字幕",
                "startTime": 1, "duration": 3, "trimStart": 0, "trimEnd": 0,
                "x": 960, "y": 800, "fontSize": 60, "fontFamily": "Inter",
                "color": "#FFFFFF", "backgroundColor": "rgba(0,0,0,0.5)",
                "textAlign": "center", "fontWeight": "normal", "fontStyle": "normal",
                "textDecoration": "none", "rotation": 0, "opacity": 1
            },
            {
                "id": "sub2", "type": "text", "name": "字幕2", "content": "全量控制可以瞬间改变所有内容",
                "startTime": 5, "duration": 3, "trimStart": 0, "trimEnd": 0,
                "x": 960, "y": 800, "fontSize": 60, "fontFamily": "Inter",
                "color": "#FFFFFF", "backgroundColor": "rgba(0,0,0,0.5)",
                "textAlign": "center", "fontWeight": "normal", "fontStyle": "normal",
                "textDecoration": "none", "rotation": 0, "opacity": 1
            }
        ]
    }
]

print("--- 步骤 1: 创建初始字幕 (白色) ---")
update_ui(initial_tracks)
time.sleep(3)

# 2. 瞬间改变：将所有字幕变为 金色 且 加粗
updated_tracks = [
    {
        "id": "main_video",
        "name": "视频轨道",
        "type": "media",
        "elements": [],
        "isMain": True
    },
    {
        "id": "subtitle_track",
        "name": "字幕轨道",
        "type": "text",
        "elements": [
            {
                "id": "sub1", "type": "text", "name": "字幕1", "content": "瞬间变为金色加粗！",
                "startTime": 1, "duration": 3, "trimStart": 0, "trimEnd": 0,
                "x": 960, "y": 800, "fontSize": 80, "fontFamily": "Inter",
                "color": "#FFD700", "backgroundColor": "rgba(0,0,0,0.8)",
                "textAlign": "center", "fontWeight": "bold", "fontStyle": "normal",
                "textDecoration": "none", "rotation": 5, "opacity": 1
            },
            {
                "id": "sub2", "type": "text", "name": "字幕2", "content": "这就是 JSON 驱动的魅力",
                "startTime": 5, "duration": 3, "trimStart": 0, "trimEnd": 0,
                "x": 960, "y": 800, "fontSize": 80, "fontFamily": "Inter",
                "color": "#FFD700", "backgroundColor": "rgba(0,0,0,0.8)",
                "textAlign": "center", "fontWeight": "bold", "fontStyle": "normal",
                "textDecoration": "none", "rotation": -5, "opacity": 1
            }
        ]
    }
]

print("--- 步骤 2: 瞬间改变颜色、字号和旋转角度 (金色) ---")
update_ui(updated_tracks)
print("演示完成！请查看网页端变化。")
