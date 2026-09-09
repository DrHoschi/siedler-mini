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
- **IM-16D – Authoritative Placement Commit & Building Registration Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16E – Player Placement Confirm / Cancel Interaction Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16F – Player Building Selection & Placement Activation Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16G – Authoritative Construction Result Player UI Projection Contract: DEFINED / NOT IMPLEMENTED**

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

## 3. Binding ownership boundary after IM-16F completion

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the currently supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and world-target consumption.
- Frozen IM-16C owns only temporary Player Placement Preview / Validity projection.
- Frozen IM-16D owns only the authoritative commit seam: final revalidation through IM-16A and controlled handoff to existing Building identity/lifecycle/store/registration owners.
- Existing Building Domain/store remains sole owner of stable Building identity, lifecycle and Building-store mutation.
- Existing `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- Frozen IM-16E owns only explicit Player Confirm/Cancel interaction orchestration. Confirm consumes frozen IM-16D; Cancel only deactivates the temporary placement state.
- World pointer/touch, `pointerup`, ordinary world tap, drag end, pan, pinch and `pointercancel` are not implicit commit triggers.
- Frozen IM-15 Inspector remains observer only; IM-15C diagnostic overlay is not Player Placement authority.
- Legacy `main` gameplay/UI architecture is not an implementation basis.
- Frozen IM-16F owns only the narrow Player Building selection / Placement activation seam: bounded known/testable options `HQ`, `WOODCUTTER`, `STOREHOUSE` → frozen IM-16B `activate(definitionId)`.
- IM-16F owns no Building definitions, placement validity, Building mutation, registration, commit, Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime or Domain truth and introduces no authoritative Building-definition registry.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

Target flow remains:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

IM-16A through IM-16F are complete/frozen. IM-16G is defined only. No IM-16G implementation is authorized by this documentation step.

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

Real iPhone evidence showed that accumulated Inspector/verification surfaces are difficult to read on a narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and was not silently folded into IM-16E, IM-16F or IM-16G.

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

Full frozen-IM-16E → pre-freeze-IM-16F diff was **12 commits ahead / 0 behind**, merge-base exactly frozen IM-16E. CI run `34355853367` and Pages run `34355852082` were **SUCCESS**. Real iPhone/Safari evidence confirmed `IM-16F — PASS`, correct Build identity, option selection/switch/inactive state, unchanged Confirm/Cancel behavior, successful existing commit flow, Inspector read-only and independent Runtime states.

## 11. IM-16G – Authoritative Construction Result Player UI Projection Contract

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive baseline:** frozen IM-16F @ `0cf69a9253b4ec503f9f1c5b8585721722851963`.

### Capability purpose

IM-16G closes only the final missing Player-feedback seam of the already established end-to-end construction path:

`IM-16F Building Selection → IM-16B Placement → IM-16C Preview → IM-16E Confirm → IM-16D authoritative Commit → IM-16G Player Result Projection`.

The Player UI may project the actually returned authoritative commit result, but it must not create or infer a second success/failure truth.

### Binding contract

- IM-16G consumes only the actual result returned from the explicit frozen IM-16E Confirm → frozen IM-16D commit path.
- On successful commit, temporary Player feedback may project the real returned `buildingId` and the used `definitionId`.
- On rejected commit, temporary Player feedback may project only the unchanged authoritative rejection reason returned by frozen IM-16D / IM-16A.
- Success must never be inferred from frozen IM-16C preview validity, enabled controls, cached IM-16A evaluation or world-render appearance.
- IM-16G performs no Building commit, registration, mutation, placement evaluation or lifecycle mutation.
- World rendering/projection of the actually registered Building remains owned by the existing Runtime/Render path; IM-16G owns only temporary player-facing result feedback.
- Frozen IM-16A remains placement-validity authority; IM-16B remains temporary Placement-state/world-target owner; IM-16C remains preview owner; IM-16D remains authoritative commit/registration owner; IM-16E remains Confirm/Cancel owner; IM-16F remains Building-selection/Placement-activation owner.
- Existing Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime and Domain ownership remains unchanged.

### Explicit exclusions

IM-16G introduces no Building management/details after construction, costs/prices, Gold/resource deductions, construction progression, workers/production, demolition, upgrades, rotation, multi-cell footprints, new Building definitions or catalogue authority, new placement-validity/terrain/distance rules, SaveGame rearchitecture, Inspector mutation/editor path or later IM-16 capability.

### Definition gate

This step documents IM-16G only as **DEFINED / NOT IMPLEMENTED** against frozen IM-16F. No runtime, UI, Domain, test, CI, build-identity or Player-feedback implementation is introduced in the same step.

If IM-16G is later completed/frozen, the originally documented IM-16 end-to-end Player flow is structurally closed. Whole-Block completion must still be separately reconciled and is not automatically implied.

## 12. IM-16F Completion / Regression / Freeze Gate

Full diff frozen IM-16E `a943ac93554e32a8909be2d44ae2d327dd044d58` → pre-freeze IM-16F head `e3685a4f826c4897224d89ee4ecc2900feb7977f` was rechecked as **12 commits ahead / 0 behind**, merge-base exactly frozen IM-16E, with 10 changed files limited to the two control documents plus IM-16F selection implementation, self-test/evidence, visible entry-point/build identity and CI regression surfaces.

Ownership and exclusions were rechecked against the full diff. Automated CI/Pages and final real iPhone/Safari evidence are PASS. Frozen marker `frozen/im-16f-player-building-selection-placement-activation-contract` is verified on `0cf69a9253b4ec503f9f1c5b8585721722851963`.

## 13. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A through IM-16F = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16G = DEFINED / NOT IMPLEMENTED.**

The next permissible step after this documentation change is exclusively the **IM-16G Documentation Verification / Finalization Gate** against frozen IM-16F `0cf69a9253b4ec503f9f1c5b8585721722851963`.

No IM-16G implementation or later IM-16 capability is authorized here.

## 14. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-09 — IM-16G – Authoritative Construction Result Player UI Projection Contract documented as DEFINED / NOT IMPLEMENTED against frozen IM-16F. No IM-16G implementation.
