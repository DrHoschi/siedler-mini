# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current documentation branch: `feature/im-16-player-construction-placement-integration`
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
- **IM-17 – Economic Construction Integration: DEFINED / NOT IMPLEMENTED**
- **IM-17A through IM-17G: DEFINED / NOT IMPLEMENTED**

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
Frozen IM-16 Whole-Block head and exclusive IM-17 definition baseline: `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

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
- Successful IM-16G projection may use only the real returned `definitionId` and `buildingId`; rejection may use only the unchanged authoritative reason.
- Preview validity, enabled controls, cached IM-16A evaluation and world-render appearance are not construction-result authorities.
- IM-16G performs no commit, Building registration, mutation, placement evaluation or lifecycle mutation.
- Runtime/Render remains owner of actual visible world projection of registered Buildings.
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

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16F @ `0cf69a9253b4ec503f9f1c5b8585721722851963`.

**Pre-freeze implementation/evidence head:** `d8c30732173bd6279c94b2023c2ebae9077652a8`.

### Frozen capability

IM-16G closes only the final missing Player-feedback seam of the established construction path:

`IM-16F Building Selection → IM-16B Placement → IM-16C Preview → IM-16E Confirm → IM-16D authoritative Commit → IM-16G Player Result Projection`.

- IM-16G consumes only the actual immutable result from the explicit frozen IM-16E Confirm → frozen IM-16D path.
- On successful commit, temporary Player feedback projects the real returned `definitionId` and `buildingId`.
- On rejected commit, temporary Player feedback projects only the unchanged authoritative rejection reason returned by frozen IM-16D / IM-16A.
- `NOT_READY`, Cancel, frozen IM-16C preview validity, enabled controls, cached IM-16A evaluation and world-render appearance do not create construction-result truth.
- IM-16G performs no Building commit, registration, mutation, placement evaluation or lifecycle mutation.
- Existing Runtime/Render remains owner of the actual visible world projection of a registered Building.
- Frozen IM-16A remains placement-validity authority; IM-16B remains temporary Placement-state/world-target owner; IM-16C remains preview owner; IM-16D remains authoritative commit/registration owner; IM-16E remains Confirm/Cancel owner; IM-16F remains Building-selection/Placement-activation owner.
- Existing Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime and Domain ownership remains unchanged.

### Verification evidence

Full diff frozen IM-16F `0cf69a9253b4ec503f9f1c5b8585721722851963` → pre-freeze IM-16G head `d8c30732173bd6279c94b2023c2ebae9077652a8` was rechecked as **11 commits ahead / 0 behind**, merge-base exactly frozen IM-16F, with 10 changed files limited to the two control documents plus IM-16G result projection, self-test/evidence, visible entry-point/build identity and CI regression surfaces.

CI run `34365247140` on the pre-freeze implementation/evidence head: **SUCCESS**, including `Run IM-16G + frozen predecessor regression`.

Pages run `34365244669` on the same head: **SUCCESS**.

Two real iPad/Safari recordings provide the required device evidence:

- successful free-cell Confirm → visible IM-16G Player feedback `Gebaut` with the actual returned `definitionId` and `buildingId`;
- occupied-cell Confirm → visible IM-16G Player feedback `Nicht gebaut` with unchanged authoritative `TARGET_CELL_OCCUPIED`, with no additional Building registration;
- correct IM-16G Build identity / `IM-16G — PASS` remained visible and Inspector remained `OBSERVATION READ ONLY`.

The first recording additionally demonstrated that building selection/placement/commit is currently possible while Runtime is still `READY` before Start/Play. This became the explicit IM-17A reconciliation input and was not retroactively changed in IM-16.

### Explicit exclusions preserved

IM-16G introduces no Building management/details after construction, costs/prices, Gold/resource deductions, construction progression, workers/production, demolition, upgrades, rotation, multi-cell footprints, new Building definitions or catalogue authority, new placement-validity/terrain/distance rules, SaveGame rearchitecture, Inspector mutation/editor path or later IM-16 capability.

## 12. IM-16F Completion / Regression / Freeze Gate

Full diff frozen IM-16E `a943ac93554e32a8909be2d44ae2d327dd044d58` → pre-freeze IM-16F head `e3685a4f826c4897224d89ee4ecc2900feb7977f` was rechecked as **12 commits ahead / 0 behind**, merge-base exactly frozen IM-16E, with 10 changed files limited to the two control documents plus IM-16F selection implementation, self-test/evidence, visible entry-point/build identity and CI regression surfaces.

Ownership and exclusions were rechecked against the full diff. Automated CI/Pages and final real iPhone/Safari evidence are PASS. Frozen marker `frozen/im-16f-player-building-selection-placement-activation-contract` is verified on `0cf69a9253b4ec503f9f1c5b8585721722851963`.

## 13. IM-16G Completion / Regression / Freeze Gate

Ownership and exclusions were rechecked against the full frozen-IM-16F → IM-16G range. Automated regression, Pages and both real iPad/Safari success/rejection evidence paths are **PASS / 0 BLOCKER**.

Frozen marker `frozen/im-16g-authoritative-construction-result-player-ui-projection-contract` is verified on `9022b7934e885950af8d8a3559cbecdd41a2da63`.

## 14. IM-16 Whole-Block Completion / Regression / Freeze Gate

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive gate baseline:** frozen IM-16G @ `9022b7934e885950af8d8a3559cbecdd41a2da63`.

**Final frozen Whole-Block head:** `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Frozen marker:** `frozen/im-16-player-construction-placement-integration`.

