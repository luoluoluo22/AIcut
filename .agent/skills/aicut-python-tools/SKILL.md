---
name: aicut-python-tools
description: Guides how to develop Python automation scripts for AIcut. Use when creating AI editing tools, TTS generators, or any Python script that interacts with the timeline.
---

# AIcut Python Tools Development Skill

This skill helps create Python scripts that automate video editing tasks in AIcut.

## Architecture Overview

```
AIcut/
├── tools/                    # Python scripts directory
│   ├── core/                # Core infrastructure
│   │   ├── ai_daemon.py    # Backend daemon (auto-started by Electron)
│   │   └── aicut_sdk.py    # Helper functions for scripts
│   ├── generators/         # Content generation tools
│   └── demos/              # Example scripts
├── ai_workspace/
│   └── project-snapshot.json  # Timeline state (read/write this!)
└── projects/
    └── <project>/assets/   # Where to save generated media
```

## Workflow Pattern

Every Python tool should follow this pattern:

```python
import json
import os

# 1. Read current state
SNAPSHOT_PATH = "ai_workspace/project-snapshot.json"
with open(SNAPSHOT_PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 2. Modify state (add tracks, elements, assets)
# ... your logic here ...

# 3. Write back state
with open(SNAPSHOT_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Done! Changes will be reflected in the editor via SSE.")
```

## Key Data Structures

### Adding an Asset
```python
new_asset = {
    "id": f"asset_{unique_id}",
    "name": "my_image.jpg",
    "type": "image",  # or "video", "audio"
    "url": "/materials/images/my_image.jpg",
    "filePath": "projects/demo/assets/images/my_image.jpg",
    "width": 1920,
    "height": 1080
}
data["assets"].append(new_asset)
```

### Adding a Track Element
```python
new_element = {
    "id": f"el_{unique_id}",
    "type": "media",
    "mediaId": new_asset["id"],
    "startTime": 0,
    "duration": 5,
    "trimStart": 0,
    "trimEnd": 0,
    "x": 960,
    "y": 540,
    "scale": 1,
    "opacity": 1,
    "volume": 1
}
data["tracks"][0]["elements"].append(new_element)
```

## Using the SDK

The `tools/core/aicut_sdk.py` provides helper classes:

```python
from tools.core.aicut_sdk import AIcutSDK

sdk = AIcutSDK()
sdk.add_image("path/to/image.jpg", start_time=0, duration=5)
sdk.add_audio("path/to/voice.mp3", start_time=0)
sdk.add_subtitle("Hello World", start_time=0, duration=3)
sdk.save()
```

## Best Practices

1. **Generate unique IDs**: Use `f"asset_{int(time.time())}_{random.randint(1000,9999)}"`
2. **Use relative paths**: Store files in `projects/<name>/assets/` for portability
3. **Calculate durations**: Use `pymediainfo` or `ffprobe` to get accurate media lengths
4. **Handle encoding**: Always use `encoding='utf-8'` when reading/writing JSON
5. **Log progress**: Use `print()` statements - they appear in Electron's console

## Common Dependencies

```toml
dependencies = [
    "requests",        # API calls
    "python-dotenv",   # Environment variables
    "edge-tts",        # Text-to-speech
    "pymediainfo",     # Media metadata
    "imageio",         # Image processing
]
```
