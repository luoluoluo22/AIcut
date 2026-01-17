---
name: aicut-editing
description: Guides how to manipulate the AIcut timeline, add media, create subtitles, and export videos. Use when the user asks about video editing, timeline operations, or media management.
---

# AIcut Video Editing Skill

This skill helps understand and manipulate the AIcut video editing system.

## Core Concepts

### Project Structure
- **Project Snapshot**: `ai_workspace/project-snapshot.json` - The single source of truth for timeline state
- **Assets**: `projects/<project-name>/assets/` - Media files organized by type (videos/, images/, audio/)
- **Exports**: `exports/` - Final rendered videos

### Timeline Model

The timeline consists of:
1. **Tracks**: Containers for elements (type: `media` or `text`)
2. **Elements**: Individual items on tracks
3. **Assets**: Media references (videos, images, audio)

### Element Types

```json
// Media Element
{
  "id": "unique-id",
  "type": "media",
  "mediaId": "asset-reference",
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

// Text/Subtitle Element
{
  "id": "unique-id",
  "type": "text",
  "text": "Your subtitle here",
  "startTime": 0,
  "duration": 3,
  "style": {
    "fontSize": 60,
    "color": "#ffffff",
    "fontWeight": "bold"
  },
  "x": 960,
  "y": 900
}
```

## Common Operations

### Adding Media
1. Create an asset entry in the `assets` array
2. Create an element in a track referencing the asset's `id`
3. Set `startTime`, `duration`, and optional `trimStart`/`trimEnd`

### Creating Subtitles
1. Create or use an existing text track (type: `text`)
2. Add text elements with timing synchronized to audio

### Modifying Volume
- Set `element.volume` (0.0 = mute, 1.0 = normal, up to 10.0 = 1000%)

## API Integration

The frontend exposes these endpoints:
- `GET /api/ai-edit?action=getSnapshot` - Get current state
- `POST /api/ai-edit?action=updateSnapshot` - Push changes
- `POST /api/ai-edit?action=export` - Trigger video export

## Best Practices

1. Always include `id` fields when creating new elements
2. Use relative paths starting with `projects/<name>/assets/` for `filePath`
3. Set proper `duration` based on actual media length
4. Keep `startTime` sequential to avoid overlaps
