# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current Whole-Block branch: `feature/im-17-economic-construction-integration`
- Frozen development baseline: IM-16 @ `99b0e7d001b7a4f175727cf8e304dde0928c730b`
- Frozen IM-16 Whole-Block marker: `frozen/im-16-player-construction-placement-integration`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15 – Guidance / Inspector: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16 – Player Construction & Placement Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17 – Economic Construction Integration: WHOLE-BLOCK FINALIZATION / PASS / 0 FUNCTIONAL BLOCKER / FINAL MARKER PENDING**
- **IM-17A – Player Construction Runtime Admission Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17B – Economic Construction Requirement Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17C – Player Placement → Construction Initialization Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17D – Construction Demand → Existing Logistics Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17E – Delivered Material → Construction Progress Settlement: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17F – Construction Completion Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17G – Player Construction State Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**

The IM-17 Whole-Block marker is intentionally not created yet. Exact-finalization-head CI and Pages must both be `SUCCESS` before Whole-Block freeze.

## 2. Frozen predecessor chain

Frozen IM-15 substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Frozen IM-16 Whole-Block marker: `frozen/im-16-player-construction-placement-integration`.
Frozen IM-16 Whole-Block head and exclusive IM-17 baseline: `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

Frozen IM-17 markers and heads:

- IM-17A `frozen/im-17a-player-construction-runtime-admission-contract` @ `6caf6132864e71201dee6b9a286c111f67fce016`
- IM-17B `frozen/im-17b-economic-construction-requirement-contract` @ `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`
- IM-17C `frozen/im-17c-player-placement-construction-initialization-integration` @ `c30d2d7a88f7f16b2cf73e1d2b85cec867dcea40`
- IM-17D `frozen/im-17d-construction-demand-existing-logistics-integration` @ `1c728ab4ce051abff33dda17c9e3ef40cb7c9f4c`
- IM-17E `frozen/im-17e-delivered-material-construction-progress-settlement` @ `b46e061b185915b805332b252033fe33de9dfe74`
- IM-17F `frozen/im-17f-construction-completion-integration` @ `a4254cacb9dd89f54950a7d0d4125f2c9827b531`
- IM-17G `frozen/im-17g-player-construction-state-projection` @ `a6e32ac19dade82e01fdbfc7c3c4e9cad557c871`

## 3. Binding ownership boundary after IM-17G

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16 remains the complete Player placement/commit authority and is not retroactively changed by IM-17.
- Existing Building Domain/store remains sole owner of stable Building identity, lifecycle and Building-store mutation.
- Existing `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- Frozen IM-17A owns only the economic-construction Runtime admission decision after a real frozen-IM-16 authoritative commit result. Admission requires `COMMITTED + RUNNING`.
- Frozen IM-17B owns only the construction requirement seam over existing `ResourceDemands`; stable `buildingId` is reused as `consumerId` and existing demand vocabulary/invariants remain authoritative.
- Frozen IM-17C connects admitted construction to the existing Building Construction state as `PENDING` with the same stable `buildingId`; it creates no second Building or construction identity.
- Frozen IM-17D connects the real construction demand to existing Resource Matching / Claim / BuildingStock reservation / TransportJob boundaries. It creates no second logistics subsystem and no routing/movement authority.
- Frozen IM-17E consumes only authoritative delivered BuildingStock settlement, consumes the corresponding ACTIVE ResourceDemand claim and derives monotonic construction progress through the existing Building Construction Progress contract.
- Frozen IM-17F verifies the existing Building Construction Completion boundary and makes completion effective exactly once at authoritative `COMPLETED / progress 1`. It performs no Building lifecycle mutation, workforce assignment or production start.
- Frozen IM-17G projects only actual authoritative requirement/progress/completion state into Player UI. UI owns no admission, demand, resource, delivery, progress or completion truth.
- Existing BuildingStock transport reservations and Resource Claim reservations remain distinct authorities.
- Existing Building lifecycle `EXISTS/RETIRED` remains separate from Building Construction state `PENDING/IN_PROGRESS/COMPLETED`.
- Frozen IM-15 Inspector remains observer only except its already frozen diagnostic action allowlist.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen Whole-Block head:** `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Frozen marker:** `frozen/im-16-player-construction-placement-integration`.

Frozen IM-16 remains the player-facing path from Building selection through placement, validation, explicit Confirm/Cancel, authoritative Building registration and Player result projection. IM-17 consumes its actual authoritative commit result without changing IM-16 semantics.

## 5. IM-17 – Economic Construction Integration

**Status:** WHOLE-BLOCK FINALIZATION / PASS / 0 FUNCTIONAL BLOCKER / FINAL MARKER PENDING

**Definition baseline:** frozen IM-16 @ `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Whole-Block development branch:** `feature/im-17-economic-construction-integration`.

