"""
仅重新生成 SRT 字幕文件(去除标点)
"""

import json
from pathlib import Path

def format_srt_time(seconds: float) -> str:
    """格式化时间为 SRT 格式 (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def generate_srt(segments_info: list, output_path: Path):
    """生成 SRT 字幕文件"""
    srt_content = []
    
    for i, info in enumerate(segments_info, 1):
        start_time = format_srt_time(info['start'])
        end_time = format_srt_time(info['end'])
        
        # 去除文本末尾的标点符号
        text = info['text'].rstrip('，。！？、；：')
        
        srt_content.append(f"{i}")
        srt_content.append(f"{start_time} --> {end_time}")
        srt_content.append(text)
        srt_content.append("")  # 空行
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(srt_content))
    
    print(f"✅ SRT 字幕已生成: {output_path}")

# 读取配置文件
json_path = Path("remotion-studio/public/assets/projects/promo_video/audio/segments/segments_info.json")
with open(json_path, 'r', encoding='utf-8') as f:
    segments_info = json.load(f)

# 生成 SRT
srt_path = Path("remotion-studio/src/projects/promo_video_subtitles.srt")
generate_srt(segments_info, srt_path)

print("\n字幕预览:")
print("=" * 60)
for info in segments_info[:5]:  # 只显示前5条
    text = info['text'].rstrip('，。！？、；：')
    print(f"{info['start']:.2f}s - {info['end']:.2f}s: {text}")
print("...")
