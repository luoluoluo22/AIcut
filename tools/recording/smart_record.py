
import subprocess
import time
import os
import sys
import json
from pynput import mouse, keyboard
from threading import Thread
import tkinter as tk

# 记录点击和按键事件
events = []
start_time = 0

def on_click(x, y, button, pressed):
    if pressed:
        rel_time = time.time() - start_time
        # 获取屏幕尺寸用于归一化
        root = tk.Tk()
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        root.destroy()
        
        events.append({
            "type": "click",
            "time": round(rel_time, 3),
            "x": round(x / screen_width, 3),
            "y": round(y / screen_height, 3)
        })
        print(f"🖱️ Click at ({x}, {y}) at {rel_time:.2f}s")

def on_press(key):
    rel_time = time.time() - start_time
    events.append({
        "type": "keypress",
        "time": round(rel_time, 3)
    })
    # print(f"⌨️ Key pressed at {rel_time:.2f}s")

def record_logic(duration, output_path):
    global start_time
    print(f"🎬 准备录制桌面 + 行为...")
    print(f"⏳ 请在 5 秒内切换到录制窗口...")
    time.sleep(5)
    
    start_time = time.time()
    
    # 启动事件监听
    mouse_listener = mouse.Listener(on_click=on_click)
    key_listener = keyboard.Listener(on_press=on_press)
    mouse_listener.start()
    key_listener.start()
    
    # 启动 FFmpeg 录屏
    cmd = [
        'ffmpeg', '-y', '-f', 'gdigrab', '-framerate', '30',
        '-i', 'desktop', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-t', str(duration), output_path
    ]
    
    print(f"🔴 录制中... 请开始你的操作！")
    subprocess.run(cmd, capture_output=True)
    
    # 停止监听
    mouse_listener.stop()
    key_listener.stop()
    
    # 保存行为数据
    data_path = output_path.replace(".mp4", "_events.json")
    with open(data_path, "w") as f:
        json.dump(events, f, indent=4)
    
    print(f"✅ 录制完成！视频: {output_path}, 行为数据: {data_path}")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "remotion-studio/public/assets/projects/promo/pro_demo.mp4"
    dur = int(sys.argv[2]) if len(sys.argv) > 2 else 15
    record_logic(dur, path)