### Whole-Block objective

IM-17 answers:

`How does a successfully and authoritatively placed Player Building become an economically effective construction site with real material demand, existing logistics and controlled completion without duplicating existing Building, Resource, Demand, Transport, BuildingStock or Runtime authority?`

The complete implemented flow is now:

`frozen IM-16 authoritative placement commit → IM-17A Runtime admission → IM-17B existing ResourceDemand requirement → IM-17C existing construction PENDING state → IM-17D existing logistics/claims/BuildingStock transport → IM-17E authoritative delivered-material settlement and progress → IM-17F existing completion boundary exactly once → IM-17G read-only Player construction-state projection`.

### IM-17A – Player Construction Runtime Admission Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `6caf6132864e71201dee6b9a286c111f67fce016`.

**Frozen marker:** `frozen/im-17a-player-construction-runtime-admission-contract`.

Economic construction is admitted only for an actual frozen-IM-16 `COMMITTED` placement result while Runtime is `RUNNING`. Non-running Runtime states reject economic admission without undoing Building registration.

Fresh real iPad/Safari evidence confirmed exact IM-17A build identity, `READY → RUNNING`, successful real placement/commit while RUNNING and `RUNNING → PAUSED`. The known world-label positioning issue remains a NON-BLOCKING later UI/Render follow-up.

### IM-17B – Economic Construction Requirement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`.

**Frozen marker:** `frozen/im-17b-economic-construction-requirement-contract`.

The existing `ResourceDemands` vocabulary remains authoritative: `definitionId`, `targetAmount`, `reservedAmount`, `fulfilledAmount`, `remainingAmount`, `status`, with `targetAmount = reservedAmount + fulfilledAmount + remainingAmount`.

### IM-17C – Player Placement → Construction Initialization Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `c30d2d7a88f7f16b2cf73e1d2b85cec867dcea40`.

**Frozen marker:** `frozen/im-17c-player-placement-construction-initialization-integration`.

An admitted construction initializes the existing Building Construction state as `PENDING` using the same stable `buildingId`. The final IM-17C head includes the narrow CI lifecycle fix that stops the test Runtime after admission evidence; production semantics were unchanged.

### IM-17D – Construction Demand → Existing Logistics Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `1c728ab4ce051abff33dda17c9e3ef40cb7c9f4c`.

**Frozen marker:** `frozen/im-17d-construction-demand-existing-logistics-integration`.

Real construction demand flows through existing Resource Matching, Resource Assignment/claims, BuildingStock transport reservation and TransportJob ownership. No new routing, movement or logistics truth was introduced.

### IM-17E – Delivered Material → Construction Progress Settlement

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `b46e061b185915b805332b252033fe33de9dfe74`.

**Frozen marker:** `frozen/im-17e-delivered-material-construction-progress-settlement`.

Only an authoritative `DeliveredTransportBuildingStockSettlement` may consume the corresponding ACTIVE construction demand claim. The resulting real fulfilled amount derives deterministic monotonic progress through the existing Building Construction Progress authority. Workforce and production remain excluded.

### IM-17F – Construction Completion Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `a4254cacb9dd89f54950a7d0d4125f2c9827b531`.

