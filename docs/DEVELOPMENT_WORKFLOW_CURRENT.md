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
- CR-26B status: **NEXT / NOT IMPLEMENTED**

## 2. Accepted CR-26 decomposition

1. **CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER**
   - specialization + capability set on existing `personId` / `unit:` identity,
   - no availability, assignment or job selection.
2. **CR-26B – Workforce Availability & Assignment State Contract — NEXT / NOT IMPLEMENTED**
   - `FREE / ASSIGNED / UNAVAILABLE`,
   - at most one normal active assignment per person,
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

CR-26A contains no Availability, Assignment, Job IDs, queues, candidate selection, Reachability, pathfinding, movement or work execution.

The device/browser CR-26A Verification / Freeze Gate passed with **PASS / 0 BLOCKER** on 2026-09-05.

## 4. CR-26B allowed boundary

CR-26B may add only the temporary workforce assignment-state boundary on top of the frozen CR-26A profile:

- Availability states `FREE`, `ASSIGNED`, `UNAVAILABLE`,
- explicit temporary Assignment ownership/reference,
- at most one normal active Assignment per Person,
- deterministic valid transitions into and out of assigned state,
- identity, Home, specialization and capabilities remain unchanged.

CR-26B must not add automatic candidate selection, job prioritization, Reachability/pathfinding, movement, production timing, builder execution, transport/logistics, SaveGame, rendering/UI or balancing.

## 5. Next allowed action

Begin **CR-26B – Workforce Availability & Assignment State Contract** on the existing CR-26 development branch.

Do not create a separate CR-26B working branch. CR-26C remains blocked until CR-26B is implemented, verified and frozen.

## 6. Branch rule

CR-26 continues on the single development branch `feature/cr-26-workforce-capability-job-eligibility-foundation`.

Frozen branches are immutable markers only. No separate A/B/C working branches under normal conditions.

---

**Updated:** 2026-09-05 after device/browser CR-26A Verification / Freeze Gate: **PASS / 0 BLOCKER**. Current next activity: **CR-26B – Workforce Availability & Assignment State Contract**.
