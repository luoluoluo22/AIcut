"""
Complete fix:
1. Change all overlay fonts to 黑体
2. Update video track with both screen recordings
"""
import json
from pathlib import Path

path = Path("remotion-studio/src/projects/promo_video.json")

def main():
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. 修复所有 Overlay 字体
    for track in data['tracks']:
        if track['id'] == 'track_text_overlay':
            for clip in track['clips']:
                if 'style' not in clip:
                    clip['style'] = {}
                clip['style']['fontFamily'] = 'Heiti SC, SimHei, Microsoft YaHei, sans-serif'
            print(f"✅ Updated {len(track['clips'])} overlay clips to 黑体")

    # 2. 更新视频轨道：两段录屏 + 白底
    # screen_recording.mp4 = 58秒
    # screen_recording_2.mp4 = 新录屏 (假设也较短，我们连续播放)
    new_video_clips = [
        {
            "id": "clip_screen_1",
            "name": "录屏1",
            "path": "/assets/projects/promo_video/videos/screen_recording.mp4",
            "start": 0,
            "duration": 58,
            "position": {"x": 0.5, "y": 0.5}
        },
        {
            "id": "clip_screen_2",
            "name": "录屏2",
            "path": "/assets/projects/promo_video/videos/screen_recording_2.mp4",
            "start": 58,
            "duration": 32,  # 58+32=90s，然后白底
            "position": {"x": 0.5, "y": 0.5}
        },
        {
            "id": "clip_ending",
            "name": "结尾白底",
            "path": "/assets/projects/promo_video/images/white_bg.png",
            "start": 90,
            "duration": 20,
            "position": {"x": 0.5, "y": 0.5}
        }
    ]

    for track in data['tracks']:
        if track['id'] == 'track_video':
            track['clips'] = new_video_clips
            print(f"✅ Updated video track with 2 recordings + white bg")

    # 更新总时长
    data['duration'] = 110

    # 保存
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f"✅ Saved promo_video.json")

if __name__ == "__main__":
    main()
