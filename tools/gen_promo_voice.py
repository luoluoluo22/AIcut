import asyncio
import edge_tts
import os
import json
from pydub import AudioSegment
import sys

# 默认设置
VOICE = "zh-CN-YunyangNeural"

async def generate_voice(text, output_file, voice_name):
    communicate = edge_tts.Communicate(text, voice_name, rate="+5%", volume="+0%")
    await communicate.save(output_file)

def get_audio_duration(file_path):
    try:
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000.0
    except:
        return 0

async def main():
    # 参数解析: python gen_promo_voice.py <project_id> <comma_separated_texts> <voice>
    project_id = sys.argv[1] if len(sys.argv) > 1 else "promo"
    raw_texts = sys.argv[2] if len(sys.argv) > 2 else "AI 剪辑，只需一个想法。,AIcut，开启自动化视频创作。,全自动 Agent 执行，数据驱动渲染。,让创意瞬间成片。,AIcut，重新定义剪辑。"
    voice_name = sys.argv[3] if len(sys.argv) > 3 else VOICE
    
    texts = [t.strip() for t in raw_texts.split(",")]
    
    output_dir = f"remotion-studio/public/assets/projects/{project_id}/audio/segments"
    os.makedirs(output_dir, exist_ok=True)
    
    segments_info = []
    current_time = 0.5
    
    print(f"🎙️ Generating voiceover for project: {project_id}")
    print(f"👤 Voice: {voice_name}")
    
    for i, text in enumerate(texts):
        if not text: continue
        filename = f"s{i+1:02d}.mp3"
        filepath = os.path.join(output_dir, filename)
        await generate_voice(text, filepath, voice_name)
        
        duration = get_audio_duration(filepath)
        start_time = current_time
        end_time = start_time + duration
        
        print(f"  {filename}: {text[:20]}... -> {duration:.2f}s")
        
        segments_info.append({
            "id": f"v{i+1}",
            "text": text,
            "path": f"/assets/projects/{project_id}/audio/segments/{filename}",
            "start": round(start_time, 3),
            "duration": round(duration, 3)
        })
        current_time = end_time
    
    json_path = os.path.join(output_dir, "manifest.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(segments_info, f, ensure_ascii=False, indent=4)
    
    print(f"✅ Voiceover generation complete. Saved to {json_path}")

if __name__ == "__main__":
    asyncio.run(main())
