# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-26-workforce-capability-job-eligibility-foundation`
- Current immutable gameplay baseline: **CR-26A – Person Workforce Profile Contract**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current system block: **CR-26 – Workforce Capability & Job Eligibility Foundation**
- CR-26A – Person Workforce Profile Contract: **PASS / FROZEN / 0 BLOCKER**
- Current sub-block: **CR-26B – Workforce Availability & Assignment State Contract**
- CR-26B status: **IMPLEMENTED / NOT FROZEN**

## 2. Accepted CR-26 decomposition

1. **CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER**
   - specialization + capability set on existing `personId` / `unit:` identity,
   - no availability, assignment or job selection.
2. **CR-26B – Workforce Availability & Assignment State Contract — IMPLEMENTED / NOT FROZEN**
   - `FREE / ASSIGNED / UNAVAILABLE`,
   - at most one normal active assignment per person,
   - explicit stable temporary `assignment:` reference only while assigned,
   - no automatic candidate selection.
3. **CR-26C – Deterministic Job Eligibility & Assignment Selection — PLANNED / BLOCKED**
   - Capability + Availability + Preconditions + required Reachability,
   - deterministic single-person selection,
   - no transport-specific logistics rewrite.

## 3. Frozen CR-26A boundary

CR-26A owns one immutable `person-workforce-profile` for an existing Person:

- stable `personId` on existing `unit:` identity,
- explicit V1 specialization,
- explicit non-empty deterministic capability set,
- duplicate capabilities canonicalized away,
- deterministic ordering and immutability,
- CR-23 Person/Home identity remains unchanged.

The device/browser CR-26A Verification / Freeze Gate passed with **PASS / 0 BLOCKER** on 2026-09-05.

## 4. Implemented CR-26B boundary

CR-26B adds exactly one immutable `workforce-assignment-state` value:

- stable `personId` using existing `unit:` identity,
- Availability `FREE`, `ASSIGNED` or `UNAVAILABLE`,
- `assignmentId` is `null` for `FREE` and `UNAVAILABLE`,
- `ASSIGNED` requires exactly one stable `assignment:` ID,
- only `FREE` may accept a normal assignment,
- already `ASSIGNED` cannot accept a second normal assignment,
- `ASSIGNED -> FREE` releases the assignment,
- `FREE -> UNAVAILABLE -> FREE` is controlled and deterministic,
- all transitions preserve `personId`, create new immutable values and leave inputs unchanged.

CR-26B does not mutate identity, Home, specialization or capabilities and contains no automatic candidate selection, job prioritization, Eligibility calculation, Reachability/pathfinding, movement, work execution, production timing, builder execution, transport/logistics, SaveGame, rendering/UI or balancing.

## 5. Next allowed action

Run focused **CR-26B Verification / Freeze Gate** against frozen CR-26A and the CR-25 predecessor line.

Only after **PASS / 0 BLOCKER** may CR-26B be frozen and CR-26C begin.

## 6. Branch rule

CR-26 continues on the single development branch `feature/cr-26-workforce-capability-job-eligibility-foundation`.

Frozen branches are immutable markers only. No separate A/B/C working branches under normal conditions.

---

**Updated:** 2026-09-05 after CR-26B implementation. Current next activity: **CR-26B focused verification / freeze gate**.
