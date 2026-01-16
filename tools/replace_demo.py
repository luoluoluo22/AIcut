import json
import time

SNAPSHOT_PATH = "ai_workspace/project-snapshot.json"
TARGET_ELEMENT_ID = "el_panda_1768554094"
NEW_ASSET_NAME = "scene_bamboo.png"
NEW_ASSET_TYPE = "image"
NEW_ASSET_URL = "/materials/images/scene_bamboo.png"

def replace_clip():
    print(f"Reading snapshot...")
    with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
        snapshot = json.load(f)

    # 1. 查找或注册新素材
    assets = snapshot.get("assets", [])
    new_asset = next((a for a in assets if a["name"] == NEW_ASSET_NAME), None)
    
    if not new_asset:
        # 如果素材不存在，则注册
        new_asset = {
            "id": f"asset_bamboo_{int(time.time())}",
            "name": NEW_ASSET_NAME,
            "type": NEW_ASSET_TYPE,
            "url": NEW_ASSET_URL,
            "duration": 5 # 默认时长
        }
        assets.append(new_asset)
        print(f"Registered new asset: {NEW_ASSET_NAME}")
    else:
        print(f"Found existing asset: {new_asset['id']}")

    # 2. 查找并替换时间轴上的片段
    tracks = snapshot.get("tracks", [])
    replaced = False
    
    for track in tracks:
        for element in track.get("elements", []):
            if element["id"] == TARGET_ELEMENT_ID:
                print(f"Found target element: {element['name']} in track {track['id']}")
                
                # 保持原有的时空属性 (startTime, duration, x, y, etc.)
                # 仅替换内容属性 (mediaId, name, url)
                element["mediaId"] = new_asset["id"]
                element["name"] = new_asset["name"]
                element["url"] = new_asset["url"]
                
                # 图片默认时长处理 (如果原片段是图片，时长通常保留；如果是视频换图片，可能需要检查)
                # 这里用户意图是替换，通常保留原有长度
                
                replaced = True
                break
        if replaced: break

    if replaced:
        print("Saving snapshot...")
        with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2, ensure_ascii=False)
        print("Done! Element replaced.")
    else:
        print(f"Error: Element {TARGET_ELEMENT_ID} not found.")

if __name__ == "__main__":
    replace_clip()
