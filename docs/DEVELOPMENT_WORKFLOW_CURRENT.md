# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Read this file plus the actual branch/HEAD, current gates and CI before every write.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main`
- Current development branch: `feature/cr-21c-reservation-controlled-step-movement-integration`
- Current completed system block: **CR-21 – Reservation-Controlled Traffic Execution Foundation**
- CR-21 formal freeze gate candidate SHA: `98efc367d90827e61785d0627680ede73f68b491`
- CR-21 CI: **PASS / 0 BLOCKER**, GitHub Actions run `33908668767` / run #4781
- Frozen baselines: **CR-20 – Reservation Lifecycle Foundation**, **CR-21 – Reservation-Controlled Traffic Execution Foundation**
- CR-21 contains the completed sub-blocks CR-21A, CR-21B and CR-21C.
- `main` remains intentionally unmerged until a new running game/integration state is ready.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-20 – Reservation Lifecycle Foundation | FROZEN | Regression only |
| 2 | CR-21A – Next Cell Reservation Intent Contract | COMPLETE within CR-21 | Regression only |
| 3 | CR-21B – Deterministic Reservation Execution Cycle | COMPLETE within CR-21 | Regression only |
| 4 | CR-21C – Reservation-Controlled Step Movement Integration | COMPLETE within CR-21 | Regression only |
| 5 | CR-21 – Reservation-Controlled Traffic Execution Foundation | FROZEN / PASS / 0 BLOCKER | Immutable baseline unless explicitly reopened |
| 6 | Repository cleanup before CR-22 | NEXT / REQUIRED | Perform branch/legacy/docs cleanup and dedicated verification gate |
| 7 | CR-22 | LOCKED | Do not start until required cleanup gate passes |

## 3. Frozen CR-21 contract

CR-21 establishes the closed reservation-controlled traffic execution chain for one route cell at a time:

- a carrier at a reached route point may express intent only for the immediate next route cell,
- CR-21B converts valid intents to existing CR-19 `REQUESTED` reservations,
- frozen CR-19 arbitration remains unchanged and deterministically selects exactly one winner,
- the winner becomes CR-20 lifecycle state `GRANTED`; non-winners remain `REQUESTED` / `WAITING`,
- only the `GRANTED` winner may enter exactly the reserved immediate next route cell,
- the movement call stops at that single cell and cannot continue to another route point,
- after successful entry lifecycle transitions `GRANTED → CONSUMED`,
- existing CR-20 lifecycle/blocking integration removes that reservation's own blocking effect,
- the reached carrier is ready to express a later intent for the following route cell, but no new reservation cycle starts automatically.

Frozen exclusions:

- no automatic second reservation cycle,
- no multi-cell lookahead,
- no CR-19 arbitration change,
- no CR-20 lifecycle semantics change,
- no new pathfinding or rerouting policy,
- no unrelated transport/game-loop expansion.

## 4. Formal CR-21 freeze evidence

The overall CR-21 Abschluss-/Regression-/Freeze-Gate verifies:

1. CR-21A self-test PASS / 0 BLOCKER.
2. CR-21B self-test PASS / 0 BLOCKER.
3. CR-21C self-test PASS / 0 BLOCKER.
4. CR-20 frozen baseline regression PASS / 0 BLOCKER.
5. Closed chain: next-cell intent → REQUESTED → frozen arbitration → GRANTED/WAITING → exactly one reserved-cell entry → CONSUMED → reservation blocking release.
6. The reached winner can express a later next-cell intent without CR-21 automatically starting another cycle.
7. WAITING loser remains REQUESTED and unmoved.
8. Same inputs remain deterministic.
9. No automatic second cycle, lookahead, pathfinding, rerouting or new arbitration was introduced.

GitHub Actions run `33908668767` / run #4781 completed the explicit step:

`Run CR-21 overall completion/freeze gate + CR-20 frozen regression`

with **PASS / 0 BLOCKER**.

## 5. Next required action: repository cleanup before CR-22

Do not create CR-22 yet.

The project guide requires a cleanup after fully FROZEN CR-21 and before CR-22. The cleanup must preserve the modular development line and the current CR-21 frozen baseline while reducing obsolete branches and legacy confusion.

Required cleanup principles:

- keep the modular development line and meaningful current frozen rollback point(s),
- inspect and remove obsolete A/B/C, patch, temporary and superseded working branches where safely contained in the frozen line,
- keep `main` as historical old-game reference for now,
- do not pull the old monolith into the cleaned modular baseline,
- preserve visual/art assets and reorganize rather than destructively delete them,
- remove or clearly relocate misleading legacy documentation,
- close cleanup with its own verification gate,
- only the verified cleaned modular baseline may become the base for CR-22.

## 6. Source-of-truth / branch rules

Before every write verify repository, target branch, actual HEAD, active action, frozen predecessor, scope, tests and CI. Keep current modular work off `main` until the planned running-game integration point.

For future CRs, the durable project method uses one branch per overall CR; A/B/C normally run sequentially on that same branch. Additional branches require a concrete risk justification.

## 7. Known process traps

- Do not infer the active CR from chat history.
- Keep browser/device text synchronized with actual branch state.
- Do not reopen CR-21 silently after FROZEN.
- Do not start CR-22 before the mandatory cleanup verification passes.
- Do not treat old root/monolith documentation as current architecture.
- Preserve assets during cleanup unless an item is explicitly verified disposable.

---

**Updated:** 2026-09-04 after formal CR-21 overall Abschluss-/Regression-/Freeze-Gate PASS / 0 BLOCKER; repository cleanup before CR-22 is now NEXT / REQUIRED.
