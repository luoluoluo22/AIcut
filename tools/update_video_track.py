import json
from pathlib import Path

path = Path("remotion-studio/src/projects/promo_video.json")

def main():
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"File not found: {path}")
        return

    # 重新定义视频 Clips (基于 V2.1 文案的叙事逻辑)
    # Part 1 (0-25s): Hook - 展示成果/工作状态
    # Part 2 (25s-45s): Pain - 回忆痛苦
    # Part 3 (45s-80s): Tech - 展示本地运行和工程文件
    # Part 4 (80s-End): Value - 自由/陪伴/成长
    
    # 我们先设定大致时长，后续可以手动微调
    
    new_video_clips = [
        # 1. Hook (0-25s): 展示 AI 正在工作 (时间轴) + 成果 (竹林)
        {
            "id": "clip_hook_demo",
            "name": "Hook: 剪辑界面",
            "path": "/assets/projects/promo_video/videos/video_editing_timeline_1.mp4",
            "start": 0,
            "duration": 15,
            "position": {"x": 0.5, "y": 0.5}
        },
        {
            "id": "clip_hook_result",
            "name": "Hook: 成果展示",
            "path": "/assets/projects/promo_video/videos/bamboo_forest_1.mp4",
            "start": 15,
            "duration": 10,
            "position": {"x": 0.5, "y": 0.5}
        },
        
        # 2. Pain (25-45s): 压力大的打工人 (回忆过去)
        {
            "id": "clip_pain",
            "name": "Pain: 压力大",
            "path": "/assets/projects/promo_video/videos/stressed_office_worker_1.mp4",
            "start": 25,
            "duration": 20,
            "position": {"x": 0.5, "y": 0.5}
        },

        # 3. Tech (45s-75s): AIcut 本地运行界面 (再次展示时间轴，循环)
        # 配合文案："AIcut直接运行...工程文件...颜色位置自动排版"
        {
            "id": "clip_tech_1",
            "name": "Tech: 时间轴展示1",
            "path": "/assets/projects/promo_video/videos/video_editing_timeline_1.mp4",
            "start": 45,
            "duration": 15,
            "position": {"x": 0.5, "y": 0.5}
        },
        {
            "id": "clip_tech_2",
            "name": "Tech: 时间轴展示2",
            "path": "/assets/projects/promo_video/videos/video_editing_timeline_1.mp4",
            "start": 60,
            "duration": 15,
            "position": {"x": 0.5, "y": 0.5}
        },

        # 4. Value/Freedom (75s - 95s): 奔跑/海浪
        # 配合文案："批量生产...不占用屏幕...私人剪辑师...共同成长"
        {
            "id": "clip_freedom",
            "name": "Freedom: 奔跑",
            "path": "/assets/projects/promo_video/videos/running_beach_1.mp4",
            "start": 75,
            "duration": 15,
            "position": {"x": 0.5, "y": 0.5}
        },
        {
            "id": "clip_result_end",
            "name": "Result: 海浪",
            "path": "/assets/projects/promo_video/videos/beach_waves_1.mp4",
            "start": 90,
            "duration": 10,  # 直到 100s
            "position": {"x": 0.5, "y": 0.5}
        },

        # 5. Ending (100s - 110s): White BG
        {
            "id": "clip_ending",
            "name": "Ending: 白底",
            "path": "/assets/projects/promo_video/images/white_bg.png",
            "start": 100,
            "duration": 10,
            "position": {"x": 0.5, "y": 0.5}
        }
    ]

    # 更新 track_video
    for track in data['tracks']:
        if track['id'] == 'track_video':
            track['clips'] = new_video_clips
            print(f"Updated track_video with {len(new_video_clips)} clips.")
    
    # 增加总 duration 到 110s 以适应可能增长的配音
    data['duration'] = 110
    print("Updated total duration to 110s.")

    # 保存
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        print("Saved promo_video.json")

if __name__ == "__main__":
    main()
