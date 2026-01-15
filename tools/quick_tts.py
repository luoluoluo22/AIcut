import asyncio
import edge_tts
import os
import json

async def generate_speech(text, output_path, voice="zh-CN-YunxiNeural"):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    print(f"Generated: {output_path}")

async def main():
    base_dir = "AIcut-Studio/apps/web/public/materials/ai-generated"
    os.makedirs(base_dir, exist_ok=True)
    
    tasks = [
        generate_speech("在两千米深的幽暗海沟，人类并非唯一的访客。", f"{base_dir}/v1.mp3"),
        generate_speech("赛博纪元的深海哨站，正在这片永恒的黑暗中苏醒。", f"{base_dir}/v2.mp3")
    ]
    await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
