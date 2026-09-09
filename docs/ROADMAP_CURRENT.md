# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16E COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16F DEFINED / NOT IMPLEMENTED  
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
Frozen IM-16D head: `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

Frozen IM-16E marker: `frozen/im-16e-player-placement-confirm-cancel-interaction-contract`.
Frozen IM-16E head and exclusive IM-16F baseline: `a943ac93554e32a8909be2d44ae2d327dd044d58`.

## 2. Binding ownership after IM-16E completion

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

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

IM-16A through IM-16E are frozen. IM-16F is defined only; no implementation is authorized by this documentation step.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16B adds only the temporary Player Placement interaction-state and world-target seam above frozen IM-16A.

## 6. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16C projects only the already existing frozen-IM-16B state into a temporary player-visible world preview. It owns no placement validity and no Building mutation.

Real iPhone tests also established that accumulated verification/inspector overlays are difficult to read on the narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and is not folded into IM-16F.

## 7. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

Frozen IM-16D introduces only the authoritative commit / Building registration seam behind the already frozen placement interaction and preview path. It performs final IM-16A revalidation immediately before mutation and registers through the existing Building owners.

## 8. IM-16E – Player Placement Confirm / Cancel Interaction Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `a943ac93554e32a8909be2d44ae2d327dd044d58`.

Frozen IM-16E is limited to explicit Player Confirm/Cancel orchestration. Confirm consumes frozen IM-16D; Cancel deactivates temporary Placement state; world pointer/touch and camera gestures remain non-commit paths.

## 9. IM-16F – Player Building Selection & Placement Activation Contract

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive baseline:** frozen IM-16E @ `a943ac93554e32a8909be2d44ae2d327dd044d58`.

### Purpose

IM-16F fills the remaining Player-entry gap before frozen IM-16B:

`Player Building Selection → existing definitionId → frozen IM-16B activate(definitionId) → ACTIVE Placement State`.

The player receives a controlled, narrow selection of already known/testable Building definition IDs. Selecting one option activates the already frozen Placement flow; the selection layer itself does not become Building, validity, construction or persistence authority.

### Contract boundary

- Explicit Player selection yields exactly one existing/non-empty `definitionId`.
- The selected `definitionId` is handed only to frozen IM-16B `activate(definitionId)`.
- A successful selection produces frozen IM-16B state `ACTIVE` for that definition.
- Selecting another available Building option may replace the temporary selected definition only by another call to frozen IM-16B `activate(...)`.
- The selection action itself performs no validity evaluation, Building mutation, registration or commit.
- Frozen IM-16A remains sole placement-validity authority; IM-16B remains temporary Placement-state/world-target owner; IM-16C remains preview owner; IM-16D remains commit owner; IM-16E remains Confirm/Cancel owner.
- Cancel semantics stay unchanged under frozen IM-16E.
- IM-16F must not create a new authoritative Building-definition registry. Its selection source is intentionally narrow and limited to already known/testable definition IDs.
- Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime and Domain ownership remains unchanged.

### Explicit exclusions

No complete Building catalogue/management UI, categories, search, favourites, unlocks/tech tree, costs, resource/Gold deductions, production/workforce data, construction progression, rotation, multi-cell footprints, new placement-validity rules, terrain/distance/resource/building-type rules, SaveGame rearchitecture, Inspector mutation, second Building-definition authority, legacy `main` BuildDock/gameplay reuse or later IM-16 capability is introduced.

### Definition status

This reconciliation/documentation step sets IM-16F only to **DEFINED / NOT IMPLEMENTED** against frozen IM-16E. No runtime/UI/Domain/test/CI/build-identity implementation is part of this step.

## 10. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A through IM-16E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16F = DEFINED / NOT IMPLEMENTED.**

The next permissible step is exclusively the IM-16F Documentation Verification / Finalization Gate against frozen IM-16E. No IM-16F implementation is authorized here.

---

**Updated:** 2026-09-09 — IM-16F – Player Building Selection & Placement Activation Contract documented as DEFINED / NOT IMPLEMENTED against frozen IM-16E. No IM-16F implementation.
