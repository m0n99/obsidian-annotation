# SOURCE GUIDE

## OVERVIEW

`src/` contains the Annotation plugin implementation. Keep Obsidian integration in `main.ts`; move drawing-domain behavior to `src/drawing/`.

## STRUCTURE

```
src/
├── main.ts                      # plugin lifecycle, commands, overlay orchestration, persistence wiring
├── overlay.ts                   # AnnotationEditorOverlay orchestrator; delegates to overlay/ modules
├── overlay/                     # overlay sub-modules, owned by AnnotationEditorOverlay
│   ├── utils.ts                 # shared constants, InteractionState type, angle/math helpers
│   ├── rendering.ts             # SVG scene rendering, element/selection/markdown-text node creation
│   ├── text-editor.ts           # OverlayTextEditor class; inline text editing DOM lifecycle
│   └── cursor.ts                # eraser cursor and cursor resolution logic
├── overlay-toolbar.ts           # toolbar tool buttons and style panel toggle
├── overlay-style-controls.ts    # shape style panel (stroke, fill, roughness, etc.)
├── overlay-text-style-controls.ts # text-specific panel (font, size, align)
├── overlay-scene-commands.ts    # pure scene mutation functions (duplicate, layer reorder)
├── overlay-shared-controls.ts   # shared UI control helpers (color picker, opacity slider)
├── editor-dom.ts                # Obsidian editor DOM helpers for overlay positioning
├── persistence.ts               # annotation data storage format and paths
└── drawing/                     # annotation types, geometry, scene normalization, rendering, Excalidraw adapters
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Plugin load/unload | `main.ts` | `AnnotationPlugin.onload`, `onunload` |
| Ribbon and commands | `main.ts` | Stable command IDs; do not rename casually |
| Active markdown view wiring | `main.ts` | Workspace and metadata events use Obsidian registration helpers |
| Overlay DOM and interactions | `overlay.ts` | `AnnotationEditorOverlay` orchestrator; delegates to `overlay/` modules |
| SVG rendering, scene painting | `overlay/rendering.ts` | `renderOverlayScene`, element/selection node creation |
| Inline text editing | `overlay/text-editor.ts` | `OverlayTextEditor` class; textarea DOM lifecycle, commit/cancel |
| Cursor and eraser cursor | `overlay/cursor.ts` | `createEraserCursor`, `resolveCursor` |
| Overlay constants, interaction type | `overlay/utils.ts` | `InteractionState`, angle math, keyboard guards |
| Toolbar UI | `overlay-toolbar.ts` | Tool buttons, style panel toggle |
| Shape style controls | `overlay-style-controls.ts` | Stroke, fill, roughness, edges, opacity |
| Text style controls | `overlay-text-style-controls.ts` | Font family, size, text alignment |
| Scene mutation helpers | `overlay-scene-commands.ts` | `duplicateElement`, `moveElementLayer` |
| Editor DOM positioning | `editor-dom.ts` | Overlay host/mount/sizer helpers |
| Annotation id/frontmatter persistence | `main.ts` | Frontmatter stores the generated annotation id |
| External annotation data storage | `persistence.ts` | Annotation scenes are stored as `.annotation/<id>.json` |
| Drawing behavior | `drawing/` | See `drawing/AGENTS.md` |

## CONVENTIONS

- `main.ts` should orchestrate Obsidian APIs, overlay lifecycle, command/ribbon state, and persistence calls.
- `overlay.ts` contains the `AnnotationEditorOverlay` orchestrator — it owns state and event flow, delegating rendering, text editing, and cursor logic to modules in `overlay/`.
- Do not add new geometry math, hit-testing, element factories, Excalidraw normalization, or drawing-domain types to `main.ts` or `overlay.ts`.
- If code operates on `AnnotationElement`, `AnnotationScene`, selection handles, element bounds, freehand paths, text measurement, or Excalidraw compatibility, it usually belongs in `drawing/`.
- New overlay sub-concerns (rendering, text editing, cursor) should go into dedicated modules in `overlay/` rather than growing the overlay class.
- Plugin-level Obsidian events should use `this.registerEvent(...)`; DOM, timer, observer, and animation resources need explicit teardown.
- Keep debug output gated and non-user-facing.
- Isolate Obsidian private API access, such as CodeMirror internals, behind small guarded helpers when adding more.

## PERSISTENCE RULES

- Stored Annotation data is user content. Treat format changes as migrations.
- `ANNOTATION_FRONTMATTER_KEY` stores a generated annotation id, not a boolean.
- Annotation scene data is stored outside the note in `.annotation/<id>.json`.
- Any change to `AnnotationData`, scene coordinate space, external JSON storage, or frontmatter keys should be handled through `normalizeScene` / parsing guards.
- Use `src/drawing/scene.ts` normalization for defensive loading instead of trusting persisted JSON.

## ANTI-PATTERNS

- Expanding `AnnotationEditorOverlay` with concerns that belong in dedicated overlay-* modules.
- Duplicating drawing code already present in `src/drawing/` or reusable from `excalidraw/`.
- Direct `@excalidraw/*` imports from `main.ts` or outside the drawing facade/adapter layer.
- Unregistered global listeners, timers, observers, or requestAnimationFrame loops.
- Vault-wide scans or heavy work during `onload`.
