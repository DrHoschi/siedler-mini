# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-26C implemented / verification next  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-26-workforce-capability-job-eligibility-foundation`  
**Frozen gameplay baseline:** **CR-26B – Workforce Availability & Assignment State Contract**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

### CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER

CR-26A establishes the immutable workforce profile on an existing Person.

### CR-26B – Workforce Availability & Assignment State Contract — PASS / FROZEN / 0 BLOCKER

CR-26B establishes the separate temporary Workforce state:

- `FREE / ASSIGNED / UNAVAILABLE`,
- exactly one stable `assignment:` reference while `ASSIGNED`,
- at most one normal active Assignment per Person,
- controlled immutable transitions,
- identity/Home/specialization/capabilities remain unchanged.

Device/browser CR-26B Verification / Freeze Gate passed with **PASS / 0 BLOCKER** on 2026-09-05.

## 2. Current system block

### CR-26 – Workforce Capability & Job Eligibility Foundation — ACTIVE

CR-26 advances the non-transport part of **IM-06 – JobEngine / Assignment Contract Migration**.

- **CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-26B – Workforce Availability & Assignment State Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-26C – Deterministic Job Eligibility & Assignment Selection — IMPLEMENTED / NOT FROZEN**
  - required Capability match,
  - Availability must be `FREE`,
  - explicit Preconditions must pass,
  - required Reachability input must pass when applicable,
  - deterministic selection of exactly one eligible Person by stable `personId`,
  - selected Person receives one assignment through frozen CR-26B,
  - no transport-specific logistics rewrite.

## 3. CR-26C invariant

Eligibility is a pure deterministic decision over existing inputs. CR-26C does not create capabilities, does not calculate routes and does not execute work.

A candidate remains:

`Person identity + Home + specialization + capabilities + temporary assignment state`

The selection result must not mutate the Person Workforce Profile or the previous Workforce Assignment State.

## 4. CR-26C explicit exclusions

No:

- Jobpriorisierung/weighting/distance scoring,
- JobEngine queue or automatic job generation,
- Reachability calculation,
- pathfinding/routes/movement,
- production timing/worker execution,
- builder/construction execution,
- transport/logistics rewrite,
- completion/cancel/recovery orchestration,
- Population creation,
- SaveGame,
- rendering/UI/Inspector/balancing.

## 5. Next allowed action

Run focused **CR-26C Verification / Freeze Gate** against frozen CR-26A/B and the full predecessor line.

Only at **PASS / 0 BLOCKER** may CR-26C receive an immutable frozen marker. After that, run the common **CR-26 Completion / Regression / Freeze Gate** before releasing any new system block.

## 6. Branch/source-of-truth rule

- `main` remains historical old-game reference.
- `frozen/cr-25-buildingstock-production-foundation` remains the frozen predecessor system baseline.
- `frozen/cr-26a-person-workforce-profile-contract` is the immutable CR-26A marker.
- `frozen/cr-26b-workforce-availability-assignment-state-contract` is the immutable CR-26B marker.
- `feature/cr-26-workforce-capability-job-eligibility-foundation` remains the single CR-26 development branch.
- Frozen A/B/C branches are immutable markers only.

---

**Updated:** 2026-09-05 after CR-26C implementation. Current next step: **CR-26C verification / freeze gate**.
