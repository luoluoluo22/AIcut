import os
import json
import asyncio
import edge_tts
from pymediainfo import MediaInfo
from pathlib import Path

# 配置路径
PROJECT_ROOT = Path(__file__).parent.parent
PROJECT_JSON = PROJECT_ROOT / "remotion-studio/src/projects/demo.json"
ASSETS_DIR = PROJECT_ROOT / "remotion-studio/public/assets/projects/demo"
AUDIO_DIR = ASSETS_DIR / "audio/segments"
SRT_PATH = PROJECT_ROOT / "remotion-studio/src/projects/demo_subtitles.srt"

# TTS 配置
VOICE = "zh-CN-YunyangNeural"
RATE = "+0%"
VOLUME = "+0%"

async def generate_voice(text, output_file):
    """调用 Edge-TTS 生成语音"""
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, volume=VOLUME)
    await communicate.save(output_file)

def get_audio_duration(file_path):
    """获取音频文件的实际时长（秒）"""
    media_info = MediaInfo.parse(file_path)
    for track in media_info.tracks:
        if track.track_type == "Audio":
            return float(track.duration) / 1000.0
    return 0.0

def format_srt_time(seconds):
    """将秒数转为 SRT 时间格式: HH:MM:SS,mmm"""
    ms = int((seconds % 1) * 1000)
    s = int(seconds % 60)
    m = int((seconds // 60) % 60)
    h = int(seconds // 3600)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

async def sync_all():
    print("🎬 [SyncEngine] 启动同步引擎...")
    
    if not os.path.exists(PROJECT_JSON):
        print(f"❌ 找不到项目文件: {PROJECT_JSON}")
        return

    with open(PROJECT_JSON, "r", encoding="utf-8") as f:
        project = json.load(f)

    # 1. 提取字幕轨道作为源头
    subtitles_track = next((t for t in project["tracks"] if t["id"] == "track_subtitles"), None)
    if not subtitles_track:
        print("❌ 轨道配置中未找到 track_subtitles")
        return

    os.makedirs(AUDIO_DIR, exist_ok=True)
    
    new_sub_clips = []
    new_voice_clips = []
    current_time = 0.0
    srt_content = []

    print(f"🎙️ 正在根据文本重新生成音频 (共 {len(subtitles_track['clips'])} 段)...")

    for i, clip in enumerate(subtitles_track["clips"]):
        text = clip.get("text", "").strip()
        if not text: continue

        audio_filename = f"s{i+1:02}.mp3"
        audio_path = AUDIO_DIR / audio_filename
        
        # A. 生成音频
        await generate_voice(text, str(audio_path))
        
        # B. 获取真实时长
        duration = get_audio_duration(str(audio_path))
        
        # C. 构造新的时间轴片段 (并保留原有属性如 position, style)
        start_time = round(current_time, 3)
        duration = round(duration, 3)
        
        # 克隆原始对象副本以保留样式
        new_clip = clip.copy()
        new_clip.update({
            "start": start_time,
            "duration": duration
        })
        new_sub_clips.append(new_clip)

        # 构造音频片段 (音频片段相对简单，主要对齐时间)
        new_voice_clips.append({
            "id": f"voice_{i+1}",
            "type": "audio",
            "path": f"/assets/projects/demo/audio/segments/{audio_filename}",
            "start": start_time,
            "duration": duration,
            "volume": 1.0
        })

        # 构建 SRT 内容
        srt_content.append(f"{i+1}")
        srt_content.append(f"{format_srt_time(start_time)} --> {format_srt_time(start_time + duration)}")
        srt_content.append(f"{text}\n")

        current_time += duration

    # 2. 漣漪更新：同步视频背景轨道
    total_duration = current_time
    video_track = next((t for t in project["tracks"] if t.get("type") == "video"), None)
    if video_track and len(video_track["clips"]) > 0:
        # 简单逻辑：平分总时长给现有图片
        avg_dur = total_duration / len(video_track["clips"])
        v_time = 0.0
        for v_clip in video_track["clips"]:
            v_clip["start"] = round(v_time, 3)
            v_clip["duration"] = round(avg_dur, 3)
            v_time += avg_dur

    # 3. 更新项目总时长
    project["duration"] = round(total_duration, 3)
    
    # 查找并更新音频轨道
    voice_track = next((t for t in project["tracks"] if t["id"] == "track_voiceover"), None)
    if voice_track:
        voice_track["clips"] = new_voice_clips
    
    # 回写字幕轨道（此时已带有时长信息）
    subtitles_track["clips"] = new_sub_clips

    # 4. 保存文件
    with open(PROJECT_JSON, "w", encoding="utf-8") as f:
        json.dump(project, f, ensure_ascii=False, indent=4)
    
    with open(SRT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_content))

    print(f"✅ 同步完成！")
    print(f"⏱️ 总时长: {project['duration']}s")
    print(f"📄 更新了 {PROJECT_JSON.name}")
    print(f"📄 更新了 {SRT_PATH.name}")

if __name__ == "__main__":
    asyncio.run(sync_all())
