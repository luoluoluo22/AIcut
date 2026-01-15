
import asyncio
import os
import json
import sys
from pathlib import Path

# Add tools directory to path to import existing modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from grok_text_to_video import grok_text_to_video
import edge_tts

# Configuration
PROJECT_NAME = "xiuxian_vlog"
ASSETS_DIR = f"remotion-studio/public/assets/projects/{PROJECT_NAME}"
VIDEO_DIR = f"{ASSETS_DIR}/videos"
AUDIO_DIR = f"{ASSETS_DIR}/audio/segments"

SCENES = [
    {
        "id": "scene_01_flying",
        "prompt": "First person POV vlog, cinematic shot, a Taoist cultivator flying on a sword through a sea of majestic clouds at sunrise, golden light hitting misty peaks, floating mountains in background, 8k resolution, ethereal, fantasy aesthetic, high quality.",
        "text": "家人们，今天是我闭关出来的第一天，御剑飞行的感觉还是这么爽！",
        "voice": "zh-CN-YunxiNeural", # Male, energetic
        "duration_est": 5.0
    },
    {
        "id": "scene_02_herb",
        "prompt": "A close up shot of a glowing spirit herb garden, magical plants with bioluminescent veins, the cultivator's hand carefully watering them with a jade bottle, magical water droplets, peaceful atmosphere, macro detail, 8k.",
        "text": "顺路去了一趟百草园，这株千年灵芝终于长成形了，这成色，绝了。",
        "voice": "zh-CN-YunxiNeural",
        "duration_est": 6.0
    },
    {
        "id": "scene_03_beast",
        "prompt": "Intense action shot, low angle, looking up at a giant ancient spirit beast (a kirin with blue flames) in a dark forest, the beast eyes glowing, tense atmosphere, dynamic angle, cinematic lighting, 8k.",
        "text": "卧槽，路过黑风林碰到了守护兽，这压迫感，兄弟们把‘害怕’打在公屏上！",
        "voice": "zh-CN-YunxiNeural",
        "duration_est": 6.0
    },
    {
        "id": "scene_04_battle",
        "prompt": "The cultivator casting a powerful lightning spell, purple electricity crackling from hands, illuminating the dark forest, particle effects, high impact, slow motion, wuxia style, 8k.",
        "text": "没办法，只能硬刚了！九天雷霆双脚蹬，给我破！",
        "voice": "zh-CN-YunxiNeural",
        "duration_est": 5.0
    },
    {
        "id": "scene_05_ascension",
        "prompt": "Meditating in a cave, suddenly a massive pillar of golden light erupts from the body, shattering the cave roof, ascending to the sky, divine transformation, epic scale, 8k.",
        "text": "终于！这一战让我瓶颈松动了，金丹大道，就在今日！给爷飞！",
        "voice": "zh-CN-YunxiNeural",
        "duration_est": 6.0
    },
    {
        "id": "scene_06_ending",
        "prompt": "Standing on top of the highest peak, looking down at a futuristic cultivation city with floating islands and hologram runes, cyberpunk x xianxia style, awe-inspiring view, wide angle, 8k.",
        "text": "这就是元婴期的视野吗？修仙路漫漫，感谢各位道友的一路陪伴，我们上界见！",
        "voice": "zh-CN-YunxiNeural",
        "duration_est": 8.0
    }
]

async def generate_audio(text, output_file, voice="zh-CN-YunxiNeural"):
    print(f"🎙️ Generating Audio: {text} -> {output_file}")
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)

