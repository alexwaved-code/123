# 123 — city plane

Tiny 3D web plane game. Take off from runway 18, fly the city, land or crash.

```bash
npm install
npm run dev
```

Start on the runway. `W` throttle, wait until IAS hits **Vr 28**, then `R` to rotate. `F` brakes on the ground. In the air, `R/F` pitch, `G` gear, `Enter` reset after a crash.

Two-agent setup: read `AGENT_COLLAB.md` first.

- Agent A (plane): `src/plane/`
- Agent B (city): `src/city/`
