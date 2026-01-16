import os
import json
from flux_api import generate_image_flux

def upgrade_demo_with_flux():
    project_path = "remotion-studio/src/projects/demo.json"
    assets_dir = "remotion-studio/public/assets/projects/demo/images"
    
    with open(project_path, "r", encoding="utf-8") as f:
        project = json.load(f)
    
    # 定义分镜提示词（针对我们那三句简短脚本）
    # 1. 你好，我是 AIcut。
    # 2. 我是一个 AI 原生视频剪辑引擎。
    # 3. 只需给我一个想法，剩下的交给我。
    scenes = [
        {
            "id": "scene_01",
            "prompt": "一个极简主义风格的白色房间，中心悬浮着一个拥有全息界面的科技机器人助理，电影级光影，8k分辨率，高精细节",
            "filename": "kolors_scene_01.png"
        },
        {
            "id": "scene_02",
            "prompt": "神经网络数字大脑的近景，带有发光的连接细节，代表AI视频处理，深蓝色科技感背景，专业美学，4k",
            "filename": "kolors_scene_02.png"
        },
        {
            "id": "scene_03",
            "prompt": "一个充满创意的办公空间，笔记本电脑上方有一个发光的魔法灯泡，电影感，梦幻氛围，背景柔焦，超写实",
            "filename": "kolors_scene_03.png"
        }
    ]

    print("🚀 开始使用 Flux 生成高清分镜素材...")
    
    generated_images = []
    for scene in scenes:
        output_path = os.path.join(assets_dir, scene["filename"])
        success = generate_image_flux(scene["prompt"], output_path)
        if success:
            generated_images.append({
                "path": f"/assets/projects/demo/images/{scene['filename']}",
                "duration": 0 # 后面动态分配
            })

    if not generated_images:
        print("❌ 没有生成的图片，停止更新。")
        return

    # 重新分配视频轨道 (track_video)
    # 我们有 3 张图，平均分配 11.6s 的时长
    total_duration = project.get("duration", 10.0)
    per_image_duration = total_duration / len(generated_images)
    
    new_clips = []
    current_time = 0.0
    for img in generated_images:
        new_clips.append({
            "id": f"flux_clip_{len(new_clips)}",
            "type": "image",
            "path": img["path"],
            "start": round(current_time, 2),
            "duration": round(per_image_duration, 2)
        })
        current_time += per_image_duration

    # 更新项目 JSON
    if "tracks" in project:
        for track in project["tracks"]:
            if track["type"] == "video":
                track["clips"] = new_clips
                print(f"✅ 已更新视频轨道: 替换为 {len(new_clips)} 个 Flux 生成的原创素材")

    with open(project_path, "w", encoding="utf-8") as f:
        json.dump(project, f, ensure_ascii=False, indent=4)
    
    print("\n✨ 恭喜！Demo 已成功从“白底图片”升级为“AI 原生分镜”视频！")
    print("👉 请刷新浏览器 localhost:3000 查看效果。")

if __name__ == "__main__":
    upgrade_demo_with_flux()
