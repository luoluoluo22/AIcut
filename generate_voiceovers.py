"""
生成宣传片配音
使用 Edge TTS
"""

import asyncio
import edge_tts
from pathlib import Path

# 配音文本
scripts = {
    "p1_pain": "每次剪辑视频，找素材找瞎眼，对字幕手抽筋，在预览窗口里耗半条命。难道剪辑视频，就非得这么折磨？",
    
    "p2_magic": "现在，把这些破事扔给AIcut。不用学软件，不用挑花眼。只要给它一个想法，它立马像专业剪辑师一样，帮你找画面、卡节奏、排版样式。动动嘴，剩下的事，它全包了。",
    
    "p3_demo": "假设想做个旅行片，但我手头没素材，脑子一片白。没关系，直接告诉AIcut。它不是死板拼接，而是瞬间帮你找齐画面、配好音乐，连解说词都填好了。以前这得搞一下午，现在基础搭好了，你只管发挥创意：换滤镜、改字体。你负责指挥，干活交给它。",
    
    "p4_outro": "无论你是视频博主、导演、剪辑师。AIcut都能帮你省掉那些枯燥的体力活。让你的创意瞬间落地？一键三连，马上获取。AIcut，全自动剪辑师！"
}

# 输出目录
output_dir = Path("remotion-studio/public/assets/projects/promo_video/audio")
output_dir.mkdir(parents=True, exist_ok=True)

# 语音设置
VOICE = "zh-CN-YunxiNeural"  # 男声,适合宣传
RATE = "+10%"  # 稍快一点,更有节奏感
VOLUME = "+0%"

async def generate_voiceover(text: str, output_path: Path):
    """生成单个配音"""
    print(f"⏬ 正在生成: {output_path.name}")
    
    communicate = edge_tts.Communicate(
        text=text,
        voice=VOICE,
        rate=RATE,
        volume=VOLUME
    )
    
    await communicate.save(str(output_path))
    print(f"✅ 生成成功: {output_path}")

async def main():
    print("=" * 60)
    print("宣传片配音生成")
    print("=" * 60)
    print(f"语音: {VOICE}")
    print(f"速率: {RATE}")
    print(f"输出目录: {output_dir}")
    print("=" * 60)
    
    for key, text in scripts.items():
        output_path = output_dir / f"{key}.mp3"
        await generate_voiceover(text, output_path)
        print()
    
    print("=" * 60)
    print("✅ 所有配音生成完成!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
