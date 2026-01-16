import json
import sys
import os

def process_events(events_path, fps=30, idle_timeout=1.5):
    """
    智能分析事件轨迹，生成 Remotion Zoom 特效数据
    idle_timeout: 动作停止超过 1.5 秒后自动拉远镜头
    """
    with open(events_path, "r") as f:
        events = json.load(f)
    
    if not events: return []

    zoom_segments = []
    current_segment = None
    
    for event in events:
        event_time = event["time"]
        frame = int(event_time * fps)
        
        # 如果当前没有在记录缩放段，或者距离上一个事件太久，则开启新段
        if current_segment is None:
            current_segment = {
                "startFrame": max(0, frame - 10), # 提前10帧开始推镜头
                "last_active": frame,
                "x": event.get("x", 0.5),
                "y": event.get("y", 0.5),
                "scale": 2.2 # 默认放大倍数
            }
        else:
            # 还在活跃期（距离上次动作小于 idle_timeout）
            if frame - current_segment["last_active"] < idle_timeout * fps:
                current_segment["last_active"] = frame
                # 如果这个事件有新坐标，可以缓慢平移镜头（可选简化处理：保持原位）
            else:
                # 动作断档了，结束这一段并开启下一段
                current_segment["endFrame"] = current_segment["last_active"] + 15
                zoom_segments.append(current_segment)
                current_segment = {
                    "startFrame": frame - 10,
                    "last_active": frame,
                    "x": event.get("x", 0.5),
                    "y": event.get("y", 0.5),
                    "scale": 2.2
                }
                
    if current_segment:
        current_segment["endFrame"] = current_segment["last_active"] + 15
        zoom_segments.append(current_segment)

    # 转化为 Remotion Effect 格式
    effects = []
    for seg in zoom_segments:
        effects.append({
            "type": "Zoom",
            "props": {
                "startFrame": seg["startFrame"],
                "endFrame": seg["endFrame"],
                "scale": seg["scale"],
                "x": seg["x"],
                "y": seg["y"]
            }
        })
    return effects

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python apply_smart_zoom.py <events_json>")
        sys.exit(1)
    
    effects = process_events(sys.argv[1])
    print(json.dumps(effects, indent=4))
