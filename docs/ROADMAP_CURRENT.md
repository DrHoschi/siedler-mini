# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16E COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16F COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16G COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-17 IN PROGRESS; IM-17A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-17B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-17C–G DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-17-economic-construction-integration`  
**Frozen IM-16 Whole-Block head:** `99b0e7d001b7a4f175727cf8e304dde0928c730b`  
**Frozen IM-16 Whole-Block marker:** `frozen/im-16-player-construction-placement-integration`  
**Frozen IM-17A head:** `6caf6132864e71201dee6b9a286c111f67fce016`  
**Frozen IM-17A marker:** `frozen/im-17a-player-construction-runtime-admission-contract`  
**Frozen IM-17B head:** `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`  
**Frozen IM-17B marker:** `frozen/im-17b-economic-construction-requirement-contract`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14, IM-15 and IM-16 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**. IM-17A and IM-17B are also **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

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

Frozen IM-17A marker: `frozen/im-17a-player-construction-runtime-admission-contract`.
Frozen IM-17A head and exclusive IM-17B baseline: `6caf6132864e71201dee6b9a286c111f67fce016`.

Frozen IM-17B marker: `frozen/im-17b-economic-construction-requirement-contract`.
Frozen IM-17B head and exclusive IM-17C baseline: `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`.

## 2. Binding ownership after IM-17B

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the current supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and real world-target consumption.
- Frozen IM-16C owns only temporary player-visible Placement Preview / Validity projection.
- Frozen IM-16D owns only the authoritative commit seam that revalidates through IM-16A and then uses existing Building Domain identity/lifecycle/store ownership plus `BuildingRegistrationWorldOwnership`.
- Existing Building Domain remains sole owner of stable Building identity/lifecycle and Building-store mutation.
- `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- Frozen IM-16E owns only explicit Player Confirm/Cancel interaction orchestration. It owns no placement validity and no Building mutation authority.
- Frozen IM-16F owns only the narrow Player Building selection / Placement activation seam: bounded known/testable options `HQ`, `WOODCUTTER`, `STOREHOUSE` → frozen IM-16B `activate(definitionId)`.
- Frozen IM-16G owns only temporary player-facing projection of the actual immutable Confirm → IM-16D commit result. It owns no success/failure truth beyond that source.
- Successful IM-16G feedback may display only the actual returned `definitionId` and `buildingId`; rejected feedback may display only the unchanged authoritative rejection reason.
- Preview validity, control enabled-state, cached evaluation and world-render appearance are not IM-16G success authorities.
- World rendering of a registered Building remains Runtime/Render ownership.
- World pointer/touch, `pointerup`, ordinary world tap, drag end, pan, pinch and `pointercancel` remain non-commit paths.
- Frozen IM-17A owns only the economic-construction Runtime admission decision after an actual frozen-IM-16 authoritative placement commit result.
- Frozen IM-17A admits economic construction only for `COMMITTED + RUNNING`; non-running Runtime states do not become economic-construction truth.
- Frozen IM-17A does not alter, undo or re-own frozen IM-16 Building registration and owns no economic requirement, Resource/Demand truth, reservation, logistics, BuildingStock settlement, construction progress or completion.
- Frozen IM-17B owns only the narrow economic-construction requirement seam over existing `ResourceDemands`: stable `buildingId` is the demand `consumerId`, and the existing `definitionId`, `targetAmount`, `reservedAmount`, `fulfilledAmount`, `remainingAmount` and `status` vocabulary remains authoritative.
- Frozen IM-17B creates no second Resource/Demand/cost/inventory truth and owns no construction initialization, transport, delivery settlement, progress or completion.
- IM-15 remains observation/guidance except its already frozen diagnostic action allowlist; IM-15C diagnostic overlay remains read-only and is not Player Placement authority.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

**Frozen Whole-Block head:** `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Frozen marker:** `frozen/im-16-player-construction-placement-integration`.

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

Frozen IM-16A through IM-16G fully cover the documented end-to-end capability. Whole-Block regression and exact-final-documentation-head verification passed with 0 blocker; the Whole-Block marker is verified on the exact final head.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16B adds only the temporary Player Placement interaction-state and world-target seam above frozen IM-16A.

## 6. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16C projects only the already existing frozen-IM-16B state into a temporary player-visible world preview. It owns no placement validity and no Building mutation.

Real iPhone tests established that accumulated verification/inspector overlays are difficult to read on the narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and was not folded into IM-16E, IM-16F or IM-16G.

## 7. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

Frozen IM-16D introduces only the authoritative commit / Building registration seam behind the already frozen placement interaction and preview path. It performs final IM-16A revalidation immediately before mutation and registers through the existing Building owners.

