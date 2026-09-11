# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current steering/documentation branch: `feature/im-17-economic-construction-integration`
- Current frozen development baseline: IM-17 @ `53de400c2ffe57addf832b599b906b3d5b473385`
- Frozen IM-17 Whole-Block marker: `frozen/im-17-economic-construction-integration`
- IM-14 – UI / Mobile Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-15 – Guidance / Inspector: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-16 – Player Construction & Placement Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-17 – Economic Construction Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-17A through IM-17G: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-18 – Operational Building / Workforce / Production Integration: **DEFINED / NOT IMPLEMENTED**
- IM-18A through IM-18G: **DEFINED / NOT IMPLEMENTED**

No IM-18 development branch exists yet. This documentation update does not authorize implementation.

## 2. Frozen predecessor chain

Frozen IM-15 substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`
- Whole-block marker: `frozen/im-15-guidance-inspector`

Frozen IM-16 Whole-Block:

- head `99b0e7d001b7a4f175727cf8e304dde0928c730b`
- marker `frozen/im-16-player-construction-placement-integration`

Frozen IM-17 substeps:

- IM-17A `frozen/im-17a-player-construction-runtime-admission-contract` @ `6caf6132864e71201dee6b9a286c111f67fce016`
- IM-17B `frozen/im-17b-economic-construction-requirement-contract` @ `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`
- IM-17C `frozen/im-17c-player-placement-construction-initialization-integration` @ `c30d2d7a88f7f16b2cf73e1d2b85cec867dcea40`
- IM-17D `frozen/im-17d-construction-demand-existing-logistics-integration` @ `1c728ab4ce051abff33dda17c9e3ef40cb7c9f4c`
- IM-17E `frozen/im-17e-delivered-material-construction-progress-settlement` @ `b46e061b185915b805332b252033fe33de9dfe74`
- IM-17F `frozen/im-17f-construction-completion-integration` @ `a4254cacb9dd89f54950a7d0d4125f2c9827b531`
- IM-17G `frozen/im-17g-player-construction-state-projection` @ `a6e32ac19dade82e01fdbfc7c3c4e9cad557c871`

Frozen IM-17 Whole-Block:

- head `53de400c2ffe57addf832b599b906b3d5b473385`
- marker `frozen/im-17-economic-construction-integration`
- exact-head CI Baseline run `34580257709`: **SUCCESS**
- exact-head Pages run `34580256994`: **SUCCESS**

Therefore IM-17 is fully frozen. Any older `FINAL MARKER PENDING` wording is obsolete.

## 3. Binding ownership boundary after frozen IM-17

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16 remains the complete Player placement/commit authority and is not retroactively changed by IM-17 or IM-18.
- Existing Building Domain/store remains sole owner of stable Building identity, lifecycle and Building-store mutation.
- Existing `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- Frozen IM-17A owns only economic-construction Runtime admission after a real frozen-IM-16 authoritative commit result; admission requires `COMMITTED + RUNNING`.
- Frozen IM-17B reuses existing `ResourceDemands`; stable `buildingId` remains the construction consumer identity.
- Frozen IM-17C connects admitted construction to the existing Building Construction state using the same stable `buildingId`.
- Frozen IM-17D connects construction demand to existing Resource Matching / Claim / BuildingStock reservation / TransportJob boundaries.
- Frozen IM-17E advances construction only from authoritative delivered BuildingStock settlement and existing ResourceDemand fulfillment.
- Frozen IM-17F uses the existing Building Construction Completion boundary and completes exactly once at authoritative terminal state.
- Frozen IM-17G is read-only Player UI projection of real construction state.
- Existing BuildingStock transport reservations and Resource Claim reservations remain distinct authorities.
- Existing Building lifecycle `EXISTS/RETIRED` remains separate from Building Construction state `PENDING/IN_PROGRESS/COMPLETED`.
- Frozen IM-15 Inspector remains observer only except its already frozen diagnostic action allowlist.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 4. Frozen IM-17 – Economic Construction Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen Whole-Block head:** `53de400c2ffe57addf832b599b906b3d5b473385`

**Frozen marker:** `frozen/im-17-economic-construction-integration`

Implemented flow:

`frozen IM-16 authoritative placement commit → IM-17A Runtime admission → IM-17B existing ResourceDemand requirement → IM-17C existing construction PENDING state → IM-17D existing logistics/claims/BuildingStock transport → IM-17E authoritative delivered-material settlement and progress → IM-17F existing completion boundary exactly once → IM-17G read-only Player construction-state projection`

IM-17 deliberately does **not** introduce regular workforce assignment or regular production operation. Those are the next identified gameplay/economy capability gap.

