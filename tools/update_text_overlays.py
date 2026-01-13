"""
Update promo_video.json:
1. Remove old overlays
2. Add highlighted keywords (yellow + black stroke)
3. Adjust ending logo timing
4. Ensure subtitles have no fade effects
"""
import json
from pathlib import Path

path = Path("remotion-studio/src/projects/demo.json")

def main():
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 新的重点关键词 Overlay (黄字黑色描边, 缩放效果)
    # 根据配音时间点添加
    highlight_clips = [
        {
            "id": "hl_1",
            "text": "AIcut",
            "start": 0.2,
            "duration": 2.5,
            "position": {"x": 0.5, "y": 0.4},
            "color": "#FFD700",
            "style": {
                "fontSize": 120,
                "fontWeight": "900",
                "textShadow": "4px 4px 0 #000"
            },
            "effects": [{"type": "scale", "from": 0.8, "to": 1.0, "duration": 0.3}]
        },
        {
            "id": "hl_2",
            "text": "AI Native",
            "start": 3.0,
            "duration": 3.0,
            "position": {"x": 0.5, "y": 0.4},
            "color": "#00FF00",
            "style": {
                "fontSize": 100,
                "fontWeight": "bold",
                "textShadow": "3px 3px 0 #000"
            }
        },
        {
            "id": "hl_3",
            "text": "Just One Idea",
            "start": 6.5,
            "duration": 3.0,
            "position": {"x": 0.5, "y": 0.4},
            "color": "#FFFFFF",
            "style": {
                "fontSize": 90,
                "fontWeight": "bold",
                "textShadow": "3px 3px 0 #000"
            }
        }
    ]

    # 更新 track_text_overlay
    for track in data['tracks']:
        if track['id'] == 'track_text_overlay':
            track['clips'] = highlight_clips
            print(f"✅ Updated track_text_overlay with {len(highlight_clips)} clips")
        
        # 确保字幕没有 effects (渐隐)
        if track['id'] == 'track_subtitles':
            for clip in track['clips']:
                if 'effects' in clip:
                    del clip['effects']
            print(f"✅ Removed effects from {len(track['clips'])} subtitles")

    # 保存
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f"✅ Saved promo_video.json")

if __name__ == "__main__":
    main()
