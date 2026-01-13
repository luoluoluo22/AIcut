import subprocess
import time
import os
import signal
import sys

def record_desktop(output_path, duration=10, fps=30):
    """
    使用 FFmpeg 录制 Windows 桌面
    """
    print(f"🎬 准备录制桌面...")
    print(f"⏳ 请在 3 秒内切换到你想录制的窗口...")
    time.sleep(3)
    
    # 确保保存目录存在
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    # FFmpeg 命令: 使用 gdigrab 捕获全屏
    # -framerate: 帧率
    # -f gdigrab: Windows 桌面捕获设备
    # -i desktop: 录制整个桌面
    cmd = [
        'ffmpeg',
        '-y',               # 覆盖已有文件
        '-f', 'gdigrab',    # 捕获设备
        '-framerate', str(fps),
        '-i', 'desktop',    # 捕获全屏
        '-c:v', 'libx264',  # 编码格式
        '-pix_fmt', 'yuv420p',
        '-crf', '18',       # 高画质
        '-t', str(duration), # 录制时长
        output_path
    ]
    
    try:
        print(f"🔴 正在录制 ({duration}秒)...")
        process = subprocess.run(cmd, capture_output=True, text=True)
        if process.returncode == 0:
            print(f"✅ 录制完成！文件保存至: {output_path}")
        else:
            print(f"❌ 录制失败: {process.stderr}")
    except Exception as e:
        print(f"❌ 发生错误: {e}")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "remotion-studio/public/assets/projects/promo/desktop_capture.mp4"
    dur = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    record_desktop(path, duration=dur)