**Frozen marker:** `frozen/im-17f-construction-completion-integration`.

Verified progress transitions may cross the existing Building Construction Completion boundary exactly once. Completion is authoritative only at terminal `COMPLETED / progress 1`. No worker assignment, production start or Building lifecycle mutation is performed.

### IM-17G – Player Construction State Projection

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `a6e32ac19dade82e01fdbfc7c3c4e9cad557c871`.

**Frozen marker:** `frozen/im-17g-player-construction-state-projection`.

Player UI projects only real authoritative construction state, including waiting for material, under construction, progress and completed. It owns no gameplay truth and cannot manufacture demand/progress/completion state.

### IM-17 Whole-Block exclusions

IM-17 introduces no regular workforce assignment, regular production operation, broad Building catalogue authority, general Gold construction-price system, demolition, upgrades, rotation, multi-cell footprints, new terrain/distance placement rules, SaveGame rearchitecture, Inspector mutation/editor authority or legacy `main` gameplay/UI reuse.

## 6. IM-17 Substep Completion / Regression / Freeze Gates

**IM-17A through IM-17G = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Each substep was separately implemented, regressed and frozen before its successor began. The final frozen heads are exactly those listed in §2 and §5.

Key final evidence:

- IM-17C final CI `34508191830` and Pages `34508190775`: SUCCESS on `c30d2d7a88f7f16b2cf73e1d2b85cec867dcea40`.
- IM-17D CI `34520097029` and Pages `34520094382`: SUCCESS on `1c728ab4ce051abff33dda17c9e3ef40cb7c9f4c`.
- IM-17E CI `34523081316` and Pages `34523080482`: SUCCESS on `b46e061b185915b805332b252033fe33de9dfe74`.
- IM-17F CI `34531232168` and Pages `34531230761`: SUCCESS on `a4254cacb9dd89f54950a7d0d4125f2c9827b531`.
- IM-17G CI `34575744508` and Pages `34575743961`: SUCCESS on `a6e32ac19dade82e01fdbfc7c3c4e9cad557c871`.

## 7. IM-17 Whole-Block Completion / Regression / Freeze Gate

**Status:** REGRESSION PASS / A–G MARKERS VERIFIED / DOCUMENTATION & BUILD-IDENTITY FINALIZATION IN PROGRESS / FINAL MARKER PENDING

The complete IM-17 implementation range frozen IM-16 `99b0e7d001b7a4f175727cf8e304dde0928c730b` → frozen IM-17G `a6e32ac19dade82e01fdbfc7c3c4e9cad557c871` was verified as **20 commits ahead / 0 behind**, merge-base exactly frozen IM-16.

All seven frozen IM-17A→G markers were live-verified against their expected exact SHAs. The full current CI regression includes IM-17A through IM-17G plus frozen predecessors and passed on the frozen IM-17G head.

This finalization step changes only steering documentation and visible/build identity surfaces for the Whole-Block gate. It introduces no new gameplay capability.

After this exact finalization head is created, CI and Pages must both finish `SUCCESS` on that exact SHA. Only then may `frozen/im-17-economic-construction-integration` be created and verified on the same SHA. Until then IM-17 is not Whole-Block frozen.

No new IM block is authorized by this finalization.

## 8. Current gate

**IM-17A through IM-17G = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-17 Whole-Block Completion / Regression / Freeze Gate = FINALIZATION HEAD PENDING EXACT-HEAD CI/PAGES / FINAL MARKER PENDING.**

The next permissible action after this documentation/build-identity finalization commit is exclusively exact-head CI + Pages verification. If both succeed, the only permissible write is creation and verification of the IM-17 Whole-Block frozen marker on that same exact head.

## 9. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-11 — IM-17A through IM-17G synchronized as COMPLETE / FROZEN / PASS / 0 BLOCKER. Whole-Block regression PASS / 0 functional blocker; documentation/build-identity finalization prepared; exact-finalization-head CI/Pages and Whole-Block frozen marker remain pending.