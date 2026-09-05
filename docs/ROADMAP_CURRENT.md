# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-26C next  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-26-workforce-capability-job-eligibility-foundation`  
**Frozen gameplay baseline:** **CR-26B – Workforce Availability & Assignment State Contract**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

### CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER

CR-26A establishes the immutable workforce profile on an existing Person:

- stable `personId` on existing `unit:` identity,
- explicit V1 specialization,
- deterministic immutable non-empty capability set,
- no Availability, Assignment or job selection.

### CR-26B – Workforce Availability & Assignment State Contract — PASS / FROZEN / 0 BLOCKER

CR-26B establishes the separate temporary workforce state:

- `FREE / ASSIGNED / UNAVAILABLE`,
- `ASSIGNED` owns exactly one stable `assignment:` reference,
- at most one normal active Assignment per Person,
- controlled immutable transitions,
- identity/Home/specialization/capabilities remain unchanged,
- no automatic candidate selection.

Device/browser CR-26B Verification / Freeze Gate passed with **PASS / 0 BLOCKER** on 2026-09-05.

## 2. Current system block

### CR-26 – Workforce Capability & Job Eligibility Foundation — ACTIVE

CR-26 advances the non-transport part of **IM-06 – JobEngine / Assignment Contract Migration**.

- **CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-26B – Workforce Availability & Assignment State Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-26C – Deterministic Job Eligibility & Assignment Selection — NEXT / NOT IMPLEMENTED**
  - required Capability match,
  - Availability must be `FREE`,
  - explicit Preconditions must pass,
  - required Reachability must pass when applicable,
  - deterministic selection of exactly one eligible Person,
  - selected Person receives exactly one normal assignment through CR-26B,
  - no transport-specific logistics rewrite.

## 3. Product/workforce invariant

A real Person remains the same Person while working:

`Person identity + Home + specialization + capabilities + temporary assignment`

A temporary task must never transform a resident into a different permanent unit type and must not spontaneously create capabilities.

## 4. CR-26C explicit exclusions

No pathfinding/movement implementation, transport/logistics rewrite, production timing/worker execution, builder execution, Population creation, SaveGame, rendering/UI/Inspector/balancing. Reachability may only be consumed as an explicit eligibility input/condition; CR-26C does not own route calculation.

## 5. Next allowed action

Begin **CR-26C – Deterministic Job Eligibility & Assignment Selection** on the existing CR-26 development branch. After implementation, run a focused CR-26C Verification / Freeze Gate before the whole CR-26 completion/regression gate.

## 6. Branch/source-of-truth rule

- `main` remains historical old-game reference.
- `frozen/cr-25-buildingstock-production-foundation` remains the frozen predecessor system baseline.
- `frozen/cr-26a-person-workforce-profile-contract` is the immutable CR-26A marker.
- CR-26B receives its immutable frozen marker after this accepted PASS state is recorded.
- `feature/cr-26-workforce-capability-job-eligibility-foundation` remains the single CR-26 development branch.
- Frozen A/B/C branches are immutable markers only.

---

**Updated:** 2026-09-05 after CR-26B device/browser Verification / Freeze Gate: **PASS / 0 BLOCKER**. Current next step: **CR-26C – Deterministic Job Eligibility & Assignment Selection**.
