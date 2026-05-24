# SOURCE GUIDE

## OVERVIEW

`src/` contains the Annotation plugin implementation. Keep Obsidian integration in `main.ts`; move drawing-domain behavior to `src/drawing/`.

## STRUCTURE

```
src/
├── main.ts       # plugin lifecycle, commands, overlay orchestration, persistence wiring
└── drawing/      # annotation types, geometry, scene normalization, rendering, Excalidraw adapters
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Plugin load/unload | `main.ts` | `AnnotationPlugin.onload`, `onunload` |
| Ribbon and commands | `main.ts` | Stable command IDs; do not rename casually |
| Active markdown view wiring | `main.ts` | Workspace and metadata events use Obsidian registration helpers |
| Overlay DOM and interactions | `main.ts` | `AnnotationEditorOverlay`; avoid growing it with domain logic |
| Annotation id/frontmatter persistence | `main.ts` | Frontmatter stores the generated annotation id |
| External annotation data storage | `persistence.ts` | Annotation scenes are stored as `.annotation/<id>.json` |
| Drawing behavior | `drawing/` | See `drawing/AGENTS.md` |

## CONVENTIONS

- `main.ts` should orchestrate Obsidian APIs, overlay lifecycle, command/ribbon state, and persistence calls.
- Do not add new geometry math, hit-testing, element factories, Excalidraw normalization, or drawing-domain types to `main.ts`.
- If code operates on `AnnotationElement`, `AnnotationScene`, selection handles, element bounds, freehand paths, text measurement, or Excalidraw compatibility, it usually belongs in `drawing/`.
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

- Expanding `AnnotationEditorOverlay` with unrelated responsibilities.
- Duplicating drawing code already present in `src/drawing/` or reusable from `excalidraw/`.
- Direct `@excalidraw/*` imports from `main.ts` or future UI/persistence files.
- Unregistered global listeners, timers, observers, or requestAnimationFrame loops.
- Vault-wide scans or heavy work during `onload`.
