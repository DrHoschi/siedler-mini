# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – Post-CR26 planning  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-26-workforce-capability-job-eligibility-foundation`  
**Frozen gameplay baseline:** **CR-26 – Workforce Capability & Job Eligibility Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

### CR-26A – Person Workforce Profile Contract — PASS / FROZEN / 0 BLOCKER

Immutable specialization + capability profile on the existing Person identity.

### CR-26B – Workforce Availability & Assignment State Contract — PASS / FROZEN / 0 BLOCKER

Separate temporary `FREE / ASSIGNED / UNAVAILABLE` state, exactly one stable assignment reference while assigned, controlled immutable transitions and no normal parallel assignment.

### CR-26C – Deterministic Job Eligibility & Assignment Selection — PASS / FROZEN / 0 BLOCKER

Pure deterministic Eligibility from Capability + FREE + Preconditions + required Reachability input, deterministic single-person selection by stable `personId`, and assignment exclusively through frozen CR-26B.

The device/browser **CR-26 whole-system Completion / Regression / Freeze Gate** passed with **PASS / 0 BLOCKER** on 2026-09-06.

## 2. Frozen CR-26 system invariant

A real Person remains the same Person while workforce semantics are layered on:

`Person identity + Home + specialization + capabilities + temporary assignment state`

The frozen system preserves these boundaries end-to-end:

- Profile owns specialization/capabilities,
- Assignment State owns temporary availability/assignment,
- Eligibility only reads those inputs and explicit Preconditions/Reachability inputs,
- deterministic selection does not depend on input order,
- selected Person is assigned through CR-26B only,
- no assignment creates capabilities or rewrites identity/Profile.

## 3. Explicit frozen CR-26 exclusions

No JobEngine queue/generation, priority/weighting/scoring, Reachability calculation, pathfinding/routes/movement, production timing/worker execution, builder execution, transport/logistics rewrite, completion/cancel/recovery orchestration, Population creation, SaveGame, rendering/UI/Inspector/balancing.

## 4. Next planning boundary

No next CR number/title is authorized yet.

The next required activity is a short **IM ↔ CR reconciliation against the live repository**. It must identify which remaining product/system boundary should follow frozen CR-26 and define the minimal next A/B/C decomposition without reopening frozen owners.

The result must be explicitly accepted before implementation or creation of the next feature branch.

## 5. Branch/source-of-truth rule

- `main` remains historical old-game reference.
- `frozen/cr-25-buildingstock-production-foundation` remains the frozen predecessor system marker.
- `frozen/cr-26a-person-workforce-profile-contract`, `frozen/cr-26b-workforce-availability-assignment-state-contract` and `frozen/cr-26c-deterministic-job-eligibility-assignment-selection` remain immutable sub-block markers.
- `feature/cr-26-workforce-capability-job-eligibility-foundation` remains the completed CR-26 control branch until the next system block is explicitly accepted.
- A whole CR-26 frozen marker is created from the accepted whole-system PASS state.
- GitHub Pages browser gates should remain on the active whole-CR development branch during development; frozen marker creation does not itself change the intended Pages source.

---

**Updated:** 2026-09-06 after CR-26 device/browser Completion / Regression / Freeze Gate: **PASS / 0 BLOCKER**. CR-26 is **COMPLETE / FROZEN**. Current next step: **IM ↔ CR reconciliation / planning only**.
