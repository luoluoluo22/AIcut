import os
import requests
import json
import subprocess
import tempfile
import time

def test_recognition():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("Error: GROQ_API_KEY not found in environment.")
        return

    file_path = r"F:\桌面\AI还原纪录片\AI还原纪录片.mp4"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    temp_dir = tempfile.gettempdir()
    temp_audio = os.path.join(temp_dir, f"test_v2_{int(time.time())}.wav")
    
    print(f"Extracting first 20s to WAV...")
    cmd = [
        "ffmpeg", "-y", "-ss", "0", "-t", "20",
        "-i", file_path, "-vn", "-ar", "16000", "-ac", "1", "-f", "wav", temp_audio
    ]
    subprocess.run(cmd, capture_output=True, check=True)

    print("Sending to Groq Whisper (with granularities)...")
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    with open(temp_audio, "rb") as f:
        files = {"file": (os.path.basename(temp_audio), f)}
        data = {
            "model": "distil-whisper-large-v3-en" if False else "whisper-large-v3-turbo",
            "response_format": "verbose_json",
            "language": "zh",
            "timestamp_granularities[]": "word" # Groq API syntax for array might vary
        }
        
        resp = requests.post(url, headers=headers, files=files, data=data)
        if resp.status_code != 200:
            print(f"API Error: {resp.status_code} - {resp.text}")
            return
        
        result = resp.json()
        print(f"DEBUG: Result keys: {list(result.keys())}")
        if "error" in result:
            print(f"DEBUG: Error in result: {result['error']}")
            
        if result.get("segments"):
            print("\n=== SEGMENTS ===")
            for seg in result["segments"]:
                print(f"SEG [{seg['start']:.2f}s -> {seg['end']:.2f}s]: {seg['text']}")
        
        if result.get("words"):
            print("\n=== WORDS (First 15) ===")
            for w in result["words"][:15]:
                print(f"WORD [{w['start']:.2f}s -> {w['end']:.2f}s]: {w['word']}")
        else:
            print("\nNo word-level timestamps found.")

    if os.path.exists(temp_audio):
        os.remove(temp_audio)

if __name__ == "__main__":
    test_recognition()
