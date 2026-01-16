import asyncio
import edge_tts
import os

OUTPUT_FILE = "remotion-studio/public/assets/projects/promo_video/audio/segments/s01.mp3"
VOICE = "zh-CN-YunyangNeural"
RATE = "+0%"
VOLUME = "+0%"
TEXT = "眼前这个 AIcut 的表现相当出乎意料，"

async def main():
    print(f"Regenerating {OUTPUT_FILE}...")
    communicate = edge_tts.Communicate(TEXT, VOICE, rate=RATE, volume=VOLUME)
    await communicate.save(OUTPUT_FILE)
    print("Done.")

if __name__ == "__main__":
    asyncio.run(main())
