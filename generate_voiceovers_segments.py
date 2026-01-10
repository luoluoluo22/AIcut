import asyncio
import edge_tts
import os
import json
from pydub import AudioSegment

# Configuration
OUTPUT_DIR = "remotion-studio/public/assets/projects/promo_video/audio/segments"
VOICE = "zh-CN-YunyangNeural"  # Professional Male Voice
RATE = "+0%"
VOLUME = "+0%"

# V2.1 Promo Script (Updated by User)
TEXT_SEGMENTS = [
    # Part 1: Hook
    "眼前这个 AIcut 的表现相当出乎意料，",
    "它竟然真的接管了我的剪辑工作流，甚至直接帮我把成片都做好了。",
    "你看，我只是给它一个简单的提示词：",
    "做一个关于未来城市的宣传片。",
    "它立马就开始自动工作：自己去 Pexels 搜索视频素材，",
    "自己写脚本，甚至连配音和背景音乐都帮我选好了。",

    # Part 2: Pain & Tech
    "你不知道，以前做视频，我最头疼的就是找素材和对字幕。",
    "挑素材一团乱，对字幕总卡不准。",
    "之前那些网页版 AI 生成工具，生成的视频落地难。",
    "而 AIcut，它是直接在我的本地电脑上运行。",
    "你看，它生成的不仅是视频，更是可编辑的工程文件。",
    "每一句字幕的颜色、位置，它都自动排版好了。",
    "完全不需要我懂代码，也不用在剪辑软件里拖来拖去。",

    # Part 3: Automation & Value (Updated Ending)
    "甚至，我可以让它批量生产。",
    "设定好主题，它就在后台默默干活。",
    "不管我是在刷剧还是在睡觉，完全不占用我的屏幕。",
    "等我回来，视频已经渲染好了。",
    "说实话，AIcut 让我觉得它不再只是一个冰冷的工具，",
    "而是一个伴你成长的私人剪辑师。",
    "随着它和你共同完成的剪辑项目越多，",
    "它就越创作出符合你想法的视频。",
    "这种全自动的爽感，才是 AI 剪辑该有的样子呀。"
]

async def generate_voice(text, output_file, voice, rate, volume):
    communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume)
    await communicate.save(output_file)

def get_audio_duration(file_path):
    try:
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000.0
    except Exception as e:
        print(f"Error reading audio duration for {file_path}: {e}")
        return 0

def generate_srt_time(seconds):
    millis = int((seconds * 1000) % 1000)
    seconds = int(seconds)
    minutes = int(seconds / 60)
    hours = int(minutes / 60)
    seconds = seconds % 60
    minutes = minutes % 60
    return f"{hours:02}:{minutes:02}:{seconds:02},{millis:03}"

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    segments_info = []
    current_time = 0.5  # Add 0.5s delay to fix browser autoplay mute issue
    Gap = 0.0  # Tight pacing

    srt_content = ""
    print(f"Generating {len(TEXT_SEGMENTS)} segments info (Skip audio generation)...")

    for i, text in enumerate(TEXT_SEGMENTS):
        seg_id = f"s{i+1:02d}"
        filename = f"{seg_id}.mp3"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        # Only regenerate if text changed? No, user wants regen.
        # await generate_voice(text, filepath, VOICE, RATE, VOLUME)
        
        duration = get_audio_duration(filepath)
        start_time = current_time
        end_time = start_time + duration
        
        print(f"{seg_id}: {text[:15]}... -> {duration:.2f}s")
        
        segments_info.append({
            "id": seg_id,
            "text": text,
            "file": filename,
            "start": round(start_time, 3),
            "end": round(end_time, 3),
            "duration": round(duration, 3)
        })

        clean_text = text.strip("，。？：！")
        srt_content += f"{i+1}\n{generate_srt_time(start_time)} --> {generate_srt_time(end_time)}\n{clean_text}\n\n"
        
        current_time = end_time + Gap

    # Save JSON and SRT
    with open(os.path.join(OUTPUT_DIR, "segments_info.json"), "w", encoding="utf-8") as f:
        json.dump(segments_info, f, ensure_ascii=False, indent=4)
        
    with open("remotion-studio/src/projects/promo_video_subtitles.srt", "w", encoding="utf-8") as f:
        f.write(srt_content)

    print(f"\nTotal Duration: {current_time:.2f}s")

if __name__ == "__main__":
    asyncio.run(main())
