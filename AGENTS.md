# PROJECT KNOWLEDGE BASE

**Generated:** 2026-05-21T19:12:10Z
**Commit:** 69bb340
**Branch:** master

## OVERVIEW

Obsidian Annotation is a mobile-compatible Obsidian community plugin for document-first visual annotation. Root source is TypeScript bundled by esbuild from `src/main.ts` to the release artifact `main.js`.

## STRUCTURE

```
obsidian-annotation/
├── src/                 # plugin source; see src/AGENTS.md
│   ├── main.ts          # Obsidian lifecycle + overlay orchestration hotspot
│   └── drawing/         # annotation model, geometry, rendering, Excalidraw adapters
├── excalidraw/          # Git submodule; upstream/Yarn monorepo, read before reusing
├── esbuild.config.mjs   # bundles src/main.ts -> main.js; aliases Excalidraw dist packages
├── manifest.json        # Obsidian plugin id/version/min app version
├── versions.json        # Obsidian version compatibility map
├── styles.css           # release CSS artifact
└── main.js              # generated bundle; do not edit
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Obsidian lifecycle, commands, ribbon | `src/main.ts` | `AnnotationPlugin`; keep new code orchestration-only |
| Overlay UI, pointer/keyboard flow | `src/overlay.ts` | `AnnotationEditorOverlay` orchestrator; delegates to `overlay/` modules |
| SVG rendering, markdown text nodes | `src/overlay/rendering.ts` | Pure SVG creation functions; `renderOverlayScene` |
| Inline text editing | `src/overlay/text-editor.ts` | `OverlayTextEditor` class; DOM lifecycle for textarea |
| Cursor / eraser cursor | `src/overlay/cursor.ts` | `createEraserCursor`, `resolveCursor` |
| Hit testing | `src/overlay/hit-test.ts` | `findElementAtPoint`, `findSelectionHandleAtPoint` |
| Pointer coordinates, debug | `src/overlay/pointer.ts` | `pointerPoint`, `penPoint`, geometry logging |
| Interaction transforms | `src/overlay/interaction.ts` | `applyInteraction`, `rotateElement` |
| Style updates | `src/overlay/style.ts` | `applyStyleUpdate`, `applyTextPropertyUpdate` |
| Save / load | `src/overlay/save.ts` | `saveScene`, `loadScene`, coordinate translation |
| Overlay constants, utilities | `src/overlay/utils.ts` | `InteractionState`, angle math, keyboard guards |
| Toolbar UI | `src/overlay/toolbar.ts` | Tool buttons, style panel toggle |
| Style controls | `src/overlay/style-controls.ts` | Shape style panel (stroke, fill, roughness, etc.) |
| Text style controls | `src/overlay/text-style-controls.ts` | Text-specific panel (font, size, align) |
| Annotation data model | `src/drawing/types.ts` | Persisted element shape; preserve compatibility |
| Element creation/normalization | `src/drawing/excalidraw-adapter.ts` | Use before constructing Excalidraw-like elements manually |
| Excalidraw imports | `src/drawing/excalidraw.ts` | Facade for `@excalidraw/*`; keep direct package imports centralized |
| Geometry, handles, bounds | `src/drawing/geometry.ts` | Local/absolute coordinate invariants matter |
| SVG/rough/freehand rendering | `src/drawing/render.ts` | DOM/SVG helpers only; no Obsidian APIs |
| Scene load compatibility | `src/drawing/scene.ts` | `normalizeScene` is the persisted-data gate |
| Annotation storage | `src/persistence.ts`, `.annotation/<id>.json` | Frontmatter `annotation` stores generated ids; scene JSON lives outside notes |
| Build/release wiring | `package.json`, `esbuild.config.mjs`, `.github/workflows/lint.yml` | Root uses npm; Excalidraw submodule uses Yarn |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `AnnotationEditorOverlay` | class | `src/overlay.ts` | Editor overlay orchestrator; delegates to `overlay/` modules |
| `OverlayTextEditor` | class | `src/overlay/text-editor.ts` | Inline text editor DOM lifecycle and commit/cancel |
| `renderOverlayScene` | function | `src/overlay/rendering.ts` | SVG scene rendering from overlay state |
| `AnnotationPlugin` | class | `src/main.ts` | Obsidian plugin entry, commands, events, persistence |
| `AnnotationElement` | type | `src/drawing/types.ts` | Union for persisted annotation elements |
| `AnnotationScene` | type | `src/drawing/types.ts` | Persisted scene container |
| `createDraftElement` | function | `src/drawing/excalidraw-adapter.ts` | User-tool element factory |
| `normalizeScene` | function | `src/drawing/scene.ts` | Defensive load/migration gate |
| `elementBounds` | function | `src/drawing/geometry.ts` | Selection and hit-test geometry |
| `containsPoint` | function | `src/drawing/hit-test.ts` | Pointer hit detection wrapper |

## COMPONENT ARCHITECTURE

| Area | Role | Source of Truth |
|------|------|-----------------|
| `src/` | Obsidian Annotation plugin implementation | `src/AGENTS.md` + TypeScript source |
| `src/drawing/` | Drawing domain and Excalidraw compatibility layer | `src/drawing/AGENTS.md` |
| `excalidraw/` | Vendored Git submodule, Yarn workspaces monorepo | `excalidraw/CLAUDE.md`, upstream package docs |

Rules:
- Treat `excalidraw/` as a submodule boundary. Do not edit it unless explicitly asked for Excalidraw submodule changes.
- For drawing/canvas/Excalidraw behavior, first look for reusable code in `excalidraw/`. Import/reuse when compatible.
- If upstream code is close but not plugin-compatible, create a small wrapper/adapter in `src/drawing/` instead of copying or rewriting it.
- Only write custom drawing logic when no suitable Excalidraw implementation exists.
- Keep cross-boundary imports flowing through `src/drawing/excalidraw.ts` and adapter modules.

## CONVENTIONS

- Package manager: npm at plugin root; Yarn v1 only inside `excalidraw/` or through `npm run build:excalidraw`.
- Build: esbuild CJS bundle, entry `src/main.ts`, output root `main.js`, target `es2018`.
- TypeScript source included by `tsconfig.json`: `src/**/*.ts` only.
- Formatting from `.editorconfig`: tabs, width 4, LF, UTF-8, final newline.
- Plugin id is `annotation`; do not rename after release.
- `manifest.json` and `versions.json` versions must stay aligned.
- Frontmatter `annotation` stores a generated id; annotation scene data is written to `.annotation/<id>.json`.

## ANTI-PATTERNS (THIS PROJECT)

- Editing `main.js`, `node_modules/`, `excalidraw/packages/*/dist/`, or generated source maps.
- Adding drawing algorithms, Excalidraw element construction, or hit-testing directly in `src/main.ts`.
- Importing `@excalidraw/*` outside the drawing facade/adapter layer.
- Changing persisted scene/element fields without updating `normalizeScene` / element normalization.
- Long-running startup work, vault-wide scans, hidden telemetry, remote code execution, or unconsented vault data collection.
- Renaming released command IDs or using a leading `v` on Obsidian release tags.

## COMMANDS

```bash
npm install
npm run dev
npm run build
npm run lint
npm run build:excalidraw
npm run build:with-excalidraw
```

CI runs Node 20.x and 22.x with `npm ci`, `npm run build --if-present`, then `npm run lint`.

## NOTES

- Root plugin currently has no automated tests; validation is build, lint, and manual Obsidian testing.
- `README.md` documents the current Annotation plugin behavior and storage model.
- `version-bump.mjs` deserves review before relying on repeated min-app-version entries.
- Release assets: `manifest.json`, generated `main.js`, and `styles.css`.
