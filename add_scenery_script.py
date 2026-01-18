
import sys
import os
import shutil
import time

# SDK path setup
sys.path.append(os.path.join(os.getcwd(), "tools", "core"))
try:
    from aicut_sdk import AIcutClient
except ImportError:
    print("Error: SDK not found")
    sys.exit(1)

def main():
    # Source Images from Artifacts
    # Note: These paths are safe to read by the backend
    sources = [
        ("C:/Users/Administrator/.gemini/antigravity/brain/2bc37b6b-411d-4043-9128-16bc99a4c059/mountain_sunrise_1768709018639.png", "Mountain Sunrise"),
        ("C:/Users/Administrator/.gemini/antigravity/brain/2bc37b6b-411d-4043-9128-16bc99a4c059/lake_morning_1768709037860.png", "Misty Lake"),
        ("C:/Users/Administrator/.gemini/antigravity/brain/2bc37b6b-411d-4043-9128-16bc99a4c059/forest_autumn_1768709059318.png", "Autumn Forest")
    ]
    
    client = AIcutClient()
    duration = 5.0
    
    # Clear existing subtitles first
    print("   [Clean] Clearing existing subtitles...")
    try:
        client.clear_subtitles()
    except:
        pass

    print(f"🌲 Adding {len(sources)} scenery images to current project...")
    
    subtitles = []
    
    for i, (src, title) in enumerate(sources):
        # Construct destination path
        project_folder_name = "Skill Demo 12_00_06"
        project_path = os.path.join(os.getcwd(), "projects", project_folder_name)
        assets_dir = os.path.join(project_path, "assets", "images")
        
        if not os.path.exists(assets_dir):
            os.makedirs(assets_dir)

        filename = f"scenery_{i+1}.png"
        dst = os.path.join(assets_dir, filename)

        # Copy file first
        try:
            shutil.copy(src, dst)
            print(f"   [File] Copied to {dst}")
        except Exception as e:
            print(f"   ⚠️ Copy failed (might already exist): {e}")

        start_time = i * duration
        
        # captions
        caption = f"📍 {title}"
        description = "AI Generated Landscape"
        
        print(f"   [Import] {title} at {start_time}s")
        
        # Import using the PROJECT FILE PATH (more reliable)
        client.import_image(
            file_path=dst,
            name=title,
            start_time=start_time,
            duration=duration
        )
        
        # Prepare subtitle
        subtitles.append({
            "text": caption,
            "startTime": start_time,
            "duration": duration,
            "y": 850,
            "fontSize": 80,
            "color": "#FFFFFF",
            "backgroundColor": "#000000",
            "fontFamily": "Arial"
        })
        
        time.sleep(1.0) # Increase delay

    print("   [Subtitles] Adding text tracks...")
    client.add_subtitles(subtitles)
    
    print("✅ Scenery added successfully!")

if __name__ == "__main__":
    main()
