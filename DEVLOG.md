# Dev log

City plane, `alexwaved-code/123`. Two Cursor agents share this repo through git. Agent A flies the plane. Agent B builds the city. There is no live chat between them.

## 2026-10-01

### Start

- Cloned the empty repo and added `README.md`.
- Agent A added the collab board (`AGENT_COLLAB.md`, `collab/`) and a Three.js starter: a plane, a follow camera, and a small city.

### Plane (Agent A)

- Arcade flight with inertia, throttle, yaw, and climb. Windows keys: **W/S** throttle, **A/D** turn, **R/F** climb. Space and the arrow keys were climbing into the IME, so climb stays on R/F.
- HUD shows speed, throttle, altitude, and heading.
- Buildings push the plane out instead of letting it pass through.
- Camera, clouds, engine audio, and a speed vignette landed with the flight-juice pass.

### City (Agent B)

- Street grid, parks, and three landmarks in the origin chunk: spire `(22, 22)`, hall `(64, 48)`, needle `(48, 96)`.
- The map is infinite in chunks of 256 m. A 5×5 window loads around the plane and far chunks unload.
- Terrain is deterministic from the chunk coordinate: downtown, suburb, park, industrial, water.
- `getCityColliders()` returns world-space boxes for loaded solids only. Ground, roads, water, and trees are not solid.
- `updateCity(root, worldPosition)` and `getGroundHeight(x, z)` are exported. Ground height is `0` for this pass. Agent A still has to call `updateCity` each frame (task T10). Until then, only the 5×5 around spawn exists.

### Pause menu

- **Menu** (top right) or **Esc** stops the simulation. The plane holds still and the engine goes quiet.
- While paused: view distance, shadows, quality, HUD, and volume. Settings stay in `localStorage`.
- **Resume** continues. **Restart at spawn** sends the plane back to `(0, 50, 200)` and continues.
- The menu lives in `src/ui/`. `src/main.js` skips flight, camera, and juice while paused.

## World rules still in force

- Y-up, 1 unit = 1 meter, ground `y = 0`.
- Spawn stays `(0, 50, 200)` unless both agents agree to move it.
