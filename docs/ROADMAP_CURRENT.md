# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-26B implemented / verification next  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-26-workforce-capability-job-eligibility-foundation`  
**Frozen gameplay baseline:** **CR-26A – Person Workforce Profile Contract**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

### CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER

CR-26A establishes the immutable workforce profile on an existing Person:

- stable `personId` on existing `unit:` identity,
- explicit V1 specialization,
- deterministic immutable non-empty capability set,
- no Availability, Assignment or job selection.

Device/browser Verification / Freeze Gate passed with **PASS / 0 BLOCKER** on 2026-09-05.

## 2. Current system block

### CR-26 – Workforce Capability & Job Eligibility Foundation — ACTIVE

CR-26 advances the non-transport part of **IM-06 – JobEngine / Assignment Contract Migration**.

- **CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-26B – Workforce Availability & Assignment State Contract — IMPLEMENTED / NOT FROZEN**
  - `FREE / ASSIGNED / UNAVAILABLE`,
  - `ASSIGNED` owns exactly one stable `assignment:` reference,
  - at most one normal active Assignment per Person,
  - controlled immutable transitions into/out of assigned and unavailable states,
  - temporary Assignment does not change identity/Home/specialization/capabilities,
  - no automatic candidate selection.
- **CR-26C – Deterministic Job Eligibility & Assignment Selection — PLANNED / BLOCKED**
  - Capability + Availability + Preconditions + required Reachability,
  - deterministic selection of exactly one eligible Person,
  - no transport-specific logistics rewrite.

## 3. Product/workforce invariant

A real Person remains the same Person while working:

`Person identity + Home + specialization + capabilities + temporary assignment`

A temporary task must never transform a resident into a different permanent unit type and must not spontaneously create capabilities.

## 4. CR-26B explicit exclusions

No automatic candidate prioritization/selection, Eligibility evaluation, Reachability/pathfinding/movement, production timing/worker execution, builder execution, transport/logistics changes, concrete job completion/cancel/recovery orchestration, Population creation, SaveGame, rendering/UI/Inspector/balancing.

## 5. Next allowed action

Run focused **CR-26B Verification / Freeze Gate** against frozen CR-26A and the full frozen predecessor line. CR-26C remains blocked until CR-26B reaches **PASS / FROZEN / 0 BLOCKER**.

## 6. Branch/source-of-truth rule

- `main` remains historical old-game reference.
- `frozen/cr-25-buildingstock-production-foundation` remains the frozen predecessor system baseline.
- `frozen/cr-26a-person-workforce-profile-contract` is the immutable CR-26A marker.
- `feature/cr-26-workforce-capability-job-eligibility-foundation` is the single CR-26 development branch.
- Frozen A/B/C branches are immutable markers only.

---

**Updated:** 2026-09-05 after CR-26B implementation. Current next step: **CR-26B verification / freeze gate**.
