import asyncio
import os
import re
import edge_tts

# 音色列表 (与 frontend tts-constants.ts 保持一致)
TTS_VOICES = [
    # 中文女声
    "zh-CN-XiaoxiaoNeural",
    "zh-CN-XiaoyiNeural",
    "zh-CN-XiaohanNeural",
    "zh-CN-XiaomengNeural",
    "zh-CN-XiaoruiNeural",
    "zh-CN-XiaoshuangNeural",
    
    # 中文男声
    "zh-CN-YunxiNeural",
    "zh-CN-YunjianNeural",
    "zh-CN-YunyangNeural",
    "zh-CN-YunxiaNeural",
    
    # 英文
    "en-US-JennyNeural",
    "en-US-GuyNeural",
    "en-GB-SoniaNeural",
    "en-GB-RyanNeural",
]

PREVIEW_TEXT = "这是一段试听文本，用于展示语音合成的效果。"
ENGLISH_PREVIEW_TEXT = "This is a preview text to demonstrate the speech synthesis effect."

async def generate_preview(voice_id):
    # 确定输出目录
    workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(workspace_root, "AIcut-Studio", "apps", "web", "public", "assets", "tts")
    os.makedirs(output_dir, exist_ok=True)
    
    # 处理文件名 (与 ai_daemon.py 逻辑一致)
    safe_voice_id = re.sub(r'[^a-zA-Z0-9-]', '_', voice_id)
    filename = f"preview_{safe_voice_id}.mp3"
    filepath = os.path.join(output_dir, filename)
    
    # 根据语言选择文本
    text = ENGLISH_PREVIEW_TEXT if voice_id.startswith("en-") else PREVIEW_TEXT
    
    print(f"Generating preview for {voice_id} -> {filename}...")
    
    try:
        communicate = edge_tts.Communicate(text, voice_id)
        await communicate.save(filepath)
        print(f"  > Done.")
    except Exception as e:
        print(f"  X Failed: {e}")

async def main():
    print("Starting batch preview generation...")
    # 改为顺序执行，避免并发限制
    for voice_id in TTS_VOICES:
        await generate_preview(voice_id)
        # 添加间隔
        await asyncio.sleep(1.0)
    print("All previews generated.")

if __name__ == "__main__":
    asyncio.run(main())
