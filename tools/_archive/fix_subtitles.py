"""
Update all subtitles:
1. Change font to 黑体 (Heiti SC, SimHei)
2. Remove any fade effects
"""
import json
from pathlib import Path

path = Path("remotion-studio/src/projects/promo_video.json")

def main():
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    updated_count = 0
    effects_removed = 0

    for track in data['tracks']:
        if track['id'] == 'track_subtitles':
            for clip in track['clips']:
                # 确保 style 存在
                if 'style' not in clip:
                    clip['style'] = {}
                
                # 设置字体为黑体
                clip['style']['fontFamily'] = "Heiti SC, SimHei, Microsoft YaHei, sans-serif"
                
                # 移除 effects (渐隐等)
                if 'effects' in clip:
                    del clip['effects']
                    effects_removed += 1
                
                updated_count += 1
                
            print(f"✅ Updated {updated_count} subtitles to use 黑体")
            print(f"✅ Removed effects from {effects_removed} clips")

    # 保存
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f"✅ Saved promo_video.json")
    
    # 打印几条字幕样式作为确认
    print("\n📋 Sample subtitle styles:")
    for track in data['tracks']:
        if track['id'] == 'track_subtitles':
            for i, clip in enumerate(track['clips'][:3]):
                print(f"  {clip['id']}: font={clip['style'].get('fontFamily', 'N/A')[:20]}..., effects={'effects' in clip}")

if __name__ == "__main__":
    main()
