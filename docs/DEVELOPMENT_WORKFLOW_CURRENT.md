# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Read this file plus the actual branch/HEAD, current gates and CI before every write.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main`
- Current development branch: `feature/cr-21b-deterministic-reservation-execution-cycle`
- Current completed block: **CR-21B – Deterministic Reservation Execution Cycle**
- CR-21B formal freeze gate candidate SHA: `d55cbfc304e4b1e12da50a5ea048667c479926ee`
- CR-21B CI: **PASS / 0 BLOCKER**, GitHub Actions run `33905542765` / run #4761
- Frozen baselines: **CR-20 – Reservation Lifecycle Foundation**, **CR-21A – Next Cell Reservation Intent Contract**, **CR-21B – Deterministic Reservation Execution Cycle**
- `main` remains intentionally unmerged until a new running game/integration state is ready.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-20 – Reservation Lifecycle Foundation | FROZEN | Regression only |
| 2 | CR-21A – Next Cell Reservation Intent Contract | FROZEN / PASS / 0 BLOCKER | Regression only |
| 3 | CR-21B – Deterministic Reservation Execution Cycle | FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-21C – Reservation-Controlled Step Movement Integration | NEXT / PERMITTED | Establish exact scope, create dedicated branch from the final green CR-21B HEAD, then implement only CR-21C |
| 5 | CR-21 overall freeze | LOCKED | Do not run until CR-21C is formally completed/frozen |

## 3. Frozen CR-21B contract

CR-21B connects exactly one deterministic reservation decision cycle for carriers that already have valid CR-21A next-cell intents.

Frozen behavior:

- Convert each valid next-cell intent into the existing CR-19 `REQUESTED` CellReservation shape for a supplied validity window.
- Competing intents in one cycle target the same immediate next cell.
- Use the frozen CR-19 deterministic arbitration unchanged.
- The selected winner becomes CR-20 lifecycle state `GRANTED`.
- Non-winners remain reservation lifecycle state `REQUESTED` and the cycle reports `WAITING`.
- Same inputs produce the same winner/waiting result.

Frozen exclusions:

- no movement or cell entry,
- no `CONSUMED` transition,
- no reservation release after movement,
- no next-cycle chaining,
- no pathfinding or rerouting,
- no multi-cell lookahead,
- no change to CR-19 arbitration policy,
- no change to CR-20 lifecycle semantics.

## 4. Formal CR-21B freeze evidence

The formal CR-21B completion/freeze gate regressions include:

1. CR-21B self-test PASS / 0 BLOCKER.
2. CR-21A formal freeze gate PASS / 0 BLOCKER.
3. CR-20 frozen regression PASS / 0 BLOCKER.
4. REQUESTED → arbitration → exactly one GRANTED winner, remaining REQUESTED/WAITING.
5. Deterministic same-input result.
6. Existing CR-19 arbitration policy remains delegated and unchanged.
7. Scope exclusions remain intact: no movement, cell entry, consumption, release-after-movement, next-cycle chaining, pathfinding, rerouting or lookahead.

GitHub Actions run `33905542765` completed successfully with the explicit step:

`Run CR-21B completion/freeze gate + CR-21A/CR-20 frozen regression`

## 5. Next permitted block: CR-21C

Before any CR-21C write:

1. Re-read this file from the current final green branch HEAD.
2. Confirm actual CR-21B branch HEAD and CI are green.
3. Create a dedicated CR-21C branch from that exact final green CR-21B HEAD.
4. Update this file in the CR-21C branch to mark CR-21C ACTIVE and CR-21B FROZEN.
5. Implement only **CR-21C – Reservation-Controlled Step Movement Integration**.

Planned CR-21C boundary from the established CR-21 plan:

- a carrier with the winning `GRANTED` reservation may enter exactly that reserved next route cell,
- after successful entry the reservation may become `CONSUMED`,
- CR-20 lifecycle/blocking semantics then remove that reservation's blocking effect,
- the carrier may only after that completed step be ready to express intent for the following route cell.

Still excluded until explicitly scoped inside CR-21C implementation:

- multi-cell lookahead,
- changing CR-19 arbitration,
- changing CR-20 lifecycle semantics,
- new pathfinding or rerouting policy,
- unrelated transport/game-loop expansion.

## 6. Source-of-truth / branch rules

Before every write verify repository, target branch, actual HEAD, active CR, frozen predecessor, scope, tests and CI. One active CR/sub-block per feature branch. Never write current modular work to `main` or a legacy branch by accident. Never start the next sub-block before the current formal gate is complete.

## 7. Known process traps

- Do not infer the active CR from chat history.
- Preserve exact suffixes A/B/C in branches, files, tests, CI and summaries.
- Do not say FROZEN without a formal completion/regression gate at PASS / 0 BLOCKER.
- Do not pull later-subblock behavior forward because it is technically convenient.
- Do not treat old root/monolith documentation as current architecture.
- Update this file whenever active branch, active CR, frozen baseline or next permitted action changes.

---

**Updated:** 2026-09-04 after formal CR-21B completion/freeze gate PASS / 0 BLOCKER.
