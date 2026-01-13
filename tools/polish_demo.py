import json
import os

def polish_demo_json():
    project_path = "remotion-studio/src/projects/demo.json"
    
    with open(project_path, "r", encoding="utf-8") as f:
        project = json.load(f)

    # 1. 重新同步视频轨道 (与配音对齐)
    # S1: 0.5 - 2.95 -> 图1建议 0 - 3.1
    # S2: 2.95 - 6.36 -> 图2建议 3.1 - 6.5
    # S3: 6.36 - 9.62 -> 图3建议 6.5 - 11.62
    
    video_track = next(t for t in project["tracks"] if t["id"] == "track_video")
    video_track["clips"] = [
        {"id": "c1", "type": "image", "path": "/assets/projects/demo/images/kolors_scene_01.png", "start": 0.0, "duration": 3.1},
        {"id": "c2", "type": "image", "path": "/assets/projects/demo/images/kolors_scene_02.png", "start": 3.1, "duration": 3.4},
        {"id": "c3", "type": "image", "path": "/assets/projects/demo/images/kolors_scene_03.png", "start": 6.5, "duration": 5.12}
    ]

    # 2. 增强文字特效 (Highlights)
    text_track = next(t for t in project["tracks"] if t["id"] == "track_text_overlay")
    text_track["clips"] = [
        # 关键词 1
        {
            "id": "hl_1",
            "text": "AIcut",
            "start": 0.6,
            "duration": 2.2,
            "position": {"x": 0.5, "y": 0.45},
            "color": "#00E5FF",
            "style": {
                "fontSize": 140,
                "fontWeight": "900",
                "textShadow": "0 0 20px rgba(0,229,255,0.8)",
                "letterSpacing": "4px"
            },
            "effects": [
                {"type": "Floating", "props": {"start": 0.9, "end": 1.1}},
                {"type": "Fade", "props": {"in": 15, "out": 15}}
            ]
        },
        # 关键词 2
        {
            "id": "hl_2",
            "text": "AI NATIVE",
            "start": 3.3,
            "duration": 2.8,
            "position": {"x": 0.5, "y": 0.45},
            "color": "#FF3D00",
            "style": {
                "fontSize": 120,
                "fontWeight": "900",
                "textShadow": "0 0 20px rgba(255,61,0,0.8)",
                "letterSpacing": "2px"
            },
            "effects": [
                {"type": "Floating", "props": {"start": 0.95, "end": 1.05}},
                {"type": "Fade", "props": {"in": 10, "out": 10}}
            ]
        },
        # 关键词 3
        {
            "id": "hl_3",
            "text": "JUST ONE IDEA",
            "start": 6.8,
            "duration": 3.0,
            "position": {"x": 0.5, "y": 0.45},
            "color": "#FFFFFF",
            "style": {
                "fontSize": 100,
                "fontWeight": "900",
                "textShadow": "0 0 30px rgba(255,255,255,0.6)",
                "letterSpacing": "2px"
            },
            "effects": [
                {"type": "Floating", "props": {"start": 1.0, "end": 1.25}},
                {"type": "Fade", "props": {"in": 10, "out": 15}}
            ]
        },
        # 闪白滤镜场景切换 (Flash Transitions)
        {
            "id": "flash_1",
            "text": " ",
            "start": 3.05,
            "duration": 0.1,
            "position": {"x": 0.5, "y": 0.5},
            "style": {
                "backgroundColor": "white",
                "width": "2000px",
                "height": "2000px",
                "opacity": 0.6
            }
        },
        {
            "id": "flash_2",
            "text": " ",
            "start": 6.45,
            "duration": 0.1,
            "position": {"x": 0.5, "y": 0.5},
            "style": {
                "backgroundColor": "white",
                "width": "2000px",
                "height": "2000px",
                "opacity": 0.6
            }
        }
    ]

    # 保存
    with open(project_path, "w", encoding="utf-8") as f:
        json.dump(project, f, ensure_ascii=False, indent=4)
        
    print("✨ 已完成视频剪辑优化 (通过修改 JSON)：")
    print("1. 画面切换与配音精准对齐")
    print("2. 为关键词添加了 Floating (缩放) 和 Fade (淡入淡出) 特效")
    print("3. 添加了 2 处闪白转场效果")
    print("4. 加强了文字排版视觉冲击力")

if __name__ == "__main__":
    polish_demo_json()
