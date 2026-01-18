
import subprocess
import sys
import os
import shutil

def test_video():
    # 1. 确定脚本路径
    script_path = os.path.join("tools", "generators", "grok_adapter.py")
    if not os.path.exists(script_path):
        print(f"Error: Script not found at {script_path}")
        return

    # 2. 准备输出目录
    output_dir = os.path.abspath("test_video_output")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print("="*50)
    print("AIcut Video Generation Standalone Test")
    print("="*50)
    print("此测试将直接调用 grok_adapter.py 来生成视频。")
    print("⚠️  重要提示: ")
    print("1. 请确保您已经完全关闭了所有 Chrome 浏览器窗口。")
    print("   这非常重要，否则脚本可能连接到错误的 Chrome 实例（导致未登录）。")
    print("2. 脚本将自动启动一个新的 Chrome 窗口。")
    print("3. 如果您看到验证码，请在该 Chrome 窗口中手动完成验证。")
    print("4. 如果提示未登录，请在该窗口中登录 Grok。")
    print("="*50)
    
    confirm = input("已关闭所有 Chrome 窗口？按 Enter 继续 (或输入 n 退出): ")
    if confirm.lower() == 'n':
        print("已取消。")
        return

    # 3. 构造命令
    input_prompt = "A cyberpunk street with neon lights, raining, 4k, realistic"
    cmd = [
        sys.executable, script_path,
        "--mode", "text",
        "--prompt", input_prompt,
        "--output_dir", output_dir
    ]
    
    print(f"\n执行命令: {' '.join(cmd)}")
    print("-" * 20 + " LOGS START " + "-" * 20)

    # 4. 执行
    try:
        # 使用 Popen 以便实时查看输出
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding='utf-8',
            errors='replace'
        )

        while True:
            line = process.stdout.readline()
            if not line and process.poll() is not None:
                break
            if line:
                print(line.strip())
        
        rc = process.poll()
        print("-" * 20 + " LOGS END " + "-" * 20)
        
        if rc == 0:
            print(f"\n✅ 测试成功！视频已保存到: {output_dir}")
            # 列出生成的文件
            files = os.listdir(output_dir)
            for f in files:
                print(f"   - {f}")
        else:
            print(f"\n❌ 测试失败，退出代码: {rc}")

    except Exception as e:
        print(f"\n❌ 执行出错: {e}")

if __name__ == "__main__":
    test_video()
