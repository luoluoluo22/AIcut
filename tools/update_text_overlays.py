"""
Update promo_video.json:
1. Remove old overlays
2. Add highlighted keywords (yellow + black stroke)
3. Adjust ending logo timing
4. Ensure subtitles have no fade effects
"""
import json
from pathlib import Path

path = Path("remotion-studio/src/projects/promo_video.json")

def main():
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 新的重点关键词 Overlay (黄字黑色描边, 缩放效果)
    # 根据配音时间点添加
    highlight_clips = [
        # 开头惊叹
        {
            "id": "hl_aicut",
            "text": "AIcut",
            "start": 0.5,
            "duration": 3,
            "position": {"x": 0.5, "y": 0.3},
            "color": "#FFD700",  # 金黄色
            "style": {
                "fontSize": 100,
                "fontWeight": "900",
                "textShadow": "3px 3px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000"
            },
            "effects": [{"type": "scale", "from": 0.8, "to": 1.0, "duration": 0.3}]
        },
        # 强调"接管工作流"
        {
            "id": "hl_takeover",
            "text": "接管剪辑工作流",
            "start": 5,
            "duration": 4,
            "position": {"x": 0.5, "y": 0.25},
            "color": "#FFD700",
            "style": {
                "fontSize": 80,
                "fontWeight": "bold",
                "textShadow": "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000"
            }
        },
        # 强调"本地运行"
        {
            "id": "hl_local",
            "text": "本地运行",
            "start": 30,
            "duration": 4,
            "position": {"x": 0.5, "y": 0.25},
            "color": "#00FF00",  # 绿色
            "style": {
                "fontSize": 80,
                "fontWeight": "bold",
                "textShadow": "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000"
            }
        },
        # 强调"可编辑工程文件"
        {
            "id": "hl_editable",
            "text": "可编辑的工程文件",
            "start": 35,
            "duration": 4,
            "position": {"x": 0.5, "y": 0.25},
            "color": "#FFD700",
            "style": {
                "fontSize": 70,
                "fontWeight": "bold",
                "textShadow": "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000"
            }
        },
        # 强调"批量生产"
        {
            "id": "hl_batch",
            "text": "批量生产",
            "start": 50,
            "duration": 3,
            "position": {"x": 0.5, "y": 0.25},
            "color": "#FF6B6B",  # 红色
            "style": {
                "fontSize": 90,
                "fontWeight": "900",
                "textShadow": "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000"
            }
        },
        # 结尾 Logo (白底部分)
        {
            "id": "txt_outro_1",
            "text": "AIcut",
            "start": 60,
            "duration": 50,
            "position": {"x": 0.5, "y": 0.4},
            "color": "black",
            "style": {
                "fontSize": 200,
                "fontWeight": "900",
                "fontFamily": "Heiti SC, SimHei, sans-serif"
            }
        },
        {
            "id": "txt_outro_2",
            "text": "全自动剪辑师",
            "start": 61,
            "duration": 49,
            "position": {"x": 0.5, "y": 0.6},
            "color": "black",
            "style": {
                "fontSize": 80,
                "fontWeight": "bold",
                "fontFamily": "Heiti SC, SimHei, sans-serif"
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
