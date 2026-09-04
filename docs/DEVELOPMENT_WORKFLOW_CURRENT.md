# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Read this file plus the actual branch/HEAD, current gates and CI before every write.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main`
- Current development branch: `feature/cr-21c-reservation-controlled-step-movement-integration`
- Current completed sub-block: **CR-21C – Reservation-Controlled Step Movement Integration**
- CR-21C base SHA: `75dc7915adf51a8f34bf804f2bf47ba2267ab112`
- CR-21C implementation gate candidate SHA: `09001b95c57270fc6d60a4967e7f45b715b957fa`
- CR-21C CI: **PASS / 0 BLOCKER**, GitHub Actions run `33907897936` / run #4774
- Frozen baselines: **CR-20 – Reservation Lifecycle Foundation**, **CR-21A – Next Cell Reservation Intent Contract**, **CR-21B – Deterministic Reservation Execution Cycle**
- `main` remains intentionally unmerged until a new running game/integration state is ready.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-20 – Reservation Lifecycle Foundation | FROZEN | Regression only |
| 2 | CR-21A – Next Cell Reservation Intent Contract | FROZEN / PASS / 0 BLOCKER | Regression only |
| 3 | CR-21B – Deterministic Reservation Execution Cycle | FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-21C – Reservation-Controlled Step Movement Integration | COMPLETE / PASS / 0 BLOCKER | Regression only until overall CR-21 freeze |
| 5 | CR-21 overall Abschluss-/Regression-/Freeze-Gate | NEXT / PERMITTED | Regress CR-21A/B/C together and freeze CR-21 only on PASS / 0 BLOCKER |
| 6 | Repository cleanup before CR-22 | LOCKED | Do not start until CR-21 is fully FROZEN |
| 7 | CR-22 | LOCKED | Do not start until required cleanup gate passes |

## 3. CR-21C completed behavior

CR-21C integrates the frozen reservation decision with exactly one successful movement step:

- only the CR-21B winner with lifecycle state `GRANTED` may execute,
- the winner may enter exactly the cell held by that granted reservation,
- that cell must also be the immediate next point of the existing route,
- the movement call ends exactly at that one cell and cannot continue to the following route point,
- only after successful arrival does lifecycle transition `GRANTED → CONSUMED`,
- existing CR-20 lifecycle/blocking integration removes this reservation's own blocking effect,
- the reached carrier state is ready for a later next-cell intent but no new cycle is started automatically.

Verified exclusions:

- no CR-19 arbitration change,
- no CR-20 lifecycle semantics change,
- no WAITING/REQUESTED non-winner movement,
- no entry into an ungranted/wrong route cell,
- no automatic next reservation cycle,
- no multi-cell lookahead,
- no new pathfinding or rerouting policy,
- no unrelated transport/game-loop expansion.

## 4. CR-21C implementation evidence

The CR-21C self-test and CI verify:

1. GRANTED winner enters exactly the reserved immediate next route cell.
2. Movement stops at exactly that single cell.
3. Successful entry transitions reservation to CONSUMED.
4. CONSUMED loses its own reservation blocking effect through existing CR-20 integration.
5. WAITING/non-winner carrier cannot move.
6. Wrong immediate route cell is rejected before entry.
7. No next-cycle chaining, lookahead, pathfinding, rerouting or new arbitration policy is introduced.
8. CR-21B, CR-21A and CR-20 regressions remain green.

GitHub Actions run `33907897936` / run #4774 completed successfully with the explicit step:

`Run CR-21C Reservation-Controlled Step Movement Integration gate + CR-21B/CR-21A/CR-20 frozen regression`

## 5. Next permitted action: CR-21 overall freeze

Do not create CR-22 yet.

Next:

1. Create/execute the overall CR-21 Abschluss-/Regression-/Freeze-Gate on the current CR-21 development line.
2. Regress CR-21A + CR-21B + CR-21C together.
3. Verify the closed chain: route next-cell intent → REQUESTED reservation → frozen CR-19 arbitration → GRANTED winner / WAITING losers → exactly one reserved cell entry → CONSUMED → CR-20 blocking release → readiness for a later next intent.
4. Verify no automatic second cycle, lookahead, new arbitration, pathfinding or rerouting was pulled forward.
5. Only on PASS / 0 BLOCKER mark **CR-21 – Reservation-Controlled Traffic Execution Foundation FROZEN**.
6. After CR-21 FROZEN perform the mandatory repository cleanup described by the project guide before CR-22.

## 6. Source-of-truth / branch rules

Before every write verify repository, target branch, actual HEAD, active CR, frozen predecessor, scope, tests and CI. Keep current modular work off `main` until the planned running-game integration point.

The durable project method now prefers one branch per overall CR and one final overall-CR freeze; do not introduce further A/B/C branches for future CRs unless a concrete risk justifies it.

## 7. Known process traps

- Do not infer the active CR from chat history.
- Preserve exact suffixes A/B/C in files, tests, browser text, CI and summaries.
- Do not say the overall CR is FROZEN without its formal combined completion/regression gate at PASS / 0 BLOCKER.
- Do not pull later behavior forward because it is technically convenient.
- Do not treat old root/monolith documentation as current architecture.
- Keep visible browser/device text synchronized with the actual branch state.

---

**Updated:** 2026-09-04 after CR-21C implementation gate PASS / 0 BLOCKER; overall CR-21 freeze gate is now the next permitted action.
