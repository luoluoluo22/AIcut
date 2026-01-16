
import os
import shutil
from pathlib import Path

def cleanup_assets():
    base_dir = Path("f:/桌面/开发/AIcut/remotion-studio/public/assets/projects/demo")
    
    # 1. Images
    images_dir = base_dir / "images"
    files_to_delete = [
        images_dir / "Gemini_Generated_Image_ta6uwdta6uwdta6u.png"
    ]
    
    # 2. Audio Segments
    segments_dir = base_dir / "audio/segments"
    files_to_delete.append(segments_dir / "gemini_part1.wav")
    
    # Execute file deletions
    for file_path in files_to_delete:
        if file_path.exists():
            print(f"Removing file: {file_path}")
            file_path.unlink()
            
    # 3. Music Folders
    music_dir = base_dir / "music"
    folders_to_delete = [
        music_dir / "calm",
        music_dir / "epic",
        music_dir / "happy"
    ]
    
    for folder in folders_to_delete:
        if folder.exists():
            print(f"Removing folder: {folder}")
            shutil.rmtree(folder)
            
    # 4. Clean up Energetic Music
    energetic_dir = music_dir / "energetic"
    keep_music = "Track_989_989.mp3"
    
    if energetic_dir.exists():
        for item in energetic_dir.iterdir():
            if item.is_file() and item.name != keep_music:
                print(f"Removing unused music: {item}")
                item.unlink()

    print("Asset cleanup complete.")

if __name__ == "__main__":
    cleanup_assets()