Whole-Block reconciliation confirms that the documented IM-16 end-to-end target flow is fully covered by frozen IM-16A through IM-16G. No additional IM-16 substep is required by the current scope.

The complete IM-16 history was verified from frozen IM-15 baseline `9e797ab93036f6b3731442dc626edb8c091893c8` through the Whole-Block gate documentation head: **99 commits ahead / 0 behind**, merge-base exactly frozen IM-15. All frozen IM-16A→G markers were live-verified against their expected SHAs.

CI run `34376983633` on Whole-Block documentation-verification head `0797f39910a410f90b5e9a7ac548d998919937a3` completed **SUCCESS**, including `Run IM-16G + frozen predecessor regression`. Pages run `34376982564` on the same head completed **SUCCESS**. Exact-final-documentation-head CI and Pages subsequently succeeded on `99b0e7d001b7a4f175727cf8e304dde0928c730b`, and the Whole-Block frozen marker was created and verified on that exact head.

Ownership/exclusion boundaries and the accepted real iPhone/iPad evidence remain unchanged. Player Construction Runtime-State Gating was carried forward as an explicit post-IM-16 reconciliation point rather than retroactively modifying frozen IM-16.

No IM-16H/later capability, Runtime-state gating policy, costs/resources/Gold, construction progression, workers/production, demolition/upgrades, rotation/multi-cell footprints, catalogue/definition authority, new placement rules, SaveGame rearchitecture, Inspector mutation or legacy `main` gameplay/UI reuse was added to IM-16.

## 15. IM-17 – Economic Construction Integration

**Status:** DEFINED / NOT IMPLEMENTED

