# jourwigo - React Wherigo Cartridge Editor & Player

A modern, client-side, serverless web application inspired by Urwigo and openwig/cgeo for authoring, compiling, and running Wherigo geocaching adventure cartridges.

## Features

### 1. WebAssembly Java Library Runtime (CheerpJ 3.0)
- Directly executes the project's compiled Java classes (`net.jakedot.jourwigo.CheerpJBridge`, `CartridgeCompiler`) in client-side WebAssembly using CheerpJ 3.0 (`loader.js`).
- Serverless Java bytecode execution directly in the browser via `cjCall('net.jakedot.jourwigo.CheerpJBridge', 'compileGwcFromLuaBytes', ...)` and `public/jourwigo.jar`.
- Live JVM status badge in the header showing runtime readiness.
- Robust dual-engine capability: seamless fallback to native TypeScript bytecode compiler when CheerpJ is initializing or in sandboxed environments.

### 2. General Object Relationship Graph & Hierarchy
- Supports complex multi-reference object graphs:
  - Shared `Media` resources (images, sounds, video, text) used across multiple objects (Zones, Characters, Items, Dialogue MessageBoxes).
  - Parent/child inventory nesting with automatic `Container` property synchronization.
  - Interactive Directed Relations Network View, Graph Topology Diagram, and Hierarchical Inventory view.
  - Quick Object Connect tool: link any source and target object with relationship types (`USES_MEDIA`, `USES_ICON`, `CONTAINS`, `ATTACHED_COMMAND`, `REFERENCES`).

### 2. Multi-Cartridge Tabbed Authoring
- Work with multiple cartridges simultaneously in separate tabs.
- Full cartridge metadata control: Name, Author, Version, Description, Starting GPS Coordinates (Latitude, Longitude, Altitude).
- One-click "Use My GPS" browser location detector.

### 3. Visual Branching Dialogue Tree & Story Flow
- Non-linear branching and merging dialogue designer.
- Multi-frame initial monologue / sequence with media references.
- Decision Question Node (Yes/No or Multiple Choice, choices, variable state storage).
- Choice Branch paths leading to unique narrative follow-ups.
- MediaPicker Extensions: `Wherigo.SnapPhoto()`, `PickFile()`, `RecordVideo()`, `ScanBarcode()`.
- Merged Target Destination where story paths converge.
- Direct code generation and "Add Dialog to Cartridge" injection.

### 4. Lua Code Generator & Binary GWC Compiler
- Generates topologically sorted, clean Urwigo-compatible Lua cartridge code.
- Client-side binary `.gwc` compiler packing header tables, double precision GPS coordinates, null-terminated metadata, and payload.
- Instant `.gwc` and `.lua` file export and import.

### 5. Interactive GPS Cartridge Runner & Simulator
- Live simulated GPS controller with editable coordinates and D-pad walk simulation (North, South, East, West by meters).
- Real-time Zone Proximity Radar with Haversine distance and bearing compass needles.
- Virtual Wherigo Device Screen with tabs:
  - **Main**: Cartridge overview and current zone status.
  - **Locations**: Active zones with distance and state (INSIDE, PROXIMITY, DISTANT).
  - **You See**: NPCs and items visible in the current location.
  - **Inventory**: Player inventory with Take, Drop, and Examine commands.
  - **Tasks**: Quest task checklist with completion toggles.
- Interactive Dialogue Box popups with character images and choice buttons.
- Real-time event log and debug console.

## Development

```bash
npm install
npm run dev
```

Server listens on port 3000 (`http://localhost:3000`).

## Build

```bash
npm run build
```
