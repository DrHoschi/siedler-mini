# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16E COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16F COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16G DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-16-player-construction-placement-integration`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

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

## 2. Binding ownership after IM-16F completion

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the current supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and real world-target consumption.
- Frozen IM-16C owns only temporary player-visible Placement Preview / Validity projection.
- Frozen IM-16D owns only the authoritative commit seam that revalidates through IM-16A and then uses existing Building Domain identity/lifecycle/store ownership plus `BuildingRegistrationWorldOwnership`.
- Existing Building Domain remains sole owner of stable Building identity/lifecycle and Building-store mutation.
- `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- Frozen IM-16E owns only explicit Player Confirm/Cancel interaction orchestration. It owns no placement validity and no Building mutation authority.
- World pointer/touch, `pointerup`, ordinary world tap, drag end, pan, pinch and `pointercancel` remain non-commit paths.
- IM-15 remains observation/guidance except its already frozen diagnostic action allowlist; IM-15C diagnostic overlay remains read-only and is not Player Placement authority.
- Frozen IM-16F owns only the narrow Player Building selection / Placement activation seam: bounded known/testable options `HQ`, `WOODCUTTER`, `STOREHOUSE` → frozen IM-16B `activate(definitionId)`.
- IM-16F does not own Building definitions, placement validity, Building mutation, registration, commit, Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime or Domain truth and does not introduce an authoritative Building-definition registry.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

IM-16A through IM-16F are complete/frozen. IM-16G is now defined only; no IM-16G implementation is authorized by this documentation step.

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

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive baseline:** frozen IM-16F @ `0cf69a9253b4ec503f9f1c5b8585721722851963`.

### Purpose

IM-16G closes only the final missing Player-feedback seam after the already frozen authoritative construction flow:

`IM-16F Selection → IM-16B Placement → IM-16C Preview → IM-16E Confirm → IM-16D authoritative Commit → IM-16G Player Result Projection`.

The Player UI may project the actually returned authoritative construction result, but it must not derive a second success/failure truth from preview state, button state, cached validity or any independent Building lookup.

### Contract boundary

- IM-16G consumes only the actual result returned by the existing explicit Confirm → frozen IM-16D commit path.
- On successful commit, Player feedback may project the real returned `buildingId` and the used `definitionId` as a temporary UI result.
- On rejected commit, Player feedback projects only the unchanged authoritative rejection reason returned by the frozen IM-16D / IM-16A path.
- No success may be inferred from frozen IM-16C preview validity, enabled/disabled controls, cached IM-16A evaluation or world-render appearance.
- IM-16G performs no commit, Building registration, Building mutation, placement evaluation or lifecycle mutation.
- The actual world rendering/projection of a registered Building remains owned by the existing Runtime/Render path; IM-16G owns only temporary player-facing result feedback.
- Frozen IM-16A remains placement-validity authority; IM-16B remains temporary Placement-state/world-target owner; IM-16C remains preview owner; IM-16D remains authoritative commit/registration seam; IM-16E remains Confirm/Cancel owner; IM-16F remains Building-selection/Placement-activation owner.
- Existing Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime and Domain ownership remains unchanged.

### Explicit exclusions

IM-16G does not introduce Building management/details after construction, costs or prices, Gold/resource deductions, construction progression, workers/production, demolition, upgrades, rotation, multi-cell footprints, new Building definitions/catalogue authority, new placement-validity rules, terrain/distance rules, SaveGame rearchitecture, Inspector mutation/editor behavior or any later IM-16 capability.

### Definition status

This step sets IM-16G only to **DEFINED / NOT IMPLEMENTED** against frozen IM-16F. No runtime, UI, Domain, test, CI, build-identity or Player-feedback implementation is part of this documentation step.

If IM-16G is later completed/frozen, the originally documented IM-16 end-to-end Player flow is structurally closed; Whole-Block completion must still be separately reconciled and must not be assumed automatically.

## 11. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A through IM-16F = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16G = DEFINED / NOT IMPLEMENTED.**

The next permissible step after this documentation change is exclusively the **IM-16G Documentation Verification / Finalization Gate** against frozen IM-16F `0cf69a9253b4ec503f9f1c5b8585721722851963`.

No IM-16G implementation and no later IM-16 capability is authorized here.

---

**Updated:** 2026-09-09 — IM-16G – Authoritative Construction Result Player UI Projection Contract documented as DEFINED / NOT IMPLEMENTED against frozen IM-16F. No IM-16G implementation.
