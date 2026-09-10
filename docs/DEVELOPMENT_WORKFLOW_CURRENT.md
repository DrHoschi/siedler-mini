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
- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15B – Structured Runtime Diagnostics Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15C – World Diagnostic Overlay Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15E – Simulation & Balancing Observation Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16 – Player Construction & Placement Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16A – Authoritative Construction Placement Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16B – Player Placement Interaction State & World Target Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16C – Player Placement Preview & Validity Projection Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16D – Authoritative Placement Commit & Building Registration Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16E – Player Placement Confirm / Cancel Interaction Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16F – Player Building Selection & Placement Activation Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16G – Authoritative Construction Result Player UI Projection Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17 – Economic Construction Integration: IN PROGRESS**
- **IM-17A – Player Construction Runtime Admission Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17B through IM-17G: DEFINED / NOT IMPLEMENTED**

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
Frozen IM-16C head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

Frozen IM-16D marker: `frozen/im-16d-authoritative-placement-commit-building-registration-contract`.
Frozen IM-16D head and exclusive IM-16E baseline: `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

IM-16E pre-freeze implementation/evidence head: `b077553d9158c504ba5fb2b898732b651fe81054`.
Frozen IM-16E marker: `frozen/im-16e-player-placement-confirm-cancel-interaction-contract`.
Frozen IM-16E head and exclusive IM-16F baseline: `a943ac93554e32a8909be2d44ae2d327dd044d58`.

IM-16F pre-freeze implementation/evidence head: `e3685a4f826c4897224d89ee4ecc2900feb7977f`.
Frozen IM-16F marker: `frozen/im-16f-player-building-selection-placement-activation-contract`.
Frozen IM-16F head and exclusive IM-16G baseline: `0cf69a9253b4ec503f9f1c5b8585721722851963`.

IM-16G pre-freeze implementation/evidence head: `d8c30732173bd6279c94b2023c2ebae9077652a8`.
Frozen IM-16G marker: `frozen/im-16g-authoritative-construction-result-player-ui-projection-contract`.
Frozen IM-16G head and Whole-Block completion-gate baseline: `9022b7934e885950af8d8a3559cbecdd41a2da63`.

Frozen IM-16 Whole-Block marker: `frozen/im-16-player-construction-placement-integration`.
Frozen IM-16 Whole-Block head and exclusive IM-17 baseline: `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

Frozen IM-17A marker: `frozen/im-17a-player-construction-runtime-admission-contract`.
Frozen IM-17A head and exclusive IM-17B baseline: `6caf6132864e71201dee6b9a286c111f67fce016`.

## 3. Binding ownership boundary after IM-16 completion

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the currently supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and world-target consumption.
- Frozen IM-16C owns only temporary Player Placement Preview / Validity projection.
- Frozen IM-16D owns only the authoritative commit seam: final revalidation through IM-16A and controlled handoff to existing Building identity/lifecycle/store/registration owners.
- Existing Building Domain/store remains sole owner of stable Building identity, lifecycle and Building-store mutation.
- Existing `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- Frozen IM-16E owns only explicit Player Confirm/Cancel interaction orchestration. Confirm consumes frozen IM-16D; Cancel only deactivates the temporary placement state.
- Frozen IM-16F owns only the narrow Player Building selection / Placement activation seam: bounded known/testable options `HQ`, `WOODCUTTER`, `STOREHOUSE` → frozen IM-16B `activate(definitionId)`.
- Frozen IM-16G owns only temporary Player feedback projected from the actual immutable Confirm → IM-16D commit result.
- Runtime/Render remains owner of actual visible world projection of registered Buildings.
- Frozen IM-17A owns only the economic-construction Runtime admission decision after a real frozen-IM-16 authoritative commit result.
- IM-17A does not undo, replace or re-own frozen IM-16 Building registration. It does not own demand, resources, costs, reservations, logistics, progress or completion.
- World pointer/touch, `pointerup`, ordinary world tap, drag end, pan, pinch and `pointercancel` are not implicit commit triggers.
- Frozen IM-15 Inspector remains observer only; IM-15C diagnostic overlay is not Player Placement authority.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

**Frozen Whole-Block head:** `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Frozen marker:** `frozen/im-16-player-construction-placement-integration`.

Target flow remains:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

Frozen IM-16A through IM-16G completely cover this documented target flow. Whole-Block regression and exact-final-documentation-head verification passed with 0 blocker; the Whole-Block marker is verified on the exact final head.

## 5. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

IM-16A remains the immutable, mutation-free placement-evaluation authority for an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 6. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

IM-16B establishes only temporary Player Placement interaction state plus camera-compatible targeting of real `MapStructure` cells.

## 7. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

IM-16C owns only the temporary player-visible world preview and unchanged validity projection from frozen IM-16B / IM-16A. It creates no Building and owns no mutation truth.

### Non-blocking UI/readability evidence

Real iPhone evidence showed that accumulated Inspector/verification surfaces are difficult to read on a narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need**.

