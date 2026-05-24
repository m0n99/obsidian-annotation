# DRAWING DOMAIN GUIDE

## OVERVIEW

`src/drawing/` owns annotation elements, scene compatibility, geometry, rendering helpers, hit-testing, and the Annotation ↔ Excalidraw adapter boundary.

## STRUCTURE

```
drawing/
├── types.ts                 # annotation model, style constants, scene types
├── excalidraw.ts            # centralized Excalidraw imports/re-exports
├── excalidraw-adapter.ts    # factories, normalization, IDs, versioning, point conversion
├── scene.ts                 # scene defaults, validation, clone, persisted-data compatibility
├── geometry.ts              # move/resize/bounds/handles/constraints/distances
├── hit-test.ts              # point containment for pointer interactions
├── render.ts                # SVG, rough, freehand, toolbar icon node factories
├── text.ts                  # text normalization and textarea measurement
├── scene-adapter.ts         # minimal adapter for Excalidraw transform APIs
└── guards.ts                # annotation element type guards
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add/change annotation fields | `types.ts`, `scene.ts`, `excalidraw-adapter.ts` | Update normalization with backward compatibility |
| Create or mutate elements | `excalidraw-adapter.ts` | Bump versions for user-visible changes |
| Import Excalidraw helpers | `excalidraw.ts` | Keep package imports centralized |
| Resize, rotate, handles, bounds | `geometry.ts` | Preserve local-vs-absolute point rules |
| Pointer hit detection | `hit-test.ts` | Use Excalidraw helpers before fallback math |
| Render SVG nodes/icons | `render.ts` | DOM/SVG creation is allowed here |
| Text sizing | `text.ts` | DOM measurement is allowed here only |

## CONVENTIONS

- Drawing modules must not import from `obsidian` or `src/main.ts`.
- Direct `@excalidraw/*` imports belong in `excalidraw.ts`; other drawing files import from `./excalidraw`.
- Prefer existing Excalidraw implementations first. If they need Annotation-specific shape, wrap them in this directory.
- Keep helper functions file-local unless callers outside the file need a stable drawing API.
- Pure modules (`geometry.ts`, `scene.ts`, adapters where possible) should avoid DOM access.
- DOM use is expected in `render.ts` and `text.ts`; Obsidian MarkdownRenderer/editor DOM assumptions stay outside drawing.
- Keep `any` casts contained near facade/adapter calls. Do not leak `any` into `types.ts` or public callers.

## INVARIANTS

- `normalizeScene(...)` is the compatibility gate for persisted data; never trust JSON loaded from notes.
- Preserve Excalidraw-compatible fields on annotation elements unless a migration path exists.
- Freehand and linear elements store local points; use `absolutePoints(...)` for screen/document-space logic.
- Normalize geometry after resize/mutation where required.
- Rotation-aware bounds, selection handles, and hit-testing must stay aligned.
- Text elements must preserve font size, box width/height, and line-height assumptions from Excalidraw constants.

## ANTI-PATTERNS

- Direct Obsidian dependency in drawing modules.
- Scattered `@excalidraw/*` imports outside `excalidraw.ts`.
- Duplicated element construction instead of `excalidraw-adapter.ts`.
- Serialized field changes without `normalizeScene` / `normalizeElement` updates.
- Mixing local element points with absolute document points.
- Exporting one-off helpers that should remain internal.
- Adding drawing behavior to `src/main.ts` because it is convenient.

## MANUAL CHECKS FOR DRAWING CHANGES

- Rectangle, diamond, ellipse creation and resize.
- Line/arrow creation, shift-locking, endpoint handles, arrowheads.
- Freehand path rendering and hit-testing.
- Text creation, editing, resizing, and reload.
- Selection handles, rotation, and hit-testing after resize/rotation.
- Persisted scene reload from an existing annotated note.
