---
name: aicut-editing
description: 指导如何进行项目管理（新建、查看、切换、删除）、操作 AIcut 时间轴、添加媒体、创建字幕及导出视频。当用户询问关于项目列表管理、新建/切换/删除项目、视频剪辑、时间轴操作、添加素材、生成的视频有问题或媒体管理时使用此技能。
---

# AIcut Video Editing Skill

This skill helps understand and manipulate the AIcut video editing system.

## Core Concepts

### Project Structure
- **Project Snapshot**: `ai_workspace/project-snapshot.json` - The single source of truth for timeline state.
- **Project Folders**: `projects/<display-name>/` - Readable folder names mapped to internal IDs via `projects/projectIdMap.json`.
- **Assets**: `projects/<display-name>/assets/` - Media files organized by type.
- **Exports**: `exports/` - Final rendered videos.

### Project Management

#### 1. UI Creation & Management
- **Create**: Click **"New Project"** in the `/projects` page.
- **View**: Browse existing projects in the UI list. The UI synchronizes with the filesystem in real-time.
- **Delete**: Click the **Delete** icon on a project card. This removes the project from the UI and deletes its folder from the `projects/` directory.

#### 2. Programmatic Lifecycle (New/Switch/Delete Project Logic)
To manage projects via API/Python:
1.  **Initialize**: Call `switch_project(projectId)`. If the project is loaded for the first time, it creates the folder. If it exists, the UI will automatically jump to that project.
2.  **Archiving (Readable Folders)**: Use `archive_project()`. The system uses the project's **name** as the folder name.
3.  **Switching**: Call `switch_project(anotherId)`. The UI will perform a hot-reload and navigate to the new project editor.
4.  **Mapping**: Folder names are mapped to internal IDs in `projectIdMap.json`.
5.  **Deletion**: Call `delete_project(projectId)` to permanently remove the project folder and its ID mapping.

### Element Types

#### 1. Media Element (Video/Image/Audio)
```json
{
  "id": "e.g., el-0",
  "type": "media",
  "mediaId": "asset-reference-id",
  "name": "display-name.mp4",
  "thumbnailUrl": "/api/media/serve?path=...", // CRITICAL for video/image preview
  "startTime": 0.0,      // In seconds
  "duration": 5.0,       // Visible duration
  "trimStart": 0.0,      // Crop from start of source
  "trimEnd": 0.0,        // Crop from end of source
  "x": 960, "y": 540,    // Postion (Center origin is 960, 540)
  "scale": 1.0, 
  "opacity": 1.0,
  "volume": 1.0,
  "metadata": {
    "importSource": "sdk_v2" 
  }
}
```

#### 2. Text/Subtitle Element
To ensure compatibility between Python and Frontend, use this format:
```json
{
  "id": "unique-id",
  "type": "text",
  "content": "The display text",    // Primary text field
  "startTime": 0.0,
  "duration": 3.0,
  "trimStart": 0, "trimEnd": 0,    // MUST include (default to 0)
  "x": 960, "y": 900,              // Subtitle position (bottom center)
  "rotation": 0, "opacity": 1,     // MUST include defaults
  "fontSize": 60,                  // Styles MUST be at top level
  "fontFamily": "Arial",           
  "color": "#ffffff",
  "textAlign": "center",
  "fontWeight": "bold",
  "style": {                       // Optional nested style for Python SDK
     "fontSize": 60,
     "color": "#ffffff"
  }
}
```

## Data Schema Rules (The "Contract")

1. **Primary Text Field**: Use `content` as the single source of truth for text. The `name` field is OMITTED for text elements to prevent redundancy.
2. **Flattened Styles**: While Python SDK uses a style object, the frontend requires fontSize, color, etc., at the top level of the element.
3. **Implicit Defaults**: Never skip `trimStart`, `trimEnd`, `rotation`, and `opacity`. If missing, the frontend might fail to render or default to 0 (invisible).
4. **Coordinate System**: origin `(0,0)` is Top-Left. 1920x1080 canvas. Standard center is `(960, 540)`.
5. **IDs**: IDs must be unique strings (e.g., `nanoid` or `sub-0`, `sub-1`).

