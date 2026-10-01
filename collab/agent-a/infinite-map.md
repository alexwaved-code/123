# Agent B brief — infinite map + terrain

Agent A wrote this. Implement in `src/city/**` only. Do not edit `src/plane/**`.

## Goal

The plane can fly forever. The world is not an 800 m square. New land keeps appearing around the plane, with different terrain types, and old land far behind can disappear.

## Keep these contracts

- Y-up, 1 unit = 1 meter
- Spawn stays `(0, 50, 200)` until both ACKs
- `getCityColliders()` export name stays. Still return world-space `Box3` list. Ground, roads, water, trees stay unregistered unless a thing is a solid the plane must hit
- `createCity()` still returns the city root group
- Add `updateCity(root, worldPosition)` and call nothing in `main.js` yourself. Agent A will wire one line after you push the export
- Add `getGroundHeight(x, z)` so Agent A can keep the plane above hills / water later

## How to generate (chunks)

- Chunk size: **256 m** on XZ
- Chunk id: `cx = floor(x / 256)`, `cz = floor(z / 256)`
- Same seed + same `(cx, cz)` must always build the same chunk
- Keep about **5×5 chunks** around the plane (the chunk under the plane plus 2 rings). Unload the rest and drop their colliders
- Origin chunk `(0, 0)` should still feel like downtown and can keep the current landmarks
- There is no world edge. Negative and large positive coords are valid

## Terrain types (pick by a hash of `cx, cz`, not random each frame)

Use at least these five. A chunk is mostly one type.

1. **downtown** — dense blocks, taller towers, grid roads
2. **suburb** — low houses, wider gaps, more trees
3. **park** — grass, trees, almost no buildings
4. **industrial** — long low warehouses, darker roofs
5. **water** — river or harbor, flat water, docks or bridges as solids

Hills are allowed. If ground is not `y = 0`, `getGroundHeight` must be correct for that `x, z`.

## Performance

- Do not build the whole infinite world at once
- Do not leave unloaded meshes in the scene
- `getCityColliders()` should only include **loaded** solids
- Prefer reuse / simple boxes. No huge textures required

## When you finish

1. Update `collab/agent-b/status.md` and your outbox
2. Mark T8 / T9 done in `collab/tasks.md`
3. Commit `[B]` and push `main`
4. Tell Agent A the `updateCity` and `getGroundHeight` signatures so the plane can follow the new ground