## 5. IM-18 – Operational Building / Workforce / Production Integration

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive definition baseline:** frozen IM-17 @ `53de400c2ffe57addf832b599b906b3d5b473385`.

**No development branch exists yet.**

### Whole-Block objective

IM-18 answers:

`How does an authoritatively completed Building become operational, receive eligible existing workforce and execute deterministic production through existing BuildingStock/resource boundaries without introducing a second Building, Workforce, Production, Resource, Inventory or Runtime authority?`

Binding sequence:

`frozen IM-17 completed Building → operational admission → workforce requirement/eligibility → deterministic workforce assignment → production recipe/requirement integration → operational production execution → authoritative input consumption/output settlement → read-only Player operational-state projection`

### IM-18A – Operational Building Admission Contract

**Status:** DEFINED / NOT IMPLEMENTED

A Building may become economically operational only through a controlled admission boundary after authoritative frozen-IM-17 completion. This substep defines admissibility and operational state only. No workforce assignment and no production execution yet.

### IM-18B – Workforce Requirement / Eligibility Contract

**Status:** DEFINED / NOT IMPLEMENTED

Define which operational Building requires how much or what class of existing workforce and which existing persons/workers are eligible. Existing workforce/person identities and ownership remain authoritative. No assignment and no production yet.

### IM-18C – Deterministic Workforce Assignment Integration

**Status:** DEFINED / NOT IMPLEMENTED

Connect eligible existing workforce to an admitted operational Building deterministically. Prevent double assignment and preserve existing workforce authority. No production execution in this substep.

### IM-18D – Production Requirement / Recipe Integration

**Status:** DEFINED / NOT IMPLEMENTED

Bind an operational Building to deterministic production requirements/recipes using existing resource definitions and BuildingStock boundaries. Inputs, outputs and quantities must not create a parallel resource or inventory truth.

### IM-18E – Operational Production Execution

**Status:** DEFINED / NOT IMPLEMENTED

Execute production only when the Building is operational, required workforce is validly assigned and required authoritative inputs are available. No negative stock, speculative output or UI-owned gameplay truth.

### IM-18F – Input Consumption / Output Settlement

**Status:** DEFINED / NOT IMPLEMENTED

Authoritatively consume production inputs and settle produced outputs through the existing BuildingStock/resource mutation boundaries. Prevent double consumption, double production and negative quantities.

### IM-18G – Player Operational State Projection

**Status:** DEFINED / NOT IMPLEMENTED

Project authoritative operational state to Player UI, including states such as no worker, waiting for input, producing and output blocked where the underlying runtime state supports them. UI remains read-only and owns no operational/workforce/production truth.

### IM-18 Whole-Block exclusions

IM-18 does not add broad building catalogue authority, demolition, upgrades, rotation, multi-cell footprints, new placement rules, new pathfinding/movement authority, SaveGame rearchitecture, Inspector editor authority, general UI redesign or legacy `main` gameplay/UI reuse unless separately reconciled later.

## 6. Deferred Player UI / Mobile Consolidation need

The accumulated iPhone/iPad readability and density problem remains a real, explicitly deferred follow-up need.

Known items include:

- narrow-phone verification/Inspector overlays becoming difficult to read,
- accumulated controls competing for limited mobile/tablet viewport space,
- known world-label/annotation positioning/readability issue,
- need to prioritize gameplay controls, make contextual controls conditional/collapsible and keep diagnostics/Inspector from overwhelming normal play,
- responsive iPhone / iPad / Desktop behavior,
- visible build identity must remain synchronized under the permanent rule below.

This UI consolidation is intentionally scheduled **after IM-18**, so the final operational/workforce/production states are known before the Player surface is reorganized. It is not part of IM-18 and has no assigned IM identifier yet.

## 7. Current gate

Frozen IM-17 @ `53de400c2ffe57addf832b599b906b3d5b473385` is the exclusive baseline for the next development block.

**IM-18 = DEFINED / NOT IMPLEMENTED.**

**IM-18A through IM-18G = DEFINED / NOT IMPLEMENTED.**

The next permissible development action, after this steering-documentation reconciliation is verified clean, is only a separate explicit authorization to create the IM-18 Whole-Block development branch exactly from frozen IM-17. No IM-18A implementation may be combined with that branch-creation step.

## 8. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-11 — IM-17 Whole Block reconciled to actual repository state as COMPLETE / FROZEN / PASS / 0 BLOCKER at `53de400c2ffe57addf832b599b906b3d5b473385`; IM-18A–G defined as the next gameplay/economy block; Player UI / Mobile Consolidation retained as an explicit later follow-up.