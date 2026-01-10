import subprocess
import base64
import sys
import os

def save_audio(output_path):
    print("Getting clipboard content...")
    # Get clipboard content using powershell
    ps_command = "Get-Clipboard"
    result = subprocess.run(["powershell", "-command", ps_command], capture_output=True, text=True, encoding='utf-8') # Encoding might be an issue, system default usually gbk/utf8
    
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
