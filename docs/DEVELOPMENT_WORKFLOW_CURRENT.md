# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current Whole-Block branch: `feature/im-16-player-construction-placement-integration`
- Frozen development baseline: IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15 – Guidance / Inspector: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15B – Structured Runtime Diagnostics Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15C – World Diagnostic Overlay Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15E – Simulation & Balancing Observation Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16 – Player Construction & Placement Integration: DEFINED / PARTIALLY IMPLEMENTED**
- **IM-16A – Authoritative Construction Placement Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16B – Player Placement Interaction State & World Target Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16C – Player Placement Preview & Validity Projection Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16D – Authoritative Placement Commit & Building Registration Contract: DEFINED / NOT IMPLEMENTED**

## 2. Frozen predecessor chain

Frozen IM-15 substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.
Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

Frozen IM-16B marker: `frozen/im-16b-player-placement-interaction-state-world-target-contract`.
Frozen IM-16B head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

Frozen IM-16C marker: `frozen/im-16c-player-placement-preview-validity-projection-contract`.
Frozen IM-16C head and exclusive IM-16D baseline: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

## 3. Binding ownership boundary after frozen IM-16C

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the currently supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and world-target consumption.
- Frozen IM-16C owns only temporary Player Placement Preview / Validity projection.
- Existing Building Domain/store remains sole owner of stable Building identity, lifecycle and Building-store mutation.
- Existing `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- Frozen IM-15 Inspector remains observer only; IM-15C diagnostic overlay is not Player Placement authority.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

Target flow remains:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

IM-16A, IM-16B and IM-16C are frozen. IM-16D is defined but not implemented. No later IM-16 capability is authorized by this documentation step.

## 5. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

IM-16A remains the immutable, mutation-free placement-evaluation authority for an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 6. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

IM-16B establishes only temporary Player Placement interaction state plus camera-compatible targeting of real `MapStructure` cells. It creates no Building and no Confirm/Commit path.

## 7. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

IM-16C adds only player-visible projection of the already existing IM-16B placement state.

- Input is exclusively frozen IM-16B state containing Building `definitionId`, current real `targetCellId` when available and unchanged frozen-IM-16A evaluation when available.
- Existing camera-synchronous projected world geometry remains the only visual geometry authority.
- Current target cell is visibly highlighted.
- `VALID` and `TARGET_CELL_OCCUPIED` are visually distinguishable without duplicating or reinterpreting placement rules.
- `NO TARGET` suppresses the Player Preview.
- Any Building Ghost is temporary render presentation only and creates no Building entity, Domain entity or Construction state.
- Camera pan/zoom keeps preview synchronized with existing world projection.
- Existing Selection remains independent.
- Frozen IM-15 Inspector remains read-only.

IM-16C remains frozen with no Confirm action, no Commit action, no actual Building creation/registration, no `BuildingRegistrationWorldOwnership`, no construction progression, no cost/resource/Gold deduction, no SaveGame persistence, no new placement rules, no Building rotation, no multi-cell footprints, no new Camera/Selection ownership and no Inspector mutation paths.

### Non-blocking UI/readability evidence

Real iPhone evidence showed that accumulated Inspector/verification surfaces are difficult to read on a narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and is not silently folded into IM-16D.

## 8. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive baseline:** frozen IM-16C @ `ddebbb4ee8b743b869e069da11d644690e0620eb`.

### Leitfrage

„Wie wird ein aktuell platzierbarer Building-Kandidat genau einmal über die bestehenden autoritativen Building-/Lifecycle-Owner committed und registriert, ohne dass Player UI, Preview oder Interaction-State selbst Building- oder Construction-Wahrheit übernehmen?“

### Ziel

IM-16D defines only the authoritative commit/registration boundary behind the frozen placement interaction and preview path.

No Player Confirm/Cancel control is introduced by IM-16D itself. The purpose is to establish a safe mutation seam that a later Player-facing confirm step may consume without creating a second Building or placement truth.

### Binding candidate and final-revalidation boundary

- Candidate input is only an existing Building `definitionId` plus a real `targetCellId`.
- A cached frozen-IM-16A evaluation carried by IM-16B/IM-16C is not mutation authority.
- Immediately before any Building mutation, the candidate must be re-evaluated through frozen IM-16A against current authoritative Map/Building state.
- Only a candidate that is still `VALID` at this final revalidation may proceed to registration.
- If final revalidation is not `VALID`, the commit is rejected without any Building mutation.
- Rejection must preserve the authoritative IM-16A reason rather than introducing a second validity semantic.

### Binding Building identity / registration boundary

- Stable Building identity remains owned by the existing Building Domain/store.
- A new Building ID must be allocated only through the existing Building-store allocation boundary.
- Building identity must be created with existing `BuildingIdentityOwnershipContract`.
- Building lifecycle must use existing `BuildingLifecycleStateContract` and only its already supported minimal semantics.
- Actual Building registration must occur exclusively through existing `BuildingRegistrationWorldOwnership.register(...)`.
- Exactly one successful registration may result from one successful commit invocation.
- The immutable commit result must identify either successful registration with the created Building ID or rejection with the authoritative reason.
- Player UI, frozen IM-16B interaction state and frozen IM-16C preview remain consumers only and gain no Building/Domain mutation authority.

### Minimal mutation scope

IM-16D may create only the minimal Building state already supported by the existing identity/lifecycle/registration owners. It must not invent additional construction phases, costs, production state, workforce state or other Building semantics.

### Explicit exclusions

IM-16D does **not** introduce:

- Player Confirm button,
- Player Cancel button,
- Pointer/Touch commit trigger,
- automatic Placement Mode deactivation after success,
- Player-facing commit feedback/projection beyond the immutable commit result,
- cost/resource or Gold deduction,
- construction progression,
- workforce or production integration,
- SaveGame rearchitecture or special persistence path,
- Building rotation,
- multi-cell footprints,
- new terrain/distance/resource/building-type placement rules,
- new Camera control semantics,
- new Selection ownership,
- Inspector mutation/editor paths,
- IM-16E implementation.

## 9. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16C – Player Placement Preview & Validity Projection Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16D – Authoritative Placement Commit & Building Registration Contract = DEFINED / NOT IMPLEMENTED.**

This documentation update authorizes no IM-16D implementation and no Player Confirm/Cancel control.

The next permissible action is exclusively the IM-16D Documentation Verification / Finalization Gate against frozen IM-16C @ `ddebbb4ee8b743b869e069da11d644690e0620eb` and the resulting documentation HEAD on `feature/im-16-player-construction-placement-integration`. Only after PASS / 0 BLOCKER may IM-16D implementation be explicitly authorized.

## 10. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-09 — IM-16D Authoritative Placement Commit & Building Registration Contract documented as DEFINED / NOT IMPLEMENTED against frozen IM-16C. No implementation and no Player Confirm/Cancel authorized in this step.
