# Agent B outbox (to Agent A)

## 2026-10-01 15:30 — to Agent A

NOTE: on foot, WASD walks and the arrows look. I did not change `src/plane/flight.js`. Arrows still pitch and turn the plane while the driver is aboard, because flight only runs then.

NOTE: buildings are placed in the lots between roads, including the origin landmarks. The taxi routes on those roads and will not drive through solids.

## 2026-10-01 15:15 — to Agent A

NOTE: Right Shift runs on foot. The OH NO shout is gone. Space jumps while walking. Hold H when the plane is far and a taxi drives the driver back. I did not change flight keys.

## 2026-10-01 15:05 — to Agent A

NOTE: parachute A/D now match the driver's left and right. Shift runs on foot. Leaving a moving plane plays "Oh no".

## 2026-10-01 15:00 — to Agent A

NOTE: start screen holds the sim until **Start flight**. Driver walk is less shaky. I did not change your pitch keys.

## 2026-10-01 14:52 — to Agent A

NOTE: driver face now points the way they walk. Camera stays behind. I kept your `updateCity` call and runway reset.

## 2026-10-01 14:45 — to Agent A

NOTE: human asked to drive the person. **F** leaves the plane (`src/pilot/driver.js`). I removed `KeyF` from descend in `src/plane/flight.js` — **C** still descends. HUD mentions the exit.

NOTE: sky exit is a parachute. Ground exit is a step-off. WASD walks with a ridiculous pose. **E** near the plane boards again. I did not change spawn.

## 2026-10-01 14:40 — to Agent A

NOTE: the human asked for a pause menu. I added `src/ui/menu.js` and a pause gate in `src/main.js`. Esc or the Menu button stops flight, camera, and juice. I did not wire `updateCity` — T10 is still yours.

NOTE: `src/plane/audio.js` gained `setMasterVolume` and `setFlightAudible` so the menu can mute the engine while paused. Flight controls are unchanged.

## 2026-10-01 14:35 — to Agent A

DONE: T8 and T9. Chunks are 256 m, deterministic from `(cx, cz)`, 5×5 around the plane, unloaded chunks drop meshes and colliders.

KEEP: `getCityColliders()` is still a world-space `Box3` list of loaded solids only. Ground, roads, water, and trees are not solids. Spawn is still `(0, 50, 200)`.

ADD: import from `src/city/createCity.js`:

```js
import { createCity, updateCity, getGroundHeight } from "./city/createCity.js";

updateCity(cityRoot, plane.position);
const groundY = getGroundHeight(x, z);
```

NOTE: `getGroundHeight` returns `0` everywhere for now. Water surface is flat at y = 0. Bridges and docks are solids.

NOTE: origin chunk `(0, 0)` is downtown. Landmarks moved fully inside it: spire `(22, 22)`, hall `(64, 48)`, needle `(48, 96)`.

PLEASE: call `updateCity` once per frame after the plane moves (T10). Until then, only the spawn 5×5 exists.

## 2026-10-01 14:28 — to Agent A

ACK: `getCityColliders()` stays a world-space `Box3` list. Export name unchanged. Ground and roads are not registered.

DONE: T4–T6 are on main after this push. Collision can read the new blocks and three landmarks.

## 2026-10-01 14:16 — to Agent A

DONE: small city around origin. `getCityColliders()` returns a fresh world-space `Box3` list.

NOTE: ground, plaza, roads, and trees are not colliders. Blocks sit on a 46 m grid from -3 to 3, center cell left open.

NOTE: landmarks — spire `(22, 22)` about 92 m, hall `(-22, 18)` 14 m tall, needle `(20, -24)` about 110 m. Spawn `(0, 50, 200)` is outside the blocks.

PLEASE: hook collision when you can. Tell me if a street is too tight.

<!-- Agent B: append new notes at the top. Do not edit Agent A files. -->
