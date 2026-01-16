"""
Replace all video tracks in promo_video.json with a single screen recording
"""
import json
from pathlib import Path

path = Path("remotion-studio/src/projects/promo_video.json")

def main():
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 录屏视频 58 秒，配音约 91 秒
    # 视频编排：录屏 0-58s，白底 58s-结尾 (约 110s)
    SCREEN_RECORDING = "/assets/projects/promo_video/videos/screen_recording.mp4"
    WHITE_BG = "/assets/projects/promo_video/images/white_bg.png"
    
    # 新的唯一视频轨道
    new_video_track = {
        "id": "track_video",
        "type": "video",
        "clips": [
            {
                "id": "clip_screen_recording",
                "name": "录屏演示",
                "path": SCREEN_RECORDING,
                "start": 0,
                "duration": 58,  # 录屏实际时长
                "position": {"x": 0.5, "y": 0.5}
            },
            {
                "id": "clip_ending",
                "name": "结尾白底",
                "path": WHITE_BG,
                "start": 58,
                "duration": 52,  # 持续到 110s
                "position": {"x": 0.5, "y": 0.5}
            }
        ]
    }

    # 移除所有 type=video 的轨道，然后添加新轨道
    new_tracks = []
    for track in data['tracks']:
        if track['type'] != 'video':
            new_tracks.append(track)
        else:
            print(f"  🗑️ Removed: {track['id']}")
    
    # 在开头插入新视频轨道
    new_tracks.insert(0, new_video_track)
    print(f"  ✅ Added: track_video (screen_recording + white_bg)")
    
    data['tracks'] = new_tracks
    
    # 更新总时长
    data['duration'] = 110
    print(f"  ✅ Duration: 110s")

    # 保存
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    print(f"✅ Saved promo_video.json")

if __name__ == "__main__":
    main()
