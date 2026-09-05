# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-26-workforce-capability-job-eligibility-foundation`
- Current immutable gameplay baseline: **CR-26B – Workforce Availability & Assignment State Contract**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current system block: **CR-26 – Workforce Capability & Job Eligibility Foundation**
- CR-26A – Person Workforce Profile Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-26B – Workforce Availability & Assignment State Contract: **PASS / FROZEN / 0 BLOCKER**
- Current sub-block: **CR-26C – Deterministic Job Eligibility & Assignment Selection**
- CR-26C status: **IMPLEMENTED / NOT FROZEN**

## 2. Accepted CR-26 decomposition

1. **CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER**
   - specialization + capability set on existing `personId` / `unit:` identity,
   - no availability, assignment or job selection.
2. **CR-26B – Workforce Availability & Assignment State Contract — PASS / FROZEN / 0 BLOCKER**
   - `FREE / ASSIGNED / UNAVAILABLE`,
   - at most one normal active assignment per person,
   - explicit stable temporary `assignment:` reference only while assigned,
   - no automatic candidate selection.
3. **CR-26C – Deterministic Job Eligibility & Assignment Selection — IMPLEMENTED / NOT FROZEN**
   - Capability + Availability + Preconditions + required Reachability,
   - deterministic single-person selection,
   - selected Person receives exactly one normal assignment through CR-26B,
   - no transport-specific logistics rewrite.

## 3. Frozen CR-26A boundary

CR-26A owns one immutable `person-workforce-profile` for an existing Person:

- stable `personId` on existing `unit:` identity,
- explicit V1 specialization,
- explicit non-empty deterministic capability set,
- duplicate capabilities canonicalized away,
- deterministic ordering and immutability,
- CR-23 Person/Home identity remains unchanged.

## 4. Frozen CR-26B boundary

CR-26B owns one immutable `workforce-assignment-state` value:

- stable `personId` using existing `unit:` identity,
- Availability `FREE`, `ASSIGNED` or `UNAVAILABLE`,
- `assignmentId` is `null` for `FREE` and `UNAVAILABLE`,
- `ASSIGNED` requires exactly one stable `assignment:` ID,
- only `FREE` may accept a normal assignment,
- already `ASSIGNED` cannot accept a second normal assignment,
- controlled immutable transitions preserve `personId` and leave inputs unchanged.

The device/browser CR-26B Verification / Freeze Gate passed with **PASS / 0 BLOCKER** on 2026-09-05.

## 5. Implemented CR-26C boundary

CR-26C introduces one immutable `workforce-job-eligibility-request`:

- stable `assignmentId`,
- exactly one required CR-26A Capability,
- explicit boolean `preconditionsPassed`,
- explicit `requiresReachability`,
- `reachable` is required only when Reachability is required.

A candidate consists only of a valid CR-26A Profile plus a valid CR-26B Assignment-State with identical `personId`.

Eligibility requires all of:

- required Capability present,
- Availability exactly `FREE`,
- Preconditions pass,
- required Reachability input passes when applicable.

If multiple candidates are eligible, CR-26C deterministically chooses exactly one by stable `personId`, independent of input order.

`selectAndAssign(...)` delegates the state change exclusively to frozen `WorkforceAssignmentStateContract.assign(...)`; Profile and input State remain unchanged.

CR-26C does not implement Jobpriorisierung, JobEngine queue/generation, Reachability calculation, pathfinding/routes/movement, production timing/execution, builder execution, transport/logistics rewrite, completion/cancel/recovery orchestration, SaveGame, rendering/UI/Inspector or balancing.

## 6. Next allowed action

Run focused **CR-26C Verification / Freeze Gate** against frozen CR-26A/B and the full predecessor line.

Only after **PASS / 0 BLOCKER** may CR-26C be frozen. After that, run the common **CR-26 Completion / Regression / Freeze Gate** before CR-26 as a whole may become COMPLETE / FROZEN.

## 7. Branch rule

CR-26 continues on the single development branch `feature/cr-26-workforce-capability-job-eligibility-foundation`.

Frozen branches are immutable markers only. No separate A/B/C working branches under normal conditions.

---

**Updated:** 2026-09-05 after CR-26C implementation. Current next activity: **CR-26C focused verification / freeze gate**.
