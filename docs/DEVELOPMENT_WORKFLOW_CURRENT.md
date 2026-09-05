# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current control branch: `maintenance/post-cr23-project-control-sync`
- Current immutable gameplay baseline: **CR-23 – Person / Resident / Housing Foundation**
- Frozen baseline branch: `frozen/cr-23c-housing-capacity-occupancy-foundation`
- Frozen baseline SHA: `1a3a01c0973cd21c0375c8bc308311a774e30120`
- CR-23A status: **PASS / FROZEN / 0 BLOCKER**
- CR-23B status: **PASS / FROZEN / 0 BLOCKER**
- CR-23C status: **PASS / FROZEN / 0 BLOCKER**
- CR-23 overall status: **PASS / COMPLETE / FROZEN / 0 BLOCKER**
- Next roadmap capability: **Construction Foundation — IM-07**
- No next feature CR is created until this synchronization is accepted.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | CR-23A – Person / Resident Identity Contract | FROZEN / PASS / 0 BLOCKER | Regression only |
| 3 | CR-23B – Resident ↔ Home Assignment Contract | FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-23C – Housing Capacity & Occupancy Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 5 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Immutable baseline unless explicitly reopened |
| 6 | Post-CR23 project-control synchronization | CURRENT | Synchronize roadmap/workflow only |
| 7 | Construction Foundation | NEXT AFTER SYNC | Define next CR scope before code |

## 3. Frozen CR-23 contract

CR-23 establishes the minimal Person / Resident / Housing owner chain:

- stable Person / Resident identity on existing `unit:` IDs,
- explicit Person → Home Building relationship,
- `UNASSIGNED` / `ASSIGNED` Home state,
- Building-scoped Housing Capacity,
- Occupancy derived only from assigned Home references,
- deterministic `availableSlots`,
- exact capacity allowed and overflow rejected,
- immutable/deterministic contract values,
- no second mutable Building-side resident list.

Frozen exclusions:

- no Household/family model,
- no parents/children simulation,
- no automatic resident creation,
- no BirthTimer,
- no population growth/regeneration,
- no age/gender/name simulation,
- no profession/workforce/job assignment,
- no tools/clothing acquisition,
- no production,
- no BuildingStock/storage,
- no construction execution,
- no transport changes,
- no movement/rendering/UI.

Automatic resident creation / population growth remains an explicit later extension point on top of frozen CR-23. It is not unfinished CR-23 work.

## 4. Freeze evidence

CR-23A, CR-23B and CR-23C each passed their dedicated completion/freeze gates.

The final CR-23C gate regressed the complete chain against frozen CR-22 and verified:

- CR-22 frozen baseline: PASS,
- CR-23A identity: PASS,
- CR-23B Home assignment: PASS,
- CR-23C Housing Capacity / Occupancy: PASS,
- Capacity is Building-scoped and valid,
- Occupancy is derived from CR-23B Home assignments,
- `availableSlots = capacity - occupancy`,
- exact capacity is accepted,
- overflow is rejected,
- immutable/deterministic values,
- Population Growth / Household / BirthTimer / Workforce scope remains absent,
- browser/device preview: PASS / 0 BLOCKER,
- GitHub CI `Run CR-23C completion/freeze gate + CR-23B frozen regression`: SUCCESS.

## 5. Next required action after synchronization

Do not start Construction code immediately.

First define the next whole system block for **Construction Foundation** and split it into small sub-contracts.

The planning area should keep construction semantics separate from the frozen CR-22 existential Building lifecycle. Likely dependency order to define:

- construction-specific state / phase contract,
- deterministic allowed construction transitions / progress,
- completion boundary,
- later integration with material demand/delivery and builders.

Do not prematurely include:

- resident/population changes,
- workforce/profession assignment,
- production,
- BuildingStock/storage,
- transport execution changes,
- demolition/destruction,
- rendering/animation,
- UI/Inspector/balancing.

## 6. Source-of-truth / branch rules

- `main` is historical functional/visual reference only.
- The frozen CR-23C branch is the immutable gameplay baseline representing completed CR-23.
- This maintenance branch changes project-control documentation only.
- After synchronization acceptance, create the next whole CR branch from the accepted synchronized baseline.
- Prefer one branch per overall CR; A/B/C normally proceed sequentially on that branch unless a concrete risk requires a separate branch.
- Before every write verify repository, target branch, actual HEAD, frozen predecessor, scope, tests and CI.
- Keep browser/device text, docs, CI naming and actual branch state synchronized.

## 7. Known process traps

- Do not infer active scope from chat memory.
- Do not leave roadmap/workflow behind the actual frozen code state.
- Do not silently reopen CR-23 to add population growth.
- Do not conflate CR-22 Building existential lifecycle with a future Construction state machine.
- Do not jump from Construction planning directly into workforce, production or transport.

---

**Updated:** 2026-09-05 after formal CR-23A/B/C freeze and CR-23 system completion. Current next capability: **Construction Foundation (IM-07)**.
