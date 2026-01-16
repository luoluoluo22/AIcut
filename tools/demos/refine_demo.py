
import os
import json
from pathlib import Path

def refine_demo_project():
    project_path = Path("remotion-studio/src/projects/demo.json")
    
    # 1. Delete video files
    video_dir = Path("remotion-studio/public/assets/projects/demo/videos")
    files_to_delete = [
        video_dir / "screen_recording.mp4",
        video_dir / "screen_recording_2.mp4"
    ]
    
    for file_path in files_to_delete:
        if file_path.exists():
            print(f"Deleting video: {file_path}")
            file_path.unlink()
            
    # 2. Update demo.json
    with open(project_path, 'r', encoding='utf-8') as f:
        project = json.load(f)
        
    # Find video track
    for track in project['tracks']:
        if track['id'] == 'track_video':
            # Replace clips with a single white background clip
            track['clips'] = [
                {
                    "id": "bg_white_full",
                    "name": "全屏白底",
                    "path": "/assets/projects/demo/images/white_bg.png",
                    "start": 0,
                    "duration": project['duration'], # Cover full duration
                    "position": {
                        "x": 0.5,
                        "y": 0.5
                    },
                    "style": {
                         # Optional: ensure it covers screen if image size differs, 
                         # but white_bg.png is likely 1920x1080 or solid color behaves well
                    }
                }
            ]
            print("Updated video track to use white background.")
            
    # Save updated json
    with open(project_path, 'w', encoding='utf-8') as f:
        json.dump(project, f, indent=4, ensure_ascii=False)
    print("Saved demo.json.")

if __name__ == "__main__":
    refine_demo_project()
