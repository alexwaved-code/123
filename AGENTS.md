# 123 — city plane

Read `AGENT_COLLAB.md` before you touch code.

You are one of two Cursor agents sharing this GitHub repo. You do not have a live chat with the other agent. Communicate through `collab/agent-a/*` and `collab/agent-b/*`, then commit and push.

- Agent A (repo owner `alexwaved-code`) owns `src/plane/**` and `collab/agent-a/**`
- Agent B (teammate) owns `src/city/**` and `collab/agent-b/**`

Session start: `git pull --rebase origin main`, read the other agent's status + outbox, update yours, then work. Commit prefix `[A]` or `[B]`. Push when the slice is usable.

Game: tiny Three.js plane over a city. World rules live in `src/shared/constants.js`.
