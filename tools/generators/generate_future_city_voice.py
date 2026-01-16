"""
Future City - Voiceover Generator
"""
import asyncio
import edge_tts
import os
import json
from pydub import AudioSegment

OUTPUT_DIR = "remotion-studio/public/assets/projects/future_city/audio/segments"
VOICE = "zh-CN-YunyangNeural"
RATE = "+0%"
VOLUME = "+0%"

# 30秒脚本
TEXT_SEGMENTS = [
    "未来城市，不再是科幻电影里的幻想。",
    "高耸入云的智能建筑，穿梭于天际的飞行汽车。",
    "万物互联，城市在呼吸、在思考。",
    "这，就是我们即将抵达的明天。",
    "AIcut，带你提前看见未来。"
]

async def generate_voice(text, output_file):
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, volume=VOLUME)
    await communicate.save(output_file)

def get_audio_duration(file_path):
    try:
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000.0
    except:
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
    current_time = 0.5  # 0.5s initial delay
    
    srt_content = ""
    print(f"🎙️ Generating {len(TEXT_SEGMENTS)} voiceover segments...")
    print(f"🗣️ Voice: {VOICE}")
    print("=" * 50)

    for i, text in enumerate(TEXT_SEGMENTS):
        seg_id = f"s{i+1:02d}"
        filename = f"{seg_id}.mp3"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        await generate_voice(text, filepath)
        
        duration = get_audio_duration(filepath)
        start_time = current_time
        end_time = start_time + duration
        
        print(f"  {seg_id}: {text[:20]}... -> {duration:.2f}s")
        
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
        
        current_time = end_time

    # Save JSON
    json_path = os.path.join(OUTPUT_DIR, "segments_info.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(segments_info, f, ensure_ascii=False, indent=4)
    
    # Save SRT
    srt_path = "remotion-studio/src/projects/future_city_subtitles.srt"
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt_content)
    
    print("=" * 50)
    print(f"✅ Total Duration: {current_time:.2f}s")
    print(f"📁 Saved to: {OUTPUT_DIR}")
    print(f"📄 SRT: {srt_path}")

if __name__ == "__main__":
    asyncio.run(main())
