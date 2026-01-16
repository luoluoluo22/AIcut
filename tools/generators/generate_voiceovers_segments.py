import asyncio
import edge_tts
import os
import json
from pydub import AudioSegment

# Configuration
OUTPUT_DIR = "remotion-studio/public/assets/projects/demo/audio/segments"
VOICE = "zh-CN-YunyangNeural"  # Professional Male Voice
RATE = "+0%"
VOLUME = "+0%"

# V2.1 Promo Script (Updated by User)
TEXT_SEGMENTS = [
    "你好，我是 AIcut。",
    "我是一个 AI 原生视频剪辑引擎。",
    "只需给我一个想法，剩下的交给我。"
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
        await generate_voice(text, filepath, VOICE, RATE, VOLUME)
        
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
        
    with open("remotion-studio/src/projects/demo_subtitles.srt", "w", encoding="utf-8") as f:
        f.write(srt_content)

    print(f"\nTotal Duration: {current_time:.2f}s")

if __name__ == "__main__":
    asyncio.run(main())
