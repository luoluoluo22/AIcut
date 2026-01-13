---
description: 使用 Google AI Studio (Gemini 2.5) 生成高质量 TTS，绕过 API 限制和 403 错误
---

# Google AI Studio TTS 自动化生成工作流

该工作流利用 Browser Subagent 模拟真实用户操作，结合系统剪贴板中转，从 Google AI Studio 获取高质量的 Gemini 2.5 语音。

## ⚠️ 前置条件

1.  **Google 账号**：必须拥有一个 Google 账号。
2.  **人工值守**：启动任务后，**必须**在弹出的 Chrome 窗口中**手动完成登录**（如果未自动登录）。
3.  **Python 环境**：用于运行剪贴板保存脚本。
4.  **辅助脚本**：项目根目录下需要有 `save_clipboard_audio.py`。

### 0. 准备辅助脚本 (`save_clipboard_audio.py`)

如果项目根目录没有该脚本，请先创建：

```python
import subprocess
import base64
import sys
import os

def save_audio(output_path):
    print("Getting clipboard content...")
    # Get clipboard content using powershell
    ps_command = "Get-Clipboard"
    result = subprocess.run(["powershell", "-command", ps_command], capture_output=True, text=True, encoding='utf-8')
    
    if result.returncode != 0:
        print("Error getting clipboard:", result.stderr)
        return

    b64_data = result.stdout.strip()
    
    # Remove all whitespace/newlines
    b64_data = "".join(b64_data.split())
    
    # Remove prefix if present
    if "base64," in b64_data:
        b64_data = b64_data.split("base64,")[1]
        
    print(f"Base64 length: {len(b64_data)}")
    
    try:
        audio_data = base64.b64decode(b64_data)
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "wb") as f:
            f.write(audio_data)
        print(f"Successfully saved to {output_path}")
    except Exception as e:
        print(f"Error decoding/saving: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python save_clipboard_audio.py <output_path>")
    else:
        save_audio(sys.argv[1])
```

## 1. 文本分段

Google AI Studio Web 端有约 **29秒** 的生成限制。长文案必须分段。

*   **建议长度**：每段中文约 80-100 字。
*   **示例**：
    *   Part 1: 痛点描述...
    *   Part 2: 解决方案...
    *   Part 3: 结尾升华...

## 2. 执行生成 (Agent 操作指南)

对于每一段文本，Agent 需要执行以下步骤：

### Step A: 启动 Browser Subagent
**Task**:
1.  Go to `https://aistudio.google.com/generate-speech?model=gemini-2.5-pro-preview-tts`
2.  **WAIT** for user login (check manual interaction).
3.  Clear "Style instructions" (top textarea).
4.  Enter text into "Text" (bottom textarea).
5.  Click "Run".
6.  Wait 15-20s for generation.
7.  Execute JS to extract audio Base64 to **Clipboard**:
    ```javascript
    (async () => {
      const audio = document.querySelector('audio');
      if (!audio || !audio.src) return "No audio source found";
      try {
        const blob = await fetch(audio.src).then(r => r.blob());
        const reader = new FileReader();
        const base64Promise = new Promise(resolve => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        const base64 = await base64Promise;
        
        // Copy to clipboard via hidden textarea
        const textArea = document.createElement("textarea");
        textArea.value = base64;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        return "Copied to clipboard";
      } catch (e) { return "Error: " + e; }
    })()
    ```

### Step B: 保存音频

Agent 在本地终端运行：
```bash
python save_clipboard_audio.py "path/to/output/filename.wav"
```

## 3. 合并音频 (可选)

生成所有片段后，通常需要将文件名更新到 `promo_video.json` 或使用 `ffmpeg` 合并。
