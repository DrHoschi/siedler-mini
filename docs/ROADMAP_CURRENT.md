# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-26A active  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-26-workforce-capability-job-eligibility-foundation`  
**Frozen gameplay baseline:** **CR-25 – BuildingStock / Production Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-25 provides immutable local BuildingStock, deterministic add/remove mutation and minimal Production -> BuildingStock execution. It intentionally excludes workforce/professions/assignments.

## 2. Current system block

### CR-26 – Workforce Capability & Job Eligibility Foundation — ACTIVE

CR-26 advances the non-transport part of **IM-06 – JobEngine / Assignment Contract Migration** and builds on the frozen S2D-02 workforce model.

Accepted decomposition:

- **CR-26A – Person Workforce Profile Contract — ACTIVE / NOT FROZEN**
  - existing `personId` / `unit:` identity,
  - specialization,
  - deterministic capability set,
  - no Availability/Assignment/selection.
- **CR-26B – Workforce Availability & Assignment State Contract — PLANNED**
  - `FREE / ASSIGNED / UNAVAILABLE`,
  - at most one normal active assignment,
  - temporary assignment must not change identity/specialization/capabilities.
- **CR-26C – Deterministic Job Eligibility & Assignment Selection — PLANNED**
  - Capability + Availability + Preconditions + required Reachability,
  - deterministic selection of exactly one eligible person,
  - no transport-specific logistics rewrite.

## 3. Product/workforce invariant

A real Person remains the same Person while working:

`Person identity + Home + specialization + capabilities + temporary assignment`

A temporary task must never transform a resident into a different permanent unit type and must not spontaneously create capabilities.

## 4. CR-26A explicit exclusions

No:

- Availability state,
- Assignment state/IDs,
- JobEngine queue or automatic job generation,
- candidate prioritization/selection,
- Reachability/pathfinding/movement,
- job completion/cancel/recovery,
- production timing/worker execution,
- builder execution,
- transport/logistics changes,
- Population creation,
- SaveGame, rendering/UI/Inspector/balancing.

## 5. Next allowed action

Implement and verify **CR-26A – Person Workforce Profile Contract** only. CR-26B stays blocked until CR-26A reaches **PASS / FROZEN / 0 BLOCKER**.

## 6. Branch/source-of-truth rule

- `main` remains historical old-game reference.
- `frozen/cr-25-buildingstock-production-foundation` is the immutable predecessor baseline.
- `feature/cr-26-workforce-capability-job-eligibility-foundation` is the single CR-26 development branch.
- No additional A/B/C working branch unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 after repository-based IM ↔ CR reconciliation and explicit CR-26 boundary acceptance.
