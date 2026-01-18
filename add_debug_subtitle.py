
import sys
import os
import time

# Add tools/core to path for SDK
sys.path.append(os.path.join(os.getcwd(), "tools", "core"))

try:
    from aicut_sdk import AIcutClient
except ImportError:
    print("❌ Critical: Could not import aicut_sdk.")
    sys.exit(1)

def add_debug_sub():
    client = AIcutClient()
    print("📝 Sending 'addSubtitle' command to current project...")
    
    try:
        # Add a subtitle at 3s mark, duration 5s
        # Using bright yellow color to be visible
        client.add_subtitle(
            text="✨ This is a DEBUG Subtitle (Live Added) ✨",
            start_time=3.0,
            duration=5.0,
            y=800,
            font_size=80,
            color="#FFFF00",
            background_color="#0000FF"
        )
        print("✅ Subtitle command sent.")
    except Exception as e:
        print(f"❌ Failed: {e}")

if __name__ == "__main__":
    add_debug_sub()
