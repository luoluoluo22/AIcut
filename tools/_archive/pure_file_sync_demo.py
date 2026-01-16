import json
import os
import time

# Resolve the synchronization directory (now in project root /.aicut)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EDITS_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '.aicut'))
SYNC_FILE = os.path.join(EDITS_DIR, 'sync-input.json')

def update_timeline_via_file(tracks):
    """直接通过修改磁盘上的 JSON 文件来更新网页"""
    print(f"--- 正在写入文件: {SYNC_FILE} ---")
    data = {
        "action": "setFullState",
        "tracks": reversed(tracks) # 演示：故意反转一下轨道
    }
    
    # 确保目录存在
    os.makedirs(os.path.dirname(SYNC_FILE), exist_ok=True)
    
    with open(SYNC_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("写入完成！请观察网页端是否即刻重绘。")

# 1. 准备一份精美的全量状态
# 我们先从之前的快照里拿点素材 ID (硬编码演示)
# 实际上你可以先读取 project-snapshot.json 获取正确的素材 ID
tracks_demo = [
    {
        "id": "hot_reload_track",
        "name": "热更新轨道",
        "type": "text",
        "elements": [
            {
                "id": "hot_msg", "type": "text", "name": "提示", 
                "content": "🔥 终极方案：纯文件热更新已激活",
                "startTime": 0, "duration": 10, 
                "trimStart": 0, "trimEnd": 0,
                "x": 960, "y": 540, "fontSize": 80, "fontWeight": "bold",
                "color": "#00FF00", "backgroundColor": "rgba(0,0,0,0.7)",
                "textAlign": "center", "opacity": 1
            }
        ]
    }
]

print(">>> 即将演示：不通过 API，直接通过物理文件驱动网页更新")
update_timeline_via_file(tracks_demo)

time.sleep(2)

# 2. 再次修改文件
print("\n>>> 2 秒后再次物理修改文件内容...")
tracks_demo[0]["elements"][0]["content"] = "🚀 这种感觉就像是在 VS Code 里写 CSS 一样快"
tracks_demo[0]["elements"][0]["color"] = "#00FFFF"
update_timeline_via_file(tracks_demo)
