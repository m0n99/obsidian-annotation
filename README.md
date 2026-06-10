# Obsidian Annotation

Obsidian Annotation adds visual annotations directly on top of your Markdown notes.

It ports the parts of Excalidraw that make sense for annotating Markdown notes: drawing tools, selection, styling, grouping, alignment, layers, and undo/redo — while keeping the Markdown body clean.

## Features

- Excalidraw-style drawing and editing inside Markdown editor views.
- Shapes, arrows/lines, freehand strokes, text, selection, grouping, alignment, layers, and style controls.
- Annotation data stays outside the Markdown body.

## How it works

When annotation is enabled for a note, the plugin adds a drawing layer over the Markdown editor. The layer scrolls with the note, so annotations stay attached to the same document positions.

To keep drawings aligned, the plugin fixes the editor's content width while annotation is active. This prevents the note from reflowing horizontally when panes are resized, which would otherwise shift text away from its annotations. This layout change only applies to annotated Markdown views.

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

The Markdown body is not modified — no annotation JSON is embedded in the note.

Legacy scenes with center-based X coordinates are migrated automatically on load.

## Notes for users

- Source view and Live Preview are supported. Reading view is not currently supported because it renders text differently, which can shift positions relative to annotations.
- Mobile is not supported. The plugin is developed for desktop use, and mobile layouts are likely to reflow the note in ways that make fixed-position annotations unreliable.
- Annotation data is stored in `.annotation/` at the vault root. Do not delete this folder if you want to keep existing annotations.
- Removing the frontmatter `annotation` id stops the plugin from loading that scene for the note, but it does not delete the corresponding `.annotation/<id>.json` file.
- The drawing layer is separate from Markdown content. Copying only the `.md` file without its `.annotation/<id>.json` file will lose the visual annotations.

## Development

Requires [Bun](https://bun.sh/).

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
bun run dev
```

Build Excalidraw submodule packages (needed after initial clone or submodule update):

```bash
bun run build:excalidraw
```

Build everything in one step:

```bash
bun run build:with-excalidraw
```

Lint:

```bash
bun run lint
```

## Release assets

Build output is written to `dist/`. The Obsidian plugin folder/release should include the generated contents needed by Obsidian:

- `manifest.json`
- `main.js`
- `styles.css`
- copied font assets under `fonts/`

Create release tags without a leading `v`.