## Common Operations

### Adding Media
**Preferred Method: Use AIcut SDK (`import_media`).**
The SDK automates the following steps:
1.  **Thumbnail Generation**: Calls `/api/media/generate-thumbnail` for videos to create high-quality frames.
2.  **Asset Creation**: Automatically calculates IDs and creates an asset entry with a stable serve URL.
3.  **Element Placement**: Adds the element to the timeline with the correct `thumbnailUrl`.

**Manual Method (Advanced):**
1. Create an asset entry in the `assets` array.
2. Create an element in a track referencing the asset's `id`.
3. **MUST** set `thumbnailUrl` (use the asset's URL or a dedicated JPG thumb) for visual feedback.

### Creating Subtitles
1. Create or use an existing text track (type: `text`).
2. Add text elements according to the **Text Element Schema** above.
3. Synchronize `startTime` with audio assets.

### Modifying Volume
- Set `element.volume` (0.0 = mute, 1.0 = normal, up to 10.0 = 1000%).

## API Integration

The frontend exposes a state-syncing API at `POST /api/ai-edit`. **Always prefer using the Python SDK (`scripts/aicut_sdk.py`) over raw HTTP requests.**

### Supported Actions (POST)

| Action                 | Description              | Key Data Fields                                      |
| :--------------------- | :----------------------- | :--------------------------------------------------- |
| `addSubtitle`          | Add a single subtitle    | `text`, `startTime`, `duration`, `fontSize`, `color` |
| `addMultipleSubtitles` | Batch add subtitles      | `subtitles` (Array of subtitle objects)              |
| `clearSubtitles`       | Remove subtitles         | `startTime`, `duration` (Optional range)             |
| `switchProject`        | Load or create project   | `projectId`                                          |
| `archiveProject`       | Save workspace to disk   | `projectId` (Optional)                               |
| `deleteProject`        | Delete project folder    | `projectId`                                          |
| `updateSnapshot`       | Push full timeline state | `project`, `tracks`, `assets` (Full JSON object)     |

### Media Utilities
- `GET /api/media/serve?path=<encoded_absolute_path>`: Serves local files as browser-accessible URLs.
- `POST /api/media/generate-thumbnail`: Generate a JPG from a video file (Body: `{ filePath: string }`).

### Snapshot & Project Endpoints
- `GET /api/ai-edit?action=getSnapshot`: Retrieve current timeline state.
- `GET /api/ai-edit?action=listProjects`: List all archived projects.
- `GET /api/ai-edit?action=poll`: Polled by frontend to fetch pending edits.

## Best Practices

1. **Avoid `curl` on Windows**: Use a temporary Python script or the AIcut SDK for stable JSON communication.
2. **Paths**: **DO NOT** use `/materials/` relative paths. **Always use absolute paths** wrapped in the `/api/media/serve?path=` API. This ensures files from any drive (F:, D:, etc.) work correctly.
3. **Atomic Updates**: Read the full snapshot, modify your slice, then write the full snapshot back.
4. **Validation**: Ensure all numeric fields are `number` type, not `string`.
5. **Layering**: Text tracks should remain at the top (lower array index) to be visible over media.
6. **SDK First**: Always use `scripts/aicut_sdk.py`. It correctly handles thumbnail generation calls and internal path mapping.

## Executable Scripts

The following scripts/CLIs are available in the `scripts/` directory:

| Tool                  | Purpose                                            | Usage Example                                                   |
| --------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `aicut_tool.py`       | **Centralized CLI** for all common tasks.          | `python scripts/aicut_tool.py media import "path/to/video.mp4"` |
| `aicut_sdk.py`        | Core library for all programmatic edits.           | `from aicut_sdk import AIcutClient`                             |
| `fix_subtitle_pos.py` | Align subtitles to bottom center.                  | `python scripts/fix_subtitle_pos.py`                            |
| `project_manager.py`  | Standalone project lifecycle tool (legacy support) | `python scripts/project_manager.py list`                        |

> **Note**: These scripts depend on `scripts/aicut_sdk.py`. Ensure you run them from the skill directory or add the directory to your `PYTHONPATH`.
