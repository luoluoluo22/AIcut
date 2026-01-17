---
name: aicut-deploy
description: Guides how to build and deploy AIcut as an Electron application. Use when the user asks about packaging, building installers, or releasing the app.
---

# AIcut Deployment Skill

This skill helps package and deploy AIcut as a standalone desktop application.

## Prerequisites

Ensure you have:
- Node.js 18+
- Python 3.10+
- All dependencies installed (`bun install` in AIcut-Studio)

## Build Commands

### Development
```bash
cd AIcut-Studio/apps/web
npm run dev          # Start Next.js dev server
npm run electron     # Start Electron (in another terminal)
```

### Production Build

```bash
cd AIcut-Studio/apps/web

# Build Next.js first
npm run build

# Package for current platform
npm run electron:build
```

### Platform-Specific Builds

The `electron-builder` config in `package.json` supports:

| Platform | Command                    | Output                     |
| -------- | -------------------------- | -------------------------- |
| Windows  | `electron-builder --win`   | `.exe` installer, portable |
| macOS    | `electron-builder --mac`   | `.dmg`, `.zip`             |
| Linux    | `electron-builder --linux` | `.AppImage`, `.deb`        |

## Build Configuration

Located in `AIcut-Studio/apps/web/package.json`:

```json
"build": {
  "appId": "com.aicut.studio",
  "productName": "AIcut Studio",
  "directories": {
    "output": "dist-electron"
  },
  "extraResources": [
    {
      "from": "../../../tools",
      "to": "tools"
    }
  ],
  "win": {
    "target": ["nsis", "portable"]
  }
}
```

## Including Python Tools

The `extraResources` section ensures Python scripts are bundled:
- Source: `tools/` directory at project root
- Destination: `resources/tools/` in the packaged app

## Environment Variables

For production, ensure these are set (or bundled in `.env`):
- `GROQ_API_KEY` - For speech recognition
- `OPENAI_API_KEY` - For AI features (optional)

## Troubleshooting

### Electron not found
```bash
node node_modules/electron/install.js
```

### Python daemon not starting
Check `electron/main.js` for the Python spawn path. It should resolve correctly in both dev and production.

### Large bundle size
- Ensure `node_modules` is not duplicated
- Check if media files are being incorrectly bundled

## Release Checklist

1. [ ] Update version in `package.json`
2. [ ] Run `npm run build` successfully
3. [ ] Test `npm run electron:build` locally
4. [ ] Verify Python daemon starts in packaged app
5. [ ] Test core features (import, edit, export)
6. [ ] Create GitHub release with built artifacts
