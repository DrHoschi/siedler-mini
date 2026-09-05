# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-26A implemented / verification next  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-26-workforce-capability-job-eligibility-foundation`  
**Frozen gameplay baseline:** **CR-25 – BuildingStock / Production Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

## 2. Current system block

### CR-26 – Workforce Capability & Job Eligibility Foundation — ACTIVE

CR-26 advances the non-transport part of **IM-06 – JobEngine / Assignment Contract Migration** and builds on the frozen S2D-02 workforce model.

- **CR-26A – Person Workforce Profile Contract — IMPLEMENTED / NOT FROZEN**
  - existing `personId` / `unit:` identity,
  - explicit specialization,
  - deterministic immutable non-empty capability set,
  - no Availability/Assignment/selection.
- **CR-26B – Workforce Availability & Assignment State Contract — PLANNED / BLOCKED**
  - `FREE / ASSIGNED / UNAVAILABLE`,
  - at most one normal active assignment,
  - temporary assignment must not change identity/specialization/capabilities.
- **CR-26C – Deterministic Job Eligibility & Assignment Selection — PLANNED / BLOCKED**
  - Capability + Availability + Preconditions + required Reachability,
  - deterministic selection of exactly one eligible person,
  - no transport-specific logistics rewrite.

## 3. CR-26A invariant

A real Person remains the same Person while workforce semantics are added:

`Person identity + Home + specialization + capabilities`

CR-26A does not introduce a current task. A temporary task must later remain a separate Assignment and must never rewrite person identity, specialization or capabilities.

## 4. CR-26A explicit exclusions

No Availability, Assignment, JobEngine queue/job generation, candidate prioritization/selection, Reachability/pathfinding/movement, completion/cancel/recovery, production timing/worker execution, builder execution, transport/logistics changes, Population creation, SaveGame, rendering/UI/Inspector/balancing.

## 5. Next allowed action

Run focused **CR-26A Verification / Freeze Gate**. Only at **PASS / 0 BLOCKER** may CR-26A receive an immutable frozen marker and CR-26B be released.

## 6. Branch/source-of-truth rule

- `main` remains historical old-game reference.
- `frozen/cr-25-buildingstock-production-foundation` is the immutable predecessor baseline.
- `feature/cr-26-workforce-capability-job-eligibility-foundation` is the single CR-26 development branch.
- No additional A/B/C working branch unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 after CR-26A implementation. Current next step: **CR-26A verification / freeze gate**.
