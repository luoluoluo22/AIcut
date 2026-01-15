import os
import sys
import argparse
import json
from pathlib import Path

# 添加当前目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from aicut_sdk import AIcutClient

def generate_subtitles(file_path: str, model_size: str = "base", language: str = None, device: str = "cpu"):
    """
    使用 Whisper 生成字幕并推送到 AIcut Studio
    """
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("❌ 未安装 faster-whisper。请运行: pip install faster-whisper")
        return

    print(f"📦 正在加载 Whisper 模型 ({model_size}) on {device}...")
    try:
        # 强制使用 CPU 以确保稳定性，或者根据参数选择
        model = WhisperModel(model_size, device=device, compute_type="int8")
    except Exception as e:
        print(f"⚠️  {device} 加载失败，由于: {e}")
        if device != "cpu":
            print("🔄 正在回退到 CPU 模式...")
            model = WhisperModel(model_size, device="cpu", compute_type="int8")
        else:
            raise e

    print(f"🎙️  正在处理文件: {file_path}")
    
    # 自动识别语言
    segments, info = model.transcribe(file_path, beam_size=5, language=language)

    print(f"✅ 检测到语言: '{info.language}' (置信度: {info.language_probability:.2f})")
    
    subtitles = []
    print("⏳ 正在转录...")
    
    for segment in segments:
        print(f"   [{segment.start:.2f}s -> {segment.end:.2f}s]: {segment.text}")
        subtitles.append({
            "text": segment.text.strip(),
            "startTime": round(segment.start, 3),
            "duration": round(segment.end - segment.start, 3)
        })

    if not subtitles:
        print("⚠️ 未识别到任何有效语音内容")
        return

    # 推送到 AIcut
    client = AIcutClient()
    print(f"\n🚀 正在推送 {len(subtitles)} 条字幕到 AIcut Studio...")
    
    try:
        # 先清空原有字幕
        client.clear_subtitles()
        # 批量添加
        result = client.add_subtitles(subtitles)
        print(f"✅ 字幕已同步！编辑 ID: {result.get('editId')}")
    except Exception as e:
        print(f"❌ 推送失败: {e}")
        print("💡 请确保 AIcut Studio 开发服务器正在运行 (npm run dev)")

def main():
    parser = argparse.ArgumentParser(description="AIcut 智能字幕插件")
    parser.add_argument("file", help="音视频文件路径")
    parser.add_argument("--model", default="base", help="模型大小: tiny, base, small, medium, large-v3")
    parser.add_argument("--lang", help="指定语言 (例如: zh, en)")
    parser.add_argument("--device", default="cpu", help="运行设备: cpu, cuda")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.file):
        print(f"❌ 文件不存在: {args.file}")
        return

    generate_subtitles(args.file, args.model, args.lang, args.device)

if __name__ == "__main__":
    main()
