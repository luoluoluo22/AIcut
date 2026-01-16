
import os
import shutil
import json
from pathlib import Path

def cleanup_projects():
    base_dir = Path("f:/桌面/开发/AIcut")
    projects_dir = base_dir / "remotion-studio/src/projects"
    assets_dir = base_dir / "remotion-studio/public/assets/projects"

    # 1. Define what to keep (original names) and what to rename to
    keep_project = "promo_video"
    new_name = "demo"

    # 2. Files/Folders to delete (everything else)
    # We'll list everything and check if it matches the 'keep' target
    
    # Clean up JSON projects
    if projects_dir.exists():
        for item in projects_dir.iterdir():
            if item.is_file():
                if item.stem == keep_project or (item.name.startswith(keep_project + "_") and item.suffix == ".srt"):
                    continue # Keep this
                print(f"Deleting project file: {item}")
                item.unlink()

    # Clean up Assets
    if assets_dir.exists():
        for item in assets_dir.iterdir():
            if item.is_dir():
                if item.name == keep_project:
                    continue # Keep this
                print(f"Deleting asset folder: {item}")
                shutil.rmtree(item)

    # 3. Rename "promo_video" -> "demo"
    # Rename folder
    old_asset_folder = assets_dir / keep_project
    new_asset_folder = assets_dir / new_name
    if old_asset_folder.exists() and not new_asset_folder.exists():
        print(f"Renaming assets: {old_asset_folder} -> {new_asset_folder}")
        os.rename(old_asset_folder, new_asset_folder)
    
    # Rename project JSON
    old_json = projects_dir / f"{keep_project}.json"
    new_json = projects_dir / f"{new_name}.json"
    if old_json.exists():
        print(f"Renaming project JSON: {old_json} -> {new_json}")
        os.rename(old_json, new_json)
        
        # 4. Update content in the new JSON
        with open(new_json, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Replace paths
        # promo_video -> demo
        # But be careful not to break other things. 
        # The paths act like "/assets/projects/promo_video/..."
        new_content = content.replace(f"/assets/projects/{keep_project}/", f"/assets/projects/{new_name}/")
        
        with open(new_json, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Updated paths inside project JSON.")

    # Rename subtitle file if exists
    old_srt = projects_dir / f"{keep_project}_subtitles.srt"
    new_srt = projects_dir / f"{new_name}_subtitles.srt"
    if old_srt.exists():
        print(f"Renaming SRT: {old_srt} -> {new_srt}")
        os.rename(old_srt, new_srt)

    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_projects()
