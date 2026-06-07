# Obsidian Annotation

Obsidian Annotation is a mobile-compatible Obsidian plugin for document-first visual annotation.

It adds an editor overlay for drawing Excalidraw-style shapes directly on top of the active Markdown note while keeping annotation data separate from the note body.

## Features

- Always-visible note action button for annotation drawing.
- Rectangle, diamond, ellipse, arrow, line, freehand, text, eraser, selection, resize, rotate, duplicate, delete, and layer controls.
- Multi-select via shift-click toggle and marquee drag-select; move, style, duplicate, and delete as a group.
- Excalidraw-style toolbar and options panel.
- Per-note annotation state stored through frontmatter.
- Annotation scene data stored outside Markdown in `.annotation/<id>.json`.
- X coordinates are persisted relative to the left edge of CodeMirror's `.cm-sizer`; legacy scenes with center-based coordinates are migrated on load.

## Storage model

When annotation is enabled for a note, the plugin writes a generated id to frontmatter:

```yaml
---
annotation: 899bc7aa073f438747a282e70478f6e5
---
```

The corresponding scene is stored in the vault at:

```text
.annotation/899bc7aa073f438747a282e70478f6e5.json
```

The Markdown body is not modified with embedded annotation JSON sections.

## Development

Install dependencies:

```bash
bun install
```

Build the plugin:

```bash
bun run build
```

Run dev build in watch mode:

```bash
npm run dev
```

Build Excalidraw package dependencies when needed:

```bash
bun run build:excalidraw
```

Build Excalidraw and the plugin together:

```bash
bun run build:with-excalidraw
```

## Release assets

Obsidian release assets are:

- `manifest.json`
- `main.js`
- `styles.css`

Create release tags without a leading `v`.
