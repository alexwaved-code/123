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

- Street grid, parks, and three landmarks in the origin chunk. The spire, hall, and needle sit in blocks beside the roads, not on the asphalt.
- The map is infinite in chunks of 256 m. A 5×5 window loads around the plane and far chunks unload.
- Terrain is deterministic from the chunk coordinate: downtown, suburb, park, industrial, water.
- `getCityColliders()` returns world-space boxes for loaded solids only. Ground, roads, water, and trees are not solid.
- `updateCity(root, worldPosition)` and `getGroundHeight(x, z)` are exported. Ground height is `0` for this pass. Agent A still has to call `updateCity` each frame (task T10). Until then, only the 5×5 around spawn exists.

### Pause menu

- **Menu** (top right) or **Esc** stops the simulation. The plane holds still and the engine goes quiet.
- While paused: view distance, shadows, quality, HUD, and volume. Settings stay in `localStorage`.
- **Resume** continues. **Restart at spawn** sends the plane back to `(0, 50, 200)` and continues.
- The menu lives in `src/ui/`. `src/main.js` skips flight, camera, and juice while paused.

### Driver

- **F** leaves the plane. Pitch stays on the up and down arrows, so F is free.
- In the sky (more than 12 m above the ground) F opens an orange parachute. WASD drifts while it falls. Landing drops the chute and the driver starts walking.
- On the ground F just steps the driver off beside the plane.
- On foot, WASD walks. The walk is a fast cartoon: huge kicks, windmill arms, hip sway, and a big bobbing head. Mismatched blue and yellow legs.
- The face points the way the driver moves. The camera stays behind, so W is forward and the eyes look away from the player.
- **E** next to the plane gets back in the seat.
- The empty plane coasts forward and still bumps buildings. Restart from the pause menu puts the driver back aboard.
- The walk is calmer: smaller steps, less hip and head shake, and the driver stands still when you stop.
- On foot, **WASD** walks: W forward, A left, D right, S back, relative to where you are looking. The driver turns to face the way they step.
- The **arrow keys** look around while you are out of the plane. Up tilts the view and the head up, down tilts down, left and right turn the view. In the cockpit those arrows still pitch and turn the plane.
- Hold **Right Shift** to run. Left Shift does nothing. The steps stay small.
- **Space** jumps while walking. One hop at a time, then gravity brings the driver back down.
- Buildings sit in the blocks beside the roads, with a gap so they do not stand on the asphalt. The origin landmarks moved into those blocks.
- If the plane is more than about 28 m away, hold **H** (or the yellow button) for a little over a second. The driver raises a hand. A yellow taxi drives in along the roads, goes around buildings, and carries the driver to the plane.

### Start screen

- The flight waits on a start screen: title, runway, and the control list. **Start flight** begins the simulation. Esc and the Menu button stay hidden until then.

## World rules still in force

- Y-up, 1 unit = 1 meter, ground `y = 0`.
- Spawn stays `(0, 50, 200)` unless both agents agree to move it.
