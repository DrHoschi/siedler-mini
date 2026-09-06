# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-26-workforce-capability-job-eligibility-foundation`
- Current immutable gameplay baseline: **CR-26 – Workforce Capability & Job Eligibility Foundation**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26A – Person Workforce Profile Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-26B – Workforce Availability & Assignment State Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-26C – Deterministic Job Eligibility & Assignment Selection: **PASS / FROZEN / 0 BLOCKER**
- Current activity: **POST-CR26 IM ↔ CR RECONCILIATION / PLANNING ONLY**

## 2. Frozen CR-26 system boundary

CR-26 freezes the complete Workforce Capability & Job Eligibility Foundation:

- CR-26A owns immutable Person specialization + capability profile on the existing stable Person identity,
- CR-26B owns separate temporary `FREE / ASSIGNED / UNAVAILABLE` assignment state and exactly one normal active assignment at most,
- CR-26C owns deterministic Eligibility from Capability + FREE + Preconditions + required Reachability input, deterministic selection by stable `personId`, and assignment only through CR-26B,
- identity/Home/Profile remain unchanged by temporary work assignment,
- no candidate selection may bypass the frozen eligibility conditions.

The device/browser **CR-26 Completion / Regression / Freeze Gate** passed with **PASS / 0 BLOCKER** on 2026-09-06.

## 3. Frozen CR-26 exclusions

CR-26 contains no:

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

## 4. Next allowed action

Do **not** begin a new CR implementation yet.

Run a short **IM ↔ CR reconciliation against the live repository** to determine the next system boundary after frozen CR-26. The next CR number/title and A/B/C decomposition must be explicitly accepted before a new development branch or implementation is created.

## 5. Branch / Pages rule

- `feature/cr-26-workforce-capability-job-eligibility-foundation` remains the completed CR-26 development/control branch until the next system block is explicitly accepted.
- Frozen sub-block branches are immutable markers only.
- The whole CR-26 frozen marker is created only from the accepted PASS whole-system state.
- During an active whole-CR development cycle, GitHub Pages must remain pointed at the active CR development branch for browser gates; creating a frozen marker must not be treated as a reason to move Pages to that marker.

---

**Updated:** 2026-09-06 after device/browser CR-26 Completion / Regression / Freeze Gate: **PASS / 0 BLOCKER**. CR-26 is **COMPLETE / FROZEN**. Current next activity: **IM ↔ CR reconciliation / planning only**.
