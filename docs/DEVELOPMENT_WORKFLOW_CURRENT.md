# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Read this file plus the actual branch/HEAD, current gates and CI before every write.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main`
- Current development branch: `feature/cr-21c-reservation-controlled-step-movement-integration`
- Current active block: **CR-21C – Reservation-Controlled Step Movement Integration**
- CR-21C base SHA: `75dc7915adf51a8f34bf804f2bf47ba2267ab112`
- Frozen baselines: **CR-20 – Reservation Lifecycle Foundation**, **CR-21A – Next Cell Reservation Intent Contract**, **CR-21B – Deterministic Reservation Execution Cycle**
- `main` remains intentionally unmerged until a new running game/integration state is ready.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-20 – Reservation Lifecycle Foundation | FROZEN | Regression only |
| 2 | CR-21A – Next Cell Reservation Intent Contract | FROZEN / PASS / 0 BLOCKER | Regression only |
| 3 | CR-21B – Deterministic Reservation Execution Cycle | FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-21C – Reservation-Controlled Step Movement Integration | ACTIVE | Implement and test only CR-21C |
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

Frozen exclusions remain unchanged.

## 4. Active CR-21C scope

CR-21C may only integrate the already frozen reservation decision with one successful movement step:

- accept only the CR-21B winner with lifecycle state `GRANTED`,
- allow that carrier to enter exactly the cell held by that granted reservation and no other route cell,
- after successful arrival at that exact cell transition the reservation `GRANTED → CONSUMED`,
- apply existing CR-20 lifecycle/blocking integration so the consumed reservation loses its own blocking effect,
- return the carrier at the reached route point in a state from which a later next-cell intent may be expressed.

CR-21C must not:

- alter CR-19 arbitration,
- alter CR-20 lifecycle semantics,
- move a WAITING/non-winner carrier,
- enter a cell other than the granted reservation cell,
- chain another reservation cycle automatically,
- add multi-cell lookahead,
- add pathfinding or rerouting policy,
- expand unrelated transport or game-loop behavior.

## 5. Required CR-21C evidence

Before CR-21C can be marked complete:

1. Only a `GRANTED` CR-21B winner can execute the step.
2. Movement target equals the granted reservation cell exactly.
3. Successful entry reaches exactly one route cell and does not continue to another route point in the same call.
4. Successful entry transitions lifecycle `GRANTED → CONSUMED`.
5. Applying existing CR-20 traffic integration removes only this reservation's blocking effect.
6. WAITING / REQUESTED outcomes cannot move.
7. Wrong-cell or mismatched-carrier inputs are rejected.
8. CR-21B, CR-21A and CR-20 frozen regressions remain green.
9. No automatic next-cycle chaining, lookahead, pathfinding, rerouting or arbitration change is introduced.

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

**Updated:** 2026-09-04 when CR-21C was activated from final green CR-21B HEAD `75dc7915adf51a8f34bf804f2bf47ba2267ab112`.
