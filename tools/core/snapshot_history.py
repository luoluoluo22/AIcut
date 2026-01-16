"""
Snapshot History Manager - 自动备份项目快照到 history 目录
每次更新 snapshot 前调用 backup() 方法
"""
import os
import json
import shutil
from datetime import datetime

WORKSPACE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "ai_workspace")
SNAPSHOT_FILE = os.path.join(WORKSPACE_DIR, "project-snapshot.json")
HISTORY_DIR = os.path.join(WORKSPACE_DIR, "history")
MAX_HISTORY = 20  # 最多保留20个历史版本

def backup():
    """备份当前快照到 history 目录"""
    if not os.path.exists(SNAPSHOT_FILE):
        print("[History] No snapshot to backup.")
        return None
    
    os.makedirs(HISTORY_DIR, exist_ok=True)
    
    # 生成带时间戳的文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"snapshot_{timestamp}.json"
    backup_path = os.path.join(HISTORY_DIR, backup_name)
    
    shutil.copy2(SNAPSHOT_FILE, backup_path)
    print(f"[History] Backed up to: {backup_name}")
    
    # 清理旧版本
    cleanup_old_versions()
    
    return backup_path

def cleanup_old_versions():
    """保留最新的 MAX_HISTORY 个版本，删除更旧的"""
    if not os.path.exists(HISTORY_DIR):
        return
    
    files = sorted([
        f for f in os.listdir(HISTORY_DIR) 
        if f.startswith("snapshot_") and f.endswith(".json")
    ], reverse=True)
    
    for old_file in files[MAX_HISTORY:]:
        os.remove(os.path.join(HISTORY_DIR, old_file))
        print(f"[History] Removed old version: {old_file}")

def list_history():
    """列出所有历史版本"""
    if not os.path.exists(HISTORY_DIR):
        return []
    
    files = sorted([
        f for f in os.listdir(HISTORY_DIR)
        if f.startswith("snapshot_") and f.endswith(".json")
    ], reverse=True)
    
    return files

def restore(filename):
    """从历史版本恢复快照"""
    backup_path = os.path.join(HISTORY_DIR, filename)
    if not os.path.exists(backup_path):
        print(f"[History] Error: {filename} not found.")
        return False
    
    # 先备份当前版本
    backup()
    
    # 恢复
    shutil.copy2(backup_path, SNAPSHOT_FILE)
    print(f"[History] Restored from: {filename}")
    return True

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "backup":
            backup()
        elif cmd == "list":
            for f in list_history():
                print(f)
        elif cmd == "restore" and len(sys.argv) > 2:
            restore(sys.argv[2])
        else:
            print("Usage: python snapshot_history.py [backup|list|restore <filename>]")
    else:
        # 默认执行备份
        backup()