## 8. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

IM-16D owns only the authoritative commit / Building registration seam behind the frozen interaction/preview path. It revalidates through frozen IM-16A immediately before mutation and then uses the existing Building ID, identity, lifecycle, store and `BuildingRegistrationWorldOwnership` owners.

## 9. IM-16E – Player Placement Confirm / Cancel Interaction Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16D @ `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

**Pre-freeze implementation/evidence head:** `b077553d9158c504ba5fb2b898732b651fe81054`.

IM-16E owns only explicit Confirm/Cancel orchestration between frozen IM-16B/C and frozen IM-16D. Confirm delegates mutation exclusively to IM-16D; successful commit deactivates temporary Placement, rejected commit preserves authoritative reason and Placement, Cancel never mutates Building state, and world pointer/touch is not an implicit Confirm path.

CI run `34351027622` and Pages run `34351026003` on the pre-freeze implementation/evidence head were **SUCCESS**. Real iPhone/Safari evidence confirmed correct Build identity, success/rejection/Cancel behavior and Inspector read-only ownership.

## 10. IM-16F – Player Building Selection & Placement Activation Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16E @ `a943ac93554e32a8909be2d44ae2d327dd044d58`.

**Pre-freeze implementation/evidence head:** `e3685a4f826c4897224d89ee4ecc2900feb7977f`.

**Frozen head:** `0cf69a9253b4ec503f9f1c5b8585721722851963`.

IM-16F closes only the missing Player-entry seam before frozen IM-16B: `Player Building Selection → existing definitionId → frozen IM-16B activate(definitionId) → ACTIVE Placement State`.

The bounded selection source exposes `HQ`, `WOODCUTTER`, `STOREHOUSE` only. Unknown options are rejected with `BUILDING_OPTION_NOT_AVAILABLE`; selection performs no validity evaluation, Building registration, mutation or commit. Frozen IM-16A through IM-16E retain their ownership.

Full frozen-IM-16E → pre-freeze IM-16F diff was **12 commits ahead / 0 behind**, merge-base exactly frozen IM-16E. CI run `34355853367` and Pages run `34355852082` were **SUCCESS**. Real iPhone/Safari evidence confirmed the frozen behavior.

## 11. IM-16G – Authoritative Construction Result Player UI Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16F @ `0cf69a9253b4ec503f9f1c5b8585721722851963`.

**Pre-freeze implementation/evidence head:** `d8c30732173bd6279c94b2023c2ebae9077652a8`.

IM-16G consumes only the actual immutable result from the explicit frozen IM-16E Confirm → frozen IM-16D path and projects only actual returned `definitionId`, `buildingId` or authoritative rejection reason. It performs no commit, Building registration, mutation, placement evaluation or lifecycle mutation.

CI run `34365247140` and Pages run `34365244669` were **SUCCESS**. Real iPad/Safari evidence confirmed successful and rejected paths, correct Build identity and Inspector read-only behavior.

## 12. IM-16 Whole-Block Completion / Regression / Freeze Gate

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Final frozen Whole-Block head:** `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Frozen marker:** `frozen/im-16-player-construction-placement-integration`.

Whole-Block reconciliation confirmed frozen IM-16A through IM-16G cover the documented target flow with 0 blocker.

## 13. Post-IM-16 Capability Reconciliation Result

The shortest route toward the first closed playable economic construction loop remains:

`frozen IM-16 Player placement/commit → Runtime admission → economic construction requirement → construction initialization → existing logistics/material delivery → construction progress → completion → Player state projection`.

Existing Building Construction state/progress/completion, Resource/Demand/Reservation/Claim, Transport/BuildingStock and Runtime ownership must be reused rather than duplicated. Workforce, regular production and broader catalogue/placement capability remain downstream.

Runtime-State Gating is not a separate Whole Block. It is IM-17A.

## 14. IM-17 – Economic Construction Integration

**Status:** IN PROGRESS

**Definition baseline:** frozen IM-16 @ `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Whole-Block development branch:** `feature/im-17-economic-construction-integration`.

### Whole-Block objective

`How does a successfully and authoritatively placed Player Building become an economically effective construction site with real material demand, existing logistics and controlled completion without duplicating existing Building, Resource, Demand, Transport, BuildingStock or Runtime authority?`

### IM-17A – Player Construction Runtime Admission Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16 @ `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Frozen head:** `6caf6132864e71201dee6b9a286c111f67fce016`.

**Frozen marker:** `frozen/im-17a-player-construction-runtime-admission-contract`.

IM-17A consumes the actual frozen-IM-16 authoritative placement commit result and the authoritative Runtime state. Economic-construction admission is granted only for `COMMITTED + RUNNING`. `READY`, `PAUSED`, `CREATED`, `BOOTING` and `STOPPED` reject economic admission with `RUNTIME_NOT_RUNNING`; a rejected placement result is never admitted. IM-17A does not retroactively change or undo frozen IM-16 Building registration.

