# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-26 whole-system gate next  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-26-workforce-capability-job-eligibility-foundation`  
**Frozen gameplay baseline:** **CR-26C – Deterministic Job Eligibility & Assignment Selection**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

### CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER

CR-26A establishes immutable Person workforce specialization and capabilities on the existing Person identity.

### CR-26B – Workforce Availability & Assignment State Contract — PASS / FROZEN / 0 BLOCKER

CR-26B establishes `FREE / ASSIGNED / UNAVAILABLE`, exactly one stable assignment reference while assigned, and controlled immutable transitions.

### CR-26C – Deterministic Job Eligibility & Assignment Selection — PASS / FROZEN / 0 BLOCKER

CR-26C establishes pure deterministic eligibility from Capability + FREE + Preconditions + required Reachability input, deterministic single-person selection by stable `personId`, and assignment exclusively through frozen CR-26B.

Device/browser CR-26C Verification / Freeze Gate passed with **PASS / 0 BLOCKER** on 2026-09-06.

## 2. Current system block

### CR-26 – Workforce Capability & Job Eligibility Foundation — COMPLETE_NOT_FROZEN

All accepted sub-blocks are implemented and individually frozen:

- **CR-26A — PASS / FROZEN / 0 BLOCKER**
- **CR-26B — PASS / FROZEN / 0 BLOCKER**
- **CR-26C — PASS / FROZEN / 0 BLOCKER**

The remaining required step is the whole-system Completion / Regression / Freeze Gate.

## 3. CR-26 system invariant

A real Person remains the same Person while workforce semantics are layered on:

`Person identity + Home + specialization + capabilities + temporary assignment state`

The system must preserve these boundaries end-to-end:

- Profile owns specialization/capabilities,
- Assignment State owns temporary availability/assignment,
- Eligibility only reads those inputs and explicit Preconditions/Reachability inputs,
- deterministic selection must not depend on input order,
- selected Person is assigned through CR-26B only,
- no assignment may create capabilities or rewrite identity/Profile.

## 4. Explicit CR-26 exclusions

No JobEngine queue/generation, priority/weighting/scoring, Reachability calculation, pathfinding/routes/movement, production timing/worker execution, builder execution, transport/logistics rewrite, completion/cancel/recovery orchestration, Population creation, SaveGame, rendering/UI/Inspector/balancing.

## 5. Next allowed action

Run **CR-26 – Workforce Capability & Job Eligibility Foundation Completion / Regression / Freeze Gate** against A+B+C and the complete frozen predecessor line.

Only at **PASS / 0 BLOCKER** may CR-26 become **COMPLETE / FROZEN**. No next CR number/title is authorized before that gate passes and the roadmap is reconciled again.

## 6. Branch/source-of-truth rule

- `main` remains historical old-game reference.
- `frozen/cr-25-buildingstock-production-foundation` remains the frozen predecessor system baseline.
- `frozen/cr-26a-person-workforce-profile-contract` is the immutable CR-26A marker.
- `frozen/cr-26b-workforce-availability-assignment-state-contract` is the immutable CR-26B marker.
- CR-26C receives its immutable marker after this accepted PASS state is recorded.
- `feature/cr-26-workforce-capability-job-eligibility-foundation` remains the single CR-26 development branch.

---

**Updated:** 2026-09-06 after CR-26C device/browser Verification / Freeze Gate: **PASS / 0 BLOCKER**. Current next step: **CR-26 whole-system Completion / Regression / Freeze Gate**.
