---
name: aicut-editing
description: 指导如何操作 AIcut 时间轴、添加媒体、创建字幕及导出视频。当用户询问关于视频剪辑、时间轴操作、添加素材、生成的视频有问题或媒体管理时使用此技能。
---

# AIcut Video Editing Skill

This skill helps understand and manipulate the AIcut video editing system.

## Core Concepts

### Project Structure
- **Project Snapshot**: `ai_workspace/project-snapshot.json` - The single source of truth for timeline state
- **Assets**: `projects/<project-name>/assets/` - Media files organized by type (videos/, images/, audio/)
- **Exports**: `exports/` - Final rendered videos

### Element Types

#### 1. Media Element (Video/Image/Audio)
```json
{
  "id": "e.g., el-0",
  "type": "media",
  "mediaId": "asset-reference-id",
  "name": "display-name.mp4",
  "startTime": 0.0,      // In seconds
  "duration": 5.0,       // Visible duration
  "trimStart": 0.0,      // Crop from start of source
  "trimEnd": 0.0,        // Crop from end of source
  "x": 960, "y": 540,    // Postion (Center origin is 960, 540)
  "scale": 1.0, 
  "opacity": 1.0,
  "volume": 1.0
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
1. Create an asset entry in the `assets` array.
2. Create an element in a track referencing the asset's `id`.
3. Set `startTime`, `duration`, and optional `trimStart`/`trimEnd`.

### Creating Subtitles
1. Create or use an existing text track (type: `text`).
2. Add text elements according to the **Text Element Schema** above.
3. Synchronize `startTime` with audio assets.

### Modifying Volume
- Set `element.volume` (0.0 = mute, 1.0 = normal, up to 10.0 = 1000%).

## API Integration

The frontend exposes these endpoints:
- `GET /api/ai-edit?action=getSnapshot` - Get current state
- `POST /api/ai-edit?action=updateSnapshot` - Push changes
- `POST /api/ai-edit?action=export` - Trigger video export

## Best Practices

1. **Atomic Updates**: Read the full snapshot, modify your slice, then write the full snapshot back.
2. **Validation**: Before writing, ensure all numeric fields are `number` type, not strings.
3. **Paths**: Use relative paths starting with `/materials/` for URLs and project-relative paths for `filePath`.
4. **Order**: Maintain `tracks` order (Text tracks normally go at index 0 to stay on top).
