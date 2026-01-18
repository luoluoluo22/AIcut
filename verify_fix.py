
import sys
import os
import time

# Add SDK path
sdk_dir = os.path.join(os.getcwd(), ".agent", "skills", "aicut-editing", "scripts")
sys.path.append(sdk_dir)

from aicut_sdk import AIcutClient

def verify_fix():
    client = AIcutClient()
    project_id = "demo"

    print(f"1. Attempting to delete '{project_id}'...")
    try:
        # First ensure we are NOT on the project we want to delete (optional but good practice)
        # But wait, if we are on 'demo', deleting it will put workspace in 'deleted' state.
        # This is exactly what we want to test: recovering from 'deleted' state to a new 'demo'.
        
        client.delete_project(project_id)
        print(f"✅ Deleted '{project_id}'")
    except Exception as e:
        print(f"⚠️  Delete failed (maybe it didn't exist): {e}")

    # Give FS a moment
    time.sleep(1)

    print(f"2. Attempting to recreate '{project_id}' (This should trigger the new logic)...")
    try:
        # This calls switchProject. Since 'demo' folder is gone, it should hit the "Create NEW" branch
        # in route.ts which forcibly initializes a clean state.
        res = client.switch_project(project_id)
        if res.get("success"):
             print(f"✅ Successfully recreated '{project_id}'")
             print(f"   Message: {res.get('message')}")
        else:
             print(f"❌ Failed to recreate: {res}")
    except Exception as e:
        print(f"❌ Critical Error during recreation: {e}")

if __name__ == "__main__":
    verify_fix()
