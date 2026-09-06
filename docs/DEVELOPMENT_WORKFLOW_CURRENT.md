# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-26-workforce-capability-job-eligibility-foundation`
- Current immutable gameplay baseline: **CR-26C – Deterministic Job Eligibility & Assignment Selection**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current system block: **CR-26 – Workforce Capability & Job Eligibility Foundation**
- CR-26A – Person Workforce Profile Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-26B – Workforce Availability & Assignment State Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-26C – Deterministic Job Eligibility & Assignment Selection: **PASS / FROZEN / 0 BLOCKER**
- Current activity: **CR-26 whole-system Completion / Regression / Freeze Gate**
- CR-26 overall status: **COMPLETE_NOT_FROZEN**

## 2. Frozen CR-26A/B/C chain

CR-26A owns the immutable Person Workforce Profile:

- stable `personId` on existing `unit:` identity,
- explicit V1 specialization,
- deterministic immutable capability set.

CR-26B owns the separate temporary Workforce Assignment State:

- `FREE / ASSIGNED / UNAVAILABLE`,
- exactly one stable `assignment:` reference only while `ASSIGNED`,
- at most one normal active Assignment per Person,
- controlled immutable transitions.

CR-26C owns deterministic Eligibility and Assignment Selection:

- required Capability must match,
- Workforce state must be `FREE`,
- explicit Preconditions must pass,
- required Reachability input must pass when applicable,
- multiple eligible Persons resolve deterministically by stable `personId`,
- selected Person is assigned only through frozen CR-26B,
- Profile and previous State remain unchanged.

The device/browser CR-26C Verification / Freeze Gate passed with **PASS / 0 BLOCKER** on 2026-09-06.

## 3. Whole-system invariants to regress

The CR-26 system gate must prove A+B+C together:

- one real Person keeps the same stable identity throughout workforce use,
- specialization/capabilities remain Profile-owned and are not mutated by assignments,
- only `FREE` Persons can become assigned,
- no Person can own more than one normal active assignment,
- eligibility cannot bypass Capability, Preconditions or required Reachability,
- deterministic candidate ordering does not depend on input order,
- assignment is delegated to CR-26B and remains immutable,
- no new JobEngine queue/generation, priority/scoring, route calculation, movement, work execution or logistics ownership leaked into CR-26.

## 4. Explicit CR-26 exclusions

CR-26 as a whole contains no:

- Job prioritization / weighting / distance scoring,
- JobEngine queue or automatic job generation,
- Reachability calculation,
- pathfinding / route calculation / movement,
- production timing / worker execution,
- builder / construction execution,
- transport/logistics rewrite,
- completion/cancel/recovery orchestration,
- Population creation,
- SaveGame ownership,
- rendering/animation/UI/Inspector/balancing.

## 5. Next allowed action

Run the common **CR-26 – Workforce Capability & Job Eligibility Foundation Completion / Regression / Freeze Gate**.

Only after **PASS / 0 BLOCKER** may CR-26 as a whole become **COMPLETE / FROZEN** and a new system block enter planning.

## 6. Branch rule

CR-26 continues on the single development branch `feature/cr-26-workforce-capability-job-eligibility-foundation`.

Frozen sub-block branches are immutable markers only. Do not begin a new CR before the whole CR-26 gate passes.

---

**Updated:** 2026-09-06 after device/browser CR-26C Verification / Freeze Gate: **PASS / 0 BLOCKER**. Current next activity: **CR-26 whole-system Completion / Regression / Freeze Gate**.
