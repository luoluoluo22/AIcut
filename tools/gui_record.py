import tkinter as tk
from tkinter import messagebox
import threading
import subprocess
import time
import os
import json
import sys
from pynput import mouse, keyboard

class RecordingController:
    def __init__(self, output_path):
        abs_output = os.path.abspath(output_path)
        os.makedirs(os.path.dirname(abs_output), exist_ok=True)
        
        self.output_path = abs_output
        self.events_path = abs_output.replace(".mp4", "_events.json")
        self.is_recording = False
        self.start_time = 0
        self.events = []
        self.process = None
        self.last_mouse_pos = (0.5, 0.5)
        
        # UI
        self.root = tk.Tk()
        self.root.title("AIcut Pro Recorder V2.2")
        self.root.attributes("-topmost", True)
        self.root.geometry("250x180")
        
        self.status_label = tk.Label(self.root, text="Pro Mode: Ready", fg="blue", font=("Arial", 10, "bold"))
        self.status_label.pack(pady=10)
        
        self.start_btn = tk.Button(self.root, text="🎬 Start Recording", command=self.start_countdown, 
                                  bg="#4CAF50", fg="white", width=20, height=2)
        self.start_btn.pack(pady=5)
        
        self.stop_btn = tk.Button(self.root, text="🛑 Stop & Save", command=self.stop_recording, 
                                 bg="#f44336", fg="white", width=20, height=2, state=tk.DISABLED)
        self.stop_btn.pack(pady=5)
        
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()

    def update_mouse_pos(self, x, y):
        self.last_mouse_pos = (round(x / self.screen_width, 3), round(y / self.screen_height, 3))

    def on_click(self, x, y, button, pressed):
        if self.is_recording and pressed:
            self.update_mouse_pos(x, y)
            rel_time = time.time() - self.start_time
            self.events.append({
                "type": "click",
                "time": round(rel_time, 3),
                "x": self.last_mouse_pos[0],
                "y": self.last_mouse_pos[1]
            })

    def on_press(self, key):
        if self.is_recording:
            rel_time = time.time() - self.start_time
            # 输入时，坐标采用当前的鼠标位置（通常是输入框所在位置）
            self.events.append({
                "type": "input",
                "time": round(rel_time, 3),
                "x": self.last_mouse_pos[0],
                "y": self.last_mouse_pos[1]
            })

    def on_move(self, x, y):
        if self.is_recording:
            self.update_mouse_pos(x, y)

    def start_countdown(self):
        self.start_btn.config(state=tk.DISABLED)
        for i in range(3, 0, -1):
            self.status_label.config(text=f"Ready in {i}...")
            self.root.update()
            time.sleep(1)
        self.start_actual_recording()

    def start_actual_recording(self):
        self.is_recording = True
        self.start_time = time.time()
        self.events = []
        self.status_label.config(text="● RECORDING ACTION", fg="red")
        self.stop_btn.config(state=tk.NORMAL)
        
        self.m_listener = mouse.Listener(on_click=self.on_click, on_move=self.on_move)
        self.k_listener = keyboard.Listener(on_press=self.on_press)
        self.m_listener.start()
        self.k_listener.start()
        
        threading.Thread(target=self.run_ffmpeg, daemon=True).start()

    def run_ffmpeg(self):
        cmd = [
            'ffmpeg', '-y', '-f', 'gdigrab', '-framerate', '30',
            '-i', 'desktop', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
            '-crf', '20', self.output_path
        ]
        self.process = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        self.process.wait()

    def stop_recording(self):
        if not self.is_recording: return
        self.is_recording = False
        self.status_label.config(text="Processing...", fg="orange")
        self.root.update()
        
        self.m_listener.stop()
        self.k_listener.stop()
        
        if self.process:
            try:
                self.process.stdin.write(b'q')
                self.process.stdin.flush()
                self.process.wait(timeout=5)
            except:
                self.process.kill()
            
        with open(self.events_path, "w") as f:
            json.dump(self.events, f, indent=4)
            
        messagebox.showinfo("Success", f"Capture Done!\n{len(self.events)} interactions recorded.")
        self.root.destroy()

    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    controller = RecordingController(sys.argv[1] if len(sys.argv) > 1 else "master_demo.mp4")
    controller.run()
