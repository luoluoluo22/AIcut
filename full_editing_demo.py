import sys
import os
import time

# 确保能找到 aicut_sdk
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), ".agent/skills/aicut-editing/scripts")))
from aicut_sdk import AIcutClient

def main():
    client = AIcutClient("http://localhost:3000")
    
    print("🚀 开始全流程自动化剪辑...")
    
    # 1. 导入背景视频
    print("📺 导入主视频...")
    client.import_media(
        file_path=r"F:\桌面\AI还原纪录片\AI还原纪录片.mp4",
        media_type="video",
        name="纪录片主素材",
        start_time=0
    )
    
    # 2. 导入配乐
    print("🎵 导入背景音频...")
    client.import_media(
        file_path=r"F:\Backup\Downloads\test.mp3",
        media_type="audio",
        name="背景音乐",
        start_time=0
    )
    
    # 3. 导入覆盖层图片 (设在 5s 开始)
    print("🖼️ 导入贴纸/图片...")
    client.import_media(
        file_path=r"F:\桌面\AI还原纪录片\AI还原纪录片-封面.jpg",
        media_type="image",
        name="水印封面",
        start_time=5,
        duration=3
    )

    # 4. 批量添加字幕
    print("✍️  批量添加字幕...")
    client.add_subtitles([
        {"text": "欢迎来到 AI 还原的世界", "startTime": 1, "duration": 3},
        {"text": "这是由 AIcut 自动化生成的工程", "startTime": 4.5, "duration": 3},
        {"text": "全路径支持与缩略图自动生成", "startTime": 8, "duration": 4},
    ])
    
    print("✅ 全流程剪辑执行完毕！工程已同步。")

if __name__ == "__main__":
    main()
