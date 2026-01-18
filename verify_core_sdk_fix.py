
import sys
import os

# Add tools/core to sys.path to test the specific SDK file we fixed
sys.path.append(os.path.abspath(os.path.join("tools", "core")))

from aicut_sdk import AIcutClient

API_URL = "http://localhost:3000"
PROJECT_ID = "demo"
EXISTING_AUDIO_FILE = r"f:\桌面\开发\AIcut\projects\demo\assets\audio\tts_el_test_1768730583.mp3"

def main():
    print("Testing tools/core/aicut_sdk.py fix...")
    
    # Check if SDK has the updated method signature (simple check)
    import inspect
    sig = inspect.signature(AIcutClient.import_media)
    if 'track_name' not in sig.parameters:
        print("[FAIL] AIcutClient.import_media does not have 'track_name' parameter yet.")
        return

    print("[OK] 'track_name' parameter detected.")

    client = AIcutClient(base_url=API_URL)
    
    print(f"[*] Importing existing TTS file using Core SDK...")
    try:
        res = client.import_media(
            file_path=EXISTING_AUDIO_FILE,
            media_type="audio",
            name="Core SDK Test Audio",
            start_time=10, # Insert at 10s to distinguish
            track_name="AI 语音轨"
        )
        
        if res.get("success"):
            print("[SUCCESS] Import successful via Core SDK.")
        else:
            print(f"[FAIL] Import failed: {res}")

    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    main()
