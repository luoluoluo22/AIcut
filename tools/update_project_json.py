"""
根据 segments_info.json 更新 promo_video.json
"""

import json
from pathlib import Path

# 路径配置
segments_path = Path("remotion-studio/public/assets/projects/demo/audio/segments/segments_info.json")
project_path = Path("remotion-studio/src/projects/demo.json")

def main():
    # 读取配音片段信息
    with open(segments_path, 'r', encoding='utf-8') as f:
        segments = json.load(f)
    
    # 读取项目配置
    with open(project_path, 'r', encoding='utf-8') as f:
        project = json.load(f)
    
    # 构建新的配音 Clips
    new_voiceover_clips = []
    for seg in segments:
        clip = {
            "id": f"vo_{seg['id']}",
            "name": f"配音-{seg['id']}",
            "path": f"/assets/projects/demo/audio/segments/{seg['file']}",
            "start": seg['start'],
            "duration": seg['duration'],
            "volume": 1.2  # 提高配音音量
        }
        new_voiceover_clips.append(clip)
    
    # 构建新的字幕 Clips (保留原有样式逻辑)
    # 样式映射：第一阶段(痛点)和第四阶段(结尾)用黑字，其他用白字
    new_subtitle_clips = []
    for idx, seg in enumerate(segments):
        # 确定样式
        # 第一阶段: s01-s03 (痛点) -> 黑字
        # 第四阶段: s16-s19 (结尾) -> 黑字
        # 其他: 白字
        
        # 样式: 统一为白色带描边
        # is_black_text = (0 <= idx <= 2) or (15 <= idx <= 18)
        is_black_text = False
        
        style = {
            "fontSize": 40,
            "color": "white",
            "textStroke": "2px black"
        }
        
        # 去除标点
        text = seg['text'].rstrip('，。！？、；：')

        clip = {
            "id": f"sub_{seg['id']}",
            "text": text,
            "start": seg['start'],
            "duration": seg['duration'],
            "position": {
                "x": 0.5,
                "y": 0.85
            },
            "style": style
        }
        new_subtitle_clips.append(clip)

    # 更新项目配置
    for track in project['tracks']:
        if track['id'] == 'track_voiceover':
            track['clips'] = new_voiceover_clips
            print(f"✅ 更新 track_voiceover: {len(new_voiceover_clips)} 个片段")
            
        elif track['id'] == 'track_subtitles':
            track['clips'] = new_subtitle_clips
            print(f"✅ 更新 track_subtitles: {len(new_subtitle_clips)} 个片段")

    # 保存文件
    with open(project_path, 'w', encoding='utf-8') as f:
        json.dump(project, f, ensure_ascii=False, indent=4)
    
    # 计算总时长 (最后一句话结束 + 2秒缓冲)
    total_duration = segments[-1]['end'] + 2.0
    project['duration'] = total_duration
    print(f"✅ 更新项目总时长: {total_duration}s")

    # 更新所有视频/背景轨道的 Clips 时长
    if 'tracks' in project:
        for track in project['tracks']:
            if track['type'] == 'video':
                for clip in track['clips']:
                    clip['duration'] = total_duration
                print(f"✅ 更新视频轨道 Clips 时长: {total_duration}s")
    
    # 再次保存文件以应用时长更新
    with open(project_path, 'w', encoding='utf-8') as f:
        json.dump(project, f, ensure_ascii=False, indent=4)

    print(f"✅ 已保存到 {project_path}")

if __name__ == "__main__":
    main()
