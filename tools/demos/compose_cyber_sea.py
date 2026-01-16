import os
import json
import time

def main():
    base_url = "/materials/ai-generated"
    gen_dir = "AIcut-Studio/apps/web/public/materials/ai-generated"
    
    # 查找最新的图片和视频
    files = os.listdir(gen_dir)
    images = sorted([f for f in files if f.endswith(".jpg")], key=lambda x: os.path.getmtime(os.path.join(gen_dir, x)))
    videos = sorted([f for f in files if f.endswith(".mp4")], key=lambda x: os.path.getmtime(os.path.join(gen_dir, x)))
    audios = [f for f in files if f.endswith(".mp3")] # v1.mp3, v2.mp3
    
    if not images or not videos or len(audios) < 2:
        print("Waiting for assets... Found:", files)
        return

    latest_img = images[-1]
    latest_vid = videos[-1]

    snapshot = {
        "project": {
            "id": "cyber-sea",
            "name": "Cyberpunk Deepsea",
            "fps": 30,
            "canvasSize": { "width": 1920, "height": 1080 }
        },
        "tracks": [
            {
                "id": "audio-track",
                "name": "AI配音",
                "type": "audio",
                "elements": [
                    {
                        "id": "a1", "startTime": 0.5, "duration": 4.0, "mediaId": "v1", "name": "V1", "type": "media"
                    },
                    {
                        "id": "a2", "startTime": 5.0, "duration": 5.0, "mediaId": "v2", "name": "V2", "type": "media"
                    }
                ]
            },
            {
                "id": "video-track",
                "name": "主背景",
                "type": "media",
                "elements": [
                    {
                        "id": "v-vid", "startTime": 0, "duration": 5.0, "mediaId": "vid1", "name": "鱼群视频", "type": "media"
                    },
                    {
                        "id": "v-img", "startTime": 5.0, "duration": 5.0, "mediaId": "img1", "name": "哨站图像", "type": "media",
                        "transition": { "in": { "type": "fade", "duration": 1.0 } }
                    }
                ]
            },
            {
              "id": "sub-track",
              "name": "AI字幕",
              "type": "text",
              "elements": [
                {
                  "id": "s1", "startTime": 0.5, "duration": 3.5, "content": "在两千米深的幽暗海沟，人类并非唯一的访客。", "x": 960, "y": 900, "fontSize": 52, "color": "#00FFFF", "type": "text"
                },
                {
                  "id": "s2", "startTime": 5.0, "duration": 4.5, "content": "赛博纪元的深海哨站，正在这片永恒的黑暗中苏醒。", "x": 960, "y": 900, "fontSize": 52, "color": "#00FFFF", "type": "text"
                }
              ]
            }
        ],
        "assets": [
            { "id": "v1", "name": "v1.mp3", "type": "audio", "url": f"{base_url}/v1.mp3" },
            { "id": "v2", "name": "v2.mp3", "type": "audio", "url": f"{base_url}/v2.mp3" },
            { "id": "img1", "name": latest_img, "type": "image", "url": f"{base_url}/{latest_img}" },
            { "id": "vid1", "name": latest_vid, "type": "video", "url": f"{base_url}/{latest_vid}" }
        ]
    }
    
    with open("ai_workspace/project-snapshot.json", "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)
    print("🚀 Project Snapshot Updated with AI Assets!")

if __name__ == "__main__":
  main()
