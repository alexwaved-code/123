# Agent collab — 123 city plane

兩台電腦上的 Cursor Agent **不能即時對話**。GitHub 就是共用黑板：一邊寫、push，另一邊 pull 再讀。

This repo is a tiny 3D web plane game. The goal is to fly over a city you both build.

- **Agent A** (this machine, GitHub `alexwaved-code`) = **Pilot**
- **Agent B** (teammate machine) = **City**

If you are unsure which agent you are, ask the human. Then write `A` or `B` into local `collab/.agent-id` (gitignored).

---

## Every session (do this first)

1. `git pull --rebase origin main`
2. Read this file, `collab/tasks.md`, and the **other** agent's `status.md` + `outbox.md`
3. Reply in **your** `outbox.md` if they asked you something
4. Update **your** `status.md` (`doing` / `done` / `blocked` / `ask_other`)
5. Work **only** in files you own
6. Commit with prefix `[A]` or `[B]`, then `git push origin main`
7. Tell the human: pulled / what you read / what you pushed

Do not start coding before step 2.

---

## How the two agents talk

Write only your own files. Never edit the other agent's `status.md` or `outbox.md`.

| File | Who writes |
|---|---|
| `collab/agent-a/status.md` | A only |
| `collab/agent-a/outbox.md` | A only — messages **to B** |
| `collab/agent-b/status.md` | B only |
| `collab/agent-b/outbox.md` | B only — messages **to A** |
| `collab/tasks.md` | Either, but only your own rows |

### Message shape (append at the top of your outbox)

```md
## 2026-10-01 14:20 — to Agent B
NEED: `getCityColliders()` must return world-space Box3 list
BLOCKED: plane-building hits
NOTE: spawn stays at (0, 50, 200)
```

Keep each note short. One ask per message when you can.

---

## Job allocation

### Agent A — Pilot (`src/plane/**`)

- Plane mesh, flight feel, keyboard
- Follow camera
- HUD: speed / altitude / heading
- Read city colliders and bounce / slide off buildings
- Sky, fog, sun (lighting may stay here so the city looks consistent)

### Agent B — City (`src/city/**`)

- Ground, roads, blocks, landmarks
- `getCityColliders()` in `src/city/colliders.js`
- Place the city so a plane can fly streets and around towers
- Props that do not change flight code

### Shared — talk first, then one person edits

- `src/main.js`, `src/shared/**`, `index.html`, `package.json`
- World numbers in `src/shared/constants.js`
- If you must touch a shared file: write the plan in your outbox, wait for the other status to ACK, then edit

---

## World contract (do not change quietly)

- Y-up, 1 unit = 1 meter
- Ground plane `y = 0`
- City around origin on XZ
- Plane spawn: `SPAWN` in `src/shared/constants.js` — default `(0, 50, 200)` looking at origin
- Buildings expose colliders through `getCityColliders()`
- Do not rename these exports without an outbox note: `createPlane`, `updateFlight`, `createFollowCamera`, `createCity`, `getCityColliders`

---

## File ownership

```
src/plane/**          Agent A
src/city/**           Agent B
src/shared/**         shared (ACK first)
src/main.js           shared (ACK first)
collab/agent-a/**     Agent A
collab/agent-b/**     Agent B
collab/tasks.md       own rows only
AGENT_COLLAB.md       shared (ACK first)
```

---

## Conflicts

- Pull rebase before you push. If rebase stops, fix only files you own.
- Same-file fight: keep the other side's work, put your extra change in a new owned file, explain in outbox.
- Cursor **Resolve in Chat** is allowed on your files only.
- Never force-push `main`.

---

## Do not

- Commit `.env`, keys, `node_modules`, `dist`
- Edit the other agent's outbox/status
- Rewrite the city and the plane in one commit
- Invent a live socket between the two Cursor apps — it will not stay in sync. Git is the bus.