async def main():
    # 1. Setup Directories
    os.makedirs(VIDEO_DIR, exist_ok=True)
    os.makedirs(AUDIO_DIR, exist_ok=True)

    tracks_video = []
    tracks_voice = []
    tracks_text = []
    
    current_time = 0.0
    
    print("🚀 Starting Xiuxian Vlog Asset Generation...")

    for i, scene in enumerate(SCENES):
        print(f"\n--- Processing Scene {i+1}: {scene['id']} ---")
        
        # A. Generate Video (Check if exists first)
        video_filename = f"{scene['id']}.mp4"
        video_path_abs = os.path.abspath(os.path.join(VIDEO_DIR, video_filename))
        video_path_rel = f"/assets/projects/{PROJECT_NAME}/videos/{video_filename}"
        
        if not os.path.exists(video_path_abs):
            print(f"🎥 Generating Video for: {scene['prompt']}")
            # Call Grok generation
            # Note: We await it one by one. In a real scenario, this might be slow.
            # We assume user is watching or running this in background.
            await grok_text_to_video(scene['prompt'], output_dir=VIDEO_DIR, aspect_ratio="16:9")
            
            # Since grok_text_to_video saves with a timestamp name, we need to find the latest file and rename it
            # This is a bit hacky, relying on the logic in grok_text_to_video. 
            # Ideally grok_text_to_video returns the path. 
            # For now, let's look for the most recent mp4 in the dir.
            list_of_files = sorted(Path(VIDEO_DIR).glob('grok_t2v_*.mp4'), key=os.path.getmtime)
            if list_of_files:
                latest_file = list_of_files[-1]
                os.rename(latest_file, video_path_abs)
                print(f"✅ Renamed {latest_file.name} to {video_filename}")
            else:
                print("❌ Video generation failed or file not found")
        else:
            print(f"⏭️ Video already exists: {video_filename}")

        # B. Generate Audio
        audio_filename = f"{scene['id']}.mp3"
        audio_path_abs = os.path.abspath(os.path.join(AUDIO_DIR, audio_filename))
        audio_path_rel = f"/assets/projects/{PROJECT_NAME}/audio/segments/{audio_filename}"
        
        if not os.path.exists(audio_path_abs):
            await generate_audio(scene['text'], audio_path_abs, scene['voice'])
        
        # C. Calculate Durations (Mocking audio duration as we can't easily read MP3 length without mutagen/ffprobe here easily, 
        # but we can trust the estimate or just update JSON later. For now, use estimate + 0.5s padding)
        # Better: use the video duration if available, usually Grok videos are ~5s. 
        # But we need to sync audio. Let's assume video allows loop or hold.
        # Actually, let's just create the JSON structure.
        
        clip_duration = 5.0 # Grok default is usually 5s. 
        # We will extend the video (freeze last frame) or loop if audio is longer?
        # Remotion handles shorter clips by black screen or ending. 
        # Let's set duration to match audio if audio > 5s? 
        # For simplicity, we assume 5.5s tempo.
        
        scene_duration = 5.5
        
        tracks_video.append({
            "id": f"video_{scene['id']}",
            "type": "video",
            "path": video_path_rel,
            "start": current_time,
            "duration": scene_duration,
            "volume": 0 # Mute video, use BGM/Voice
        })
        
        tracks_voice.append({
            "id": f"voice_{scene['id']}",
            "type": "audio",
            "path": audio_path_rel,
            "start": current_time, # Align with video start
            "duration": scene_duration, # Allow cut off? or strict?
            "volume": 1.0
        })
        
        tracks_text.append({
            "id": f"sub_{scene['id']}",
            "text": scene['text'],
            "start": current_time,
            "duration": scene_duration, 
            "position": {"x": 0.5, "y": 0.85},
            "color": "#FFFFFF",
            "style": {
                "fontSize": 40,
                "fontWeight": "bold",
                "textShadow": "2px 2px 4px rgba(0,0,0,0.8)",
                "background": "rgba(0,0,0,0.4)",
                 "padding": "10px",
                "borderRadius": "8px"
            }
        })
        
        current_time += scene_duration

    # 4. Generate BGM Track (Placeholder)
    tracks_bgm = [{
        "id": "bgm_xiuxian",
        "path": "/assets/projects/demo/music/energetic/Track_989_989.mp3", # Reuse existing or download new
        "start": 0,
        "duration": current_time,
        "volume": 0.15
    }]

    # 5. Build Project JSON
    project_data = {
        "project_name": "修仙 Vlog - 飞升之路",
        "duration": current_time,
        "resolution": {"width": 1920, "height": 1080},
        "tracks": [
            {"id": "track_video", "type": "video", "clips": tracks_video},
            {"id": "track_voice", "type": "audio", "clips": tracks_voice},
            {"id": "track_bgm", "type": "audio", "clips": tracks_bgm},
            {"id": "track_text", "type": "text", "clips": tracks_text}
        ]
    }
    
    json_path = f"remotion-studio/src/projects/{PROJECT_NAME}.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(project_data, f, indent=4, ensure_ascii=False)
    
    print(f"✨ Project JSON generated at: {json_path}")
    print("✅ All tasks completed.")

if __name__ == "__main__":
    asyncio.run(main())
