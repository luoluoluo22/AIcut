import sys
import os
import time
import json

# 确保能找到 aicut_sdk
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), ".agent/skills/aicut-editing/scripts")))
from aicut_sdk import AIcutClient

def main():
    client = AIcutClient("http://localhost:3000")
    source_dir = r"F:\桌面\AIcut小白教程\需要剪辑的素材"
    
    print(f"🎬 开始处理小白教程素材: {source_dir}")
    
    # 0. 先清空当前所有轨道，保证从零开始
    print("🧹 清空当前轨道...")
    empty_snap = client.get_snapshot()
    empty_snap["tracks"] = [{
        "id": "main-track",
        "name": "Main Track",
        "type": "media",
        "elements": [],
        "muted": False,
        "isMain": True
    }]
    empty_snap["assets"] = []
    client.update_snapshot(empty_snap)

    # 我们动态获取时长
    # narration_duration = 28.37
    # bgm_duration = 245.4
    
    narration_path = os.path.join(source_dir, "旁白.mp3")
    bgm_path = os.path.join(source_dir, "群星下的远征.mp3")
    
    if not os.path.exists(narration_path) or not os.path.exists(bgm_path):
        print("❌ 错误: 找不到 旁白.mp3 或 群星下的远征.mp3")
        return

    # Use hidden SDK method provided by the client instance logic or calculate locally?
    # Since we are using an instance of AIcutClient, and we know it has helper methods...
    # But _get_media_duration is protected. We should ideally use a public method or just call it if we don't care about politeness.
    # Alternatively, we calculate it here using ffprobe if available, but the SDK has it.
    # Let's be pragmatic users of our own internal tool.
    
    print("📏 计算素材时长...")
    # Note: client._get_media_duration is available because we are importing the class source in this environment
    narration_duration = client._get_media_duration(narration_path)
    bgm_duration = client._get_media_duration(bgm_path)
    
    print(f"   旁白时长: {narration_duration}s")
    print(f"   BGM时长: {bgm_duration}s")

    # 1. 导入旁白 (使用专用轨道)
    narration_path = os.path.join(source_dir, "narration.wav") 
    print(f"🎙️  导入旁白 (WAV format)...")
    narration_duration = client._get_media_duration(narration_path)
    client.import_media(
        file_path=narration_path,
        media_type="audio",
        name="narration",
        start_time=0,
        duration=narration_duration, 
        track_name="Narration Track"
    )
    
    # 2. 导入背景音乐 (使用另一条轨道)
    # 也使用 WAV，彻底解决 MP3 在浏览器缓存的问题
    bgm_path = os.path.join(source_dir, "bgm.wav")
    print(f"🎶 导入背景音乐 (bgm.wav)...")
    client.import_media(
        file_path=bgm_path,
        media_type="audio",
        name="bgm_wav", # 更新名称
        start_time=0,
        duration=bgm_duration, 
        track_name="BGM Track"
    )
    
    # 修改音量逻辑
    snapshot = client.get_snapshot()
    for track in snapshot.get("tracks", []):
        if track.get("name") == "BGM Track":
            for el in track.get("elements", []):
                if el.get("name") == "bgm_wav":
                    el["volume"] = 0.3 # BGM 调小

        if track.get("name") == "Narration Track":
            for el in track.get("elements", []):
                pass
                    
    client.update_snapshot(snapshot)

    # 3. 导入图片序列并应用缩放效果 (Scale)
    images = [f for f in os.listdir(source_dir) if f.endswith(".png")]
    images.sort() # 保证顺序一致
    
    img_duration = narration_duration / len(images)
    print(f"🖼️  平分时长: 每张图片展示 {img_duration:.2f}秒")
    
    for i, img_name in enumerate(images):
        start_t = i * img_duration
        img_path = os.path.join(source_dir, img_name)
        
        print(f"   [{i+1}/{len(images)}] 导入: {img_name}")
        # 使用 SDK 导入，我们会后续手动补上缩放属性
        client.import_media(
            file_path=img_path,
            media_type="image",
            name=f"素材_{i+1}",
            start_time=start_t,
            duration=img_duration
        )

    # 4. 再次获取 snapshot，应用“缩放效果” (这里我们模仿运动效果，给一个较长的 scale 设定)
    # 虽然目前没有 Keyframe 系统，但我们可以给每个元素一个不同的初始 Scale
    final_snapshot = client.get_snapshot()
    for track in final_snapshot.get("tracks", []):
        if track.get("type") == "media":
            for el in track.get("elements", []):
                if "素材_" in el.get("name", ""):
                    # 增加初始缩放，模拟缩放感
                    el["scale"] = 1.05 
                    # 如果前端支持简单的 zoom 属性 (metadata 标记)
                    if "metadata" not in el: el["metadata"] = {}
                    el["metadata"]["animation"] = "zoomIn"

    client.update_snapshot(final_snapshot)
    
    print("✅ 剪辑完成！所有图片已对齐旁白，背景音乐已调优，并添加了缩放标记。")

    # 5. 触发网页自动刷新 (笨办法但有效)
    # 稍微延迟一下，确保之前的 snapshot 更新已经写入并被 SSE 接收
    time.sleep(1) 
    print("🔄 正在请求网页自动刷新...")
    sync_input_path = os.path.join(os.getcwd(), "ai_workspace", "sync-input.json")
    with open(sync_input_path, "w", encoding="utf-8") as f:
        json.dump({"action": "forceRefresh", "timestamp": time.time()}, f)

if __name__ == "__main__":
    main()