**Definition baseline:** frozen IM-16 @ `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Development branch:** NOT CREATED.

### Whole-Block objective

IM-17 answers:

`How does a successfully and authoritatively placed Player Building become an economically effective construction site with real material demand, existing logistics and controlled completion without duplicating existing Building, Resource, Demand, Transport, BuildingStock or Runtime authority?`

IM-17 consumes the frozen IM-16 authoritative placement result and integrates it with already existing construction-state/progress/completion, Resource/Demand/Reservation/Claim, Transport/BuildingStock and Runtime ownership. Frozen IM-16 remains unchanged.

### IM-17A – Player Construction Runtime Admission Contract

**Status:** DEFINED / NOT IMPLEMENTED

Define only when the already existing Player Construction path may become economically effective with respect to authoritative Runtime state. Selection/preview may be treated separately from economic mutation. No costs, resource demand, material delivery or construction progress are introduced here.

### IM-17B – Economic Construction Requirement Contract

**Status:** DEFINED / NOT IMPLEMENTED

Define the authoritative economic requirement of a placed Building: existing Resource/Demand identities associated with the stable `buildingId`, required quantity, reserved/fulfilled quantity and remaining need. No transport execution and no construction progress. No second resource, demand, cost or inventory truth.

### IM-17C – Player Placement → Construction Initialization Integration

**Status:** DEFINED / NOT IMPLEMENTED

Connect an admitted successful frozen-IM-16 commit to the existing Building Construction state using the same stable `buildingId`. Initialize construction as `PENDING`; do not create a second construction-site Building identity and do not alter frozen IM-16 placement/commit authority.

### IM-17D – Construction Demand → Existing Logistics Integration

**Status:** DEFINED / NOT IMPLEMENTED

Connect real construction demand to the existing Reservation/Claim/Transport/BuildingStock boundaries. Only authoritative available resources may be reserved and delivered. No second construction-material logistics subsystem and no new routing/movement ownership.

### IM-17E – Delivered Material → Construction Progress Settlement

**Status:** DEFINED / NOT IMPLEMENTED

Translate only authoritative delivered/settled construction material into deterministic progress through the existing Building Construction Progress contract. Progress remains monotonic `0…1`; existing `PENDING`, `IN_PROGRESS`, `COMPLETED` semantics remain authoritative. No workforce or production integration.

### IM-17F – Construction Completion Integration

**Status:** DEFINED / NOT IMPLEMENTED

Use the existing Building Construction Completion boundary so completion becomes effective exactly once when the authoritative completion conditions are satisfied. Preserve stable Building identity and existing Building lifecycle ownership. No worker assignment or production start is introduced here.

### IM-17G – Player Construction State Projection

**Status:** DEFINED / NOT IMPLEMENTED

Project only the actual authoritative economic construction state back to Player UI: e.g. waiting for material, under construction, progress and completed. UI projection owns no admission, demand, resource, delivery, progress or completion truth.

### IM-17 Whole-Block exclusions

IM-17 does not introduce regular workforce assignment, regular production operation, broad Building catalogue authority, a general Gold construction-price system, demolition, upgrades, rotation, multi-cell footprints, new terrain/distance placement rules, SaveGame rearchitecture, Inspector mutation/editor authority or legacy `main` gameplay/UI reuse.

### IM-17 execution boundary

This documentation step defines IM-17A through IM-17G only. No IM-17 development branch exists yet. No IM-17A implementation is authorized in this step.

## 16. Current gate

**IM-16 – Player Construction & Placement Integration = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**Frozen IM-16 Whole-Block head = `99b0e7d001b7a4f175727cf8e304dde0928c730b`.**

**IM-17 – Economic Construction Integration = DEFINED / NOT IMPLEMENTED.**

**IM-17A through IM-17G = DEFINED / NOT IMPLEMENTED.**

The next permissible action is exclusively the IM-17 Documentation Verification / Finalization Gate against frozen IM-16 `99b0e7d001b7a4f175727cf8e304dde0928c730b`: verify that only the defined IM-17 steering documentation was added/synchronized and that no IM-17 implementation, new development branch or unrelated capability entered the change set. Only after a clean gate may a separate IM-17 Whole-Block development branch be explicitly authorized.

## 17. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-09 — IM-16 Whole Block verified frozen at `99b0e7d001b7a4f175727cf8e304dde0928c730b`; IM-17 – Economic Construction Integration and IM-17A through IM-17G documented as DEFINED / NOT IMPLEMENTED. No IM-17 branch or implementation created.