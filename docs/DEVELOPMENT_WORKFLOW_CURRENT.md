# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Read this file plus the actual branch/HEAD, current gates and CI before every write.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main`
- Current development branch: `feature/cr-21b-deterministic-reservation-execution-cycle`
- Current development block: **CR-21B – Deterministic Reservation Execution Cycle**
- Branch base / frozen predecessor: `474b07f73b1f253b6ab507c3342874a514048760`
- Frozen baselines: **CR-20 – Reservation Lifecycle Foundation**, **CR-21A – Next Cell Reservation Intent Contract**
- `main` remains intentionally unmerged until a new running game/integration state is ready.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-20 – Reservation Lifecycle Foundation | FROZEN | Regression only |
| 2 | CR-21A – Next Cell Reservation Intent Contract | FROZEN / PASS / 0 BLOCKER | Regression only |
| 3 | CR-21B – Deterministic Reservation Execution Cycle | ACTIVE | Implement only CR-21B scope |
| 4 | CR-21B gate | NEXT after implementation | CR-21B + CR-21A frozen regression |
| 5 | CR-21C | LOCKED | Do not start until CR-21B is formally closed |

## 3. CR-21B scope contract

CR-21B connects exactly one deterministic reservation decision cycle for carriers that already have valid CR-21A next-cell intents.

Required behavior:

- Convert each valid next-cell intent into the existing CR-19 `REQUESTED` CellReservation shape for a supplied validity window.
- Competing intents in one cycle must target the same immediate next cell.
- Use the existing frozen CR-19 deterministic arbitration unchanged.
- The selected winner becomes CR-20 lifecycle state `GRANTED`.
- Non-winners remain reservation lifecycle state `REQUESTED` and the cycle reports that they must wait.
- Same inputs must produce the same winner/waiting result.

Explicit exclusions:

- no movement or cell entry,
- no `CONSUMED` transition,
- no reservation release after movement,
- no next-cycle chaining,
- no pathfinding or rerouting,
- no multi-cell lookahead,
- no change to CR-19 arbitration policy,
- no change to CR-20 lifecycle semantics.

## 4. Mandatory gate / regression

CR-21B is not complete or frozen merely because implementation exists or a browser page says PASS.

Before advancing:

1. CR-21B self-test must pass.
2. CR-21A formal freeze gate must remain PASS / 0 BLOCKER.
3. CR-20 frozen regression must remain PASS / 0 BLOCKER.
4. CI naming and browser text must name CR-21B exactly.
5. Scope-exclusion checks must prove there is no movement, consumption, pathfinding, rerouting or new arbitration policy.
6. Only after the formal CR-21B completion gate passes may CR-21C be created.

## 5. Source-of-truth / branch rules

Before every write verify repository, target branch, actual HEAD, active CR, frozen predecessor, scope, tests and CI. One active CR/sub-block per feature branch. Never write current modular work to `main` or a legacy branch by accident. Never start the next sub-block before the current formal gate is complete.

## 6. Known process traps

- Do not infer the active CR from chat history.
- Preserve exact suffixes A/B/C in branches, files, tests, CI and summaries.
- Do not say FROZEN without a formal completion/regression gate at PASS / 0 BLOCKER.
- Do not pull later-subblock behavior forward because it is technically convenient.
- Do not treat old root/monolith documentation as current architecture.
- Update this file whenever active branch, active CR, frozen baseline or next permitted action changes.

---

**Updated:** 2026-09-04 for CR-21B transition after CR-21A formal freeze.