Automated CI run `34394606222` on implementation head `6caf6132864e71201dee6b9a286c111f67fce016` completed **SUCCESS**, including `Run IM-17A + frozen predecessor regression`.

Fresh real iPad/Safari evidence confirms visible build identity `IM-17A-PLAYER-CONSTRUCTION-RUNTIME-ADMISSION-CONTRACT`, runtime transition `READY → RUNNING`, successful real placement/authoritative commit while `RUNNING`, and `RUNNING → PAUSED`. This is accepted as real-device evidence for the gate.

### NON-BLOCKING UI/Render follow-up

The same iPad evidence again shows that world-canvas technical labels/annotations can protrude awkwardly from their intended object/preview anchor, including `HQ · VALID` and long `building:*` labels. This is a **NON-BLOCKING later UI/Render follow-up**. A later bounded label/annotation projection rule should address anchor, offset and viewport/edge clamping. It is not placement-validity truth and was not silently fixed inside IM-17A.

### IM-17B – Economic Construction Requirement Contract

**Status:** DEFINED / NOT IMPLEMENTED

Define the authoritative economic requirement of a placed Building using existing Resource/Demand identities tied to the stable `buildingId`, including required quantity, reserved/fulfilled quantity and remaining need. No transport execution or progress. No second resource, demand, cost or inventory truth.

### IM-17C – Player Placement → Construction Initialization Integration

**Status:** DEFINED / NOT IMPLEMENTED

Connect an admitted successful frozen-IM-16 commit to existing Building Construction state using the same stable `buildingId`, initialized as `PENDING`. Do not create a second construction-site Building identity or alter frozen IM-16 authority.

### IM-17D – Construction Demand → Existing Logistics Integration

**Status:** DEFINED / NOT IMPLEMENTED

Connect construction demand to existing Reservation/Claim/Transport/BuildingStock boundaries. Only authoritative available resources may be reserved and delivered. No second construction-material logistics subsystem and no routing/movement rewrite.

### IM-17E – Delivered Material → Construction Progress Settlement

**Status:** DEFINED / NOT IMPLEMENTED

Translate only authoritative delivered/settled construction material into deterministic existing Building Construction Progress. Progress remains monotonic `0…1`; `PENDING`, `IN_PROGRESS` and `COMPLETED` semantics remain authoritative. No workforce or production integration.

### IM-17F – Construction Completion Integration

**Status:** DEFINED / NOT IMPLEMENTED

Use the existing Building Construction Completion boundary so completion becomes effective exactly once when authoritative completion conditions are satisfied. Preserve stable Building identity and existing lifecycle ownership. No worker assignment or production start.

### IM-17G – Player Construction State Projection

**Status:** DEFINED / NOT IMPLEMENTED

Project only actual authoritative economic construction state back into Player UI, such as waiting for material, under construction, progress and completed. UI owns no admission, demand, resource, delivery, progress or completion truth.

### IM-17 Whole-Block exclusions

No regular workforce assignment, regular production operation, broad Building catalogue authority, general Gold construction-price system, demolition, upgrades, rotation, multi-cell footprints, new terrain/distance placement rules, SaveGame rearchitecture, Inspector mutation/editor authority or legacy `main` gameplay/UI reuse belongs to IM-17.

## 15. IM-17A Completion / Regression / Freeze Gate

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Full diff frozen IM-16 `99b0e7d001b7a4f175727cf8e304dde0928c730b` → IM-17A frozen head `6caf6132864e71201dee6b9a286c111f67fce016` was verified as one implementation commit ahead / zero behind with merge-base exactly frozen IM-16. Scope is limited to the IM-17A Runtime-admission contract, focused self-test/Node evidence, visible build identity/runtime evidence and CI regression integration. No IM-17B demand/resource/cost/logistics/progress/completion functionality is present.

CI run `34394606222` completed **SUCCESS**. Fresh iPad/Safari evidence is accepted. Frozen marker `frozen/im-17a-player-construction-runtime-admission-contract` is verified against `6caf6132864e71201dee6b9a286c111f67fce016`.

The label/annotation projection issue visible in the real-device evidence is recorded as NON-BLOCKING and remains outside IM-17A.

## 16. Current gate

**IM-17 – Economic Construction Integration = IN PROGRESS.**

**IM-17A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**Frozen IM-17A head = `6caf6132864e71201dee6b9a286c111f67fce016`.**

**IM-17B through IM-17G = DEFINED / NOT IMPLEMENTED.**

No IM-17B implementation is part of the IM-17A freeze gate.

## 17. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-10 — IM-17A Player Construction Runtime Admission Contract frozen PASS / 0 BLOCKER at `6caf6132864e71201dee6b9a286c111f67fce016`; real iPad evidence accepted; world-label/annotation positioning recorded as NON-BLOCKING follow-up; IM-17B through IM-17G remain DEFINED / NOT IMPLEMENTED.