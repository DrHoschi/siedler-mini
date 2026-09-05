# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-26-workforce-capability-job-eligibility-foundation`
- Current immutable gameplay baseline: **CR-25 – BuildingStock / Production Foundation**
- CR-25: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current system block: **CR-26 – Workforce Capability & Job Eligibility Foundation**
- Current sub-block: **CR-26A – Person Workforce Profile Contract**
- CR-26A status: **IMPLEMENTED / NOT FROZEN**

## 2. Accepted CR-26 decomposition

1. **CR-26A – Person Workforce Profile Contract**
   - specialization + capability set on existing `personId` / `unit:` identity,
   - no availability, assignment or job selection.
2. **CR-26B – Workforce Availability & Assignment State Contract**
   - `FREE / ASSIGNED / UNAVAILABLE`,
   - at most one normal active assignment per person,
   - no automatic candidate selection.
3. **CR-26C – Deterministic Job Eligibility & Assignment Selection**
   - Capability + Availability + Preconditions + required Reachability,
   - deterministic single-person selection,
   - no transport-specific logistics rewrite.

## 3. Implemented CR-26A boundary

CR-26A defines one immutable `person-workforce-profile` for an existing Person:

- stable `personId` using existing `unit:` ID kind,
- explicit V1 specialization,
- explicit non-empty deterministic capability set,
- duplicate capabilities are canonicalized away and ordering is deterministic,
- identity/Home from CR-23 remain unchanged.

CR-26A contains no Availability, Assignment, Job IDs, job queues, candidate selection, Reachability, pathfinding, movement, workforce execution, production timing, construction work, transport logistics, SaveGame ownership, rendering/UI or balancing.

## 4. Frozen predecessor ownership

- CR-22 owns Building identity/lifecycle/registration.
- CR-23 owns Person identity, Home assignment and Housing capacity/occupancy.
- CR-24 owns construction state/progress/completion.
- CR-25 owns BuildingStock and minimal Production -> BuildingStock execution.

CR-26 extends Person workforce semantics without reopening those owners.

## 5. Next allowed action

Run focused **CR-26A Verification / Freeze Gate** against the frozen CR-25 predecessor line and the new Person Workforce Profile contract.

Only after **PASS / 0 BLOCKER** may CR-26A be frozen and CR-26B begin.

## 6. Branch rule

CR-26 uses one development branch: `feature/cr-26-workforce-capability-job-eligibility-foundation`.

Frozen branches are immutable markers only. No separate CR-26A/B/C working branches under normal conditions.

---

**Updated:** 2026-09-05 after CR-26A implementation. Current next activity: **CR-26A focused verification / freeze gate**.