## 8. IM-16E – Player Placement Confirm / Cancel Interaction Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16D @ `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

Frozen IM-16E is limited to explicit Player-interaction orchestration between the already frozen owners: `IM-16B Placement State → IM-16C Preview → Player CONFIRM → IM-16D authoritative Commit` or `IM-16B Placement State → Player CANCEL → Placement State INACTIVE`.

Confirm requires active Placement and a real candidate; actual mutation goes only through frozen IM-16D including final frozen-IM-16A revalidation. Successful Confirm deactivates temporary Placement; rejected Confirm preserves Placement and the authoritative reason. Cancel never commits and never mutates Building state. World pointer/touch and camera gestures remain non-commit paths.

CI run `34351027622` and Pages run `34351026003` on the pre-freeze implementation/evidence head were **SUCCESS**. Real iPhone/Safari evidence confirmed the exact IM-16E Build identity, successful and rejected flows, no implicit world-pointer Confirm, Inspector `OBSERVATION READ ONLY`, and one Confirm/Cancel control group.

## 9. IM-16F – Player Building Selection & Placement Activation Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16E @ `a943ac93554e32a8909be2d44ae2d327dd044d58`.

**Frozen head:** `0cf69a9253b4ec503f9f1c5b8585721722851963`.

IM-16F fills only the Player-entry gap before frozen IM-16B: `Player Building Selection → existing definitionId → frozen IM-16B activate(definitionId) → ACTIVE Placement State`.

The bounded Player selection source exposes `HQ`, `WOODCUTTER` and `STOREHOUSE` only. An unavailable option is rejected with `BUILDING_OPTION_NOT_AVAILABLE` and causes no Placement activation. The selection action itself performs no validity evaluation, Building mutation, registration or commit. Frozen IM-16A through IM-16E retain their existing ownership.

Full frozen-IM-16E → pre-freeze-IM-16F diff was **12 commits ahead / 0 behind**, merge-base exactly frozen IM-16E, with 10 changed files limited to the two control documents plus IM-16F selection implementation, self-test/evidence, visible entry-point/build identity and CI regression surfaces.

CI run `34355853367` and Pages run `34355852082` on the pre-freeze implementation/evidence head were **SUCCESS**. Four fresh real iPhone/Safari screenshots confirmed visible `IM-16F — PASS`, exact Build identity, Player options, active/switch/inactive Placement states, unchanged Confirm/Cancel behavior, successful existing flow, Inspector read-only, and independent Runtime state transitions.

The final frozen marker `frozen/im-16f-player-building-selection-placement-activation-contract` resolves to `0cf69a9253b4ec503f9f1c5b8585721722851963`.

## 10. IM-16G – Authoritative Construction Result Player UI Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16F @ `0cf69a9253b4ec503f9f1c5b8585721722851963`.

**Pre-freeze implementation/evidence head:** `d8c30732173bd6279c94b2023c2ebae9077652a8`.

### Frozen capability

IM-16G closes only the final Player-feedback seam after the already frozen authoritative construction flow:

`IM-16F Selection → IM-16B Placement → IM-16C Preview → IM-16E Confirm → IM-16D authoritative Commit → IM-16G Player Result Projection`.

- IM-16G consumes only the actual immutable result exposed by the existing frozen IM-16E Confirm path and projects only an actual `authoritative-placement-commit-result`.
- A successful result projects the real returned `definitionId` and `buildingId` as temporary Player feedback.
- A rejected result projects only the unchanged authoritative rejection reason returned by frozen IM-16D / IM-16A.
- `NOT_READY`, Cancel, preview validity, control enabled-state, cached evaluation and world-render appearance do not create construction-result truth.
- IM-16G performs no commit, Building registration, Building mutation, placement evaluation or lifecycle mutation.
- Runtime/Render remains responsible for visible world projection of the actually registered Building.
- Existing Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime and Domain ownership remains unchanged.

### Verification evidence

Full frozen-IM-16F → pre-freeze-IM-16G diff was rechecked as **11 commits ahead / 0 behind**, merge-base exactly frozen IM-16F, with 10 changed files limited to the two control documents plus IM-16G result projection, self-test/evidence, visible entry-point/build identity and CI regression surfaces.

CI run `34365247140` on `d8c30732173bd6279c94b2023c2ebae9077652a8`: **SUCCESS**, including `Run IM-16G + frozen predecessor regression`.

Pages run `34365244669` on the same head: **SUCCESS**.

Two real iPad/Safari recordings confirmed the required device behavior:

- successful real Confirm → visible IM-16G Player feedback `Gebaut` with the actual returned `definitionId` and `buildingId`;
- occupied-cell Confirm → visible IM-16G Player feedback `Nicht gebaut` with unchanged authoritative `TARGET_CELL_OCCUPIED`, with no additional Building registration;
- visible IM-16G Build identity / `IM-16G — PASS` and Inspector `OBSERVATION READ ONLY` remained correct.

The first recording also showed that Player building selection/placement/commit can currently be used while Runtime is still `READY` before Start/Play. This became the explicit IM-17A reconciliation input and was not retroactively changed in IM-16.

### Preserved exclusions

IM-16G does not introduce Building management/details after construction, costs or prices, Gold/resource deductions, construction progression, workers/production, demolition, upgrades, rotation, multi-cell footprints, new Building definitions/catalogue authority, new placement-validity rules, terrain/distance rules, SaveGame rearchitecture, Inspector mutation/editor behavior or any later IM-16 capability.

## 11. IM-16G Completion / Regression / Freeze Gate

Ownership and exclusions were rechecked against the complete frozen-IM-16F → IM-16G implementation range. Automated regression, Pages and both real iPad/Safari evidence paths are **PASS / 0 BLOCKER**.

IM-16G is frozen at `9022b7934e885950af8d8a3559cbecdd41a2da63` with marker `frozen/im-16g-authoritative-construction-result-player-ui-projection-contract`.

## 12. IM-16 Whole-Block Completion / Regression / Freeze Gate

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive gate baseline:** frozen IM-16G @ `9022b7934e885950af8d8a3559cbecdd41a2da63`.

**Final frozen Whole-Block head:** `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Frozen marker:** `frozen/im-16-player-construction-placement-integration`.

Whole-Block reconciliation confirms that the documented IM-16 target flow is fully covered by frozen IM-16A through IM-16G. No IM-16H capability is required by the current scope.

The complete IM-16 history was verified from frozen IM-15 `9e797ab93036f6b3731442dc626edb8c091893c8` through the Whole-Block gate documentation head: **99 commits ahead / 0 behind**, merge-base exactly frozen IM-15. All frozen IM-16A→G markers were live-verified against their expected SHAs.

CI run `34376983633` on Whole-Block documentation-verification head `0797f39910a410f90b5e9a7ac548d998919937a3` completed **SUCCESS**, including `Run IM-16G + frozen predecessor regression`. Pages run `34376982564` on the same head completed **SUCCESS**. Exact-final-documentation-head CI and Pages subsequently succeeded on `99b0e7d001b7a4f175727cf8e304dde0928c730b`, and the Whole-Block marker was created and verified on that exact head.

Ownership/exclusion boundaries and the accepted real iPhone/iPad evidence remain unchanged. Player Construction Runtime-State Gating was carried forward as an explicit post-IM-16 reconciliation point rather than retroactively modifying frozen IM-16.

No later IM capability, Runtime-state gating policy, costs/resources/Gold, construction progression, workers/production, demolition/upgrades, rotation/multi-cell footprints, catalogue/definition authority, new placement rules, SaveGame rearchitecture, Inspector mutation or legacy `main` gameplay/UI reuse was added to IM-16.

## 13. Post-IM-16 Capability Reconciliation Result

The post-IM-16 reconciliation identifies the shortest route toward the first closed playable economic construction loop as:

`frozen IM-16 Player placement/commit → Runtime admission → economic construction requirement → construction initialization → existing logistics/material delivery → construction progress → completion → Player state projection`.

Existing Building Construction state/progress/completion, Resource/Demand/Reservation/Claim, Transport/BuildingStock and Runtime ownership must be reused rather than duplicated. Workforce, regular production and broader catalogue/placement capability remain downstream of this first integration block.

Runtime-State Gating is not promoted to a separate large Whole Block. It is the first admission contract of IM-17.

## 14. IM-17 – Economic Construction Integration

**Status:** IN PROGRESS

**Definition baseline:** frozen IM-16 @ `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Whole-Block development branch:** `feature/im-17-economic-construction-integration`.

### Whole-Block objective

IM-17 answers:

`How does a successfully and authoritatively placed Player Building become an economically effective construction site with real material demand, existing logistics and controlled completion without duplicating existing Building, Resource, Demand, Transport, BuildingStock or Runtime authority?`

### IM-17A – Player Construction Runtime Admission Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16 @ `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Frozen head:** `6caf6132864e71201dee6b9a286c111f67fce016`.

**Frozen marker:** `frozen/im-17a-player-construction-runtime-admission-contract`.

Frozen IM-17A consumes only the actual frozen-IM-16 authoritative placement commit result plus authoritative Runtime state. Economic construction is admitted only for `COMMITTED + RUNNING`. `READY`, `PAUSED`, `CREATED`, `BOOTING` and `STOPPED` reject admission with `RUNTIME_NOT_RUNNING`; an already rejected placement result is never admitted. The contract does not retroactively alter or undo frozen IM-16 Building registration.

CI run `34394606222` on `6caf6132864e71201dee6b9a286c111f67fce016` completed **SUCCESS**, including `Run IM-17A + frozen predecessor regression`.

Fresh real iPad/Safari evidence confirms the exact visible build identity `IM-17A-PLAYER-CONSTRUCTION-RUNTIME-ADMISSION-CONTRACT`, `READY → RUNNING`, successful real placement/authoritative commit while `RUNNING`, and `RUNNING → PAUSED`. This evidence is accepted for IM-17A.

### NON-BLOCKING UI/Render follow-up

The same real-device evidence shows existing world-canvas labels/annotations can extend awkwardly beyond the intended object/preview anchor, notably `HQ · VALID` and long `building:*` labels. This is recorded as a **NON-BLOCKING later UI/Render follow-up**. A bounded future label/annotation projection rule may address anchor, offset and viewport-edge clamping. This is not placement-validity or Runtime-admission truth and was not modified in IM-17A.

### IM-17B – Economic Construction Requirement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-17A @ `6caf6132864e71201dee6b9a286c111f67fce016`.

**Frozen head:** `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`.

**Frozen marker:** `frozen/im-17b-economic-construction-requirement-contract`.

Frozen IM-17B reuses the existing `ResourceDemands` authority. Stable `buildingId` is the demand `consumerId`; `definitionId`, `targetAmount`, `reservedAmount`, `fulfilledAmount`, `remainingAmount` and `status` are projected without creating a second truth. The existing invariant `targetAmount = reservedAmount + fulfilledAmount + remainingAmount` remains authoritative. ACTIVE claims represent reserved quantity and consumed claims represent fulfilled quantity.

CI run `34460374866` and Pages run `34460373223` completed **SUCCESS** on exact frozen head `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`. The frozen marker resolves exactly to that capability head. Scope verification confirms no IM-17C initialization, no transport integration, no Delivery→Claim consume integration, no construction progress and no completion functionality.

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

### IM-17 execution boundary

IM-17A and IM-17B are frozen. IM-17C through IM-17G remain defined but not implemented. No IM-17C functionality is part of the IM-17B freeze gate.

## 15. IM-17A Completion / Regression / Freeze Gate

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Full diff frozen IM-16 `99b0e7d001b7a4f175727cf8e304dde0928c730b` → IM-17A implementation/frozen head `6caf6132864e71201dee6b9a286c111f67fce016` was verified as **1 commit ahead / 0 behind**, merge-base exactly frozen IM-16. Scope is limited to the IM-17A Runtime-admission contract, focused self-test/Node/evidence, visible build identity/runtime entry surface and CI regression integration. There is no IM-17B Resource/Demand/cost/logistics/progress/completion implementation.

CI run `34394606222` completed **SUCCESS**. Fresh real iPad/Safari evidence is accepted. Frozen marker `frozen/im-17a-player-construction-runtime-admission-contract` resolves to the exact frozen head `6caf6132864e71201dee6b9a286c111f67fce016`.

The world-label/annotation positioning issue is explicitly retained as NON-BLOCKING follow-up and remains outside IM-17A.

## 16. IM-17B Completion / Regression / Freeze Gate

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-17B capability head `32f219029d4f76fcd0ff5e768e66cf32a47ec50b` passed the focused IM-17B self-test plus frozen predecessor regression. CI run `34460374866` and Pages run `34460373223` both completed **SUCCESS** on that exact head. Frozen marker `frozen/im-17b-economic-construction-requirement-contract` resolves exactly to the same SHA.

The contract uses only existing `ResourceDemands` vocabulary and preserves its quantity relationships. No second Resource/Demand authority was added. The gate contains zero IM-17C initialization, zero transport integration, zero Delivery→Claim consume integration and zero construction-progress/completion functionality.

## 17. Current gate

**IM-17 – Economic Construction Integration = IN PROGRESS.**

**IM-17A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-17B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**Frozen IM-17B head = `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`.**

**Frozen IM-17B marker = `frozen/im-17b-economic-construction-requirement-contract`.**

**IM-17C through IM-17G = DEFINED / NOT IMPLEMENTED.**

No IM-17C implementation is part of the completed IM-17B gate.

---

**Updated:** 2026-09-10 — IM-17B frozen PASS / 0 BLOCKER at `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`; CI `34460374866` and Pages `34460373223` SUCCESS; frozen marker verified; IM-17C through IM-17G remain DEFINED / NOT IMPLEMENTED.