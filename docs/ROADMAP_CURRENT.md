# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16E DEFINED / NOT IMPLEMENTED  
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

## 2. Binding ownership after frozen IM-16D

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the current supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and real world-target consumption.
- Frozen IM-16C owns only temporary player-visible Placement Preview / Validity projection.
- Frozen IM-16D owns only the authoritative commit seam that revalidates through IM-16A and then uses existing Building Domain identity/lifecycle/store ownership plus `BuildingRegistrationWorldOwnership`.
- Existing Building Domain remains sole owner of stable Building identity/lifecycle and Building-store mutation.
- `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- IM-15 remains observation/guidance except its already frozen diagnostic action allowlist.
- IM-15C diagnostic overlay remains read-only and is not Player Placement authority.
- No Player Confirm/Cancel implementation exists yet.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

IM-16A, IM-16B, IM-16C and IM-16D are frozen. IM-16E is defined but not implemented. Later IM-16 capability remains separately gated.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16B adds only the temporary Player Placement interaction-state and world-target seam above frozen IM-16A.

## 6. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16C projects only the already existing frozen-IM-16B state into a temporary player-visible world preview. It owns no placement validity and no Building mutation.

Real iPhone tests also established that accumulated verification/inspector overlays are difficult to read on the narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and is not folded into IM-16E.

## 7. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

Frozen IM-16D introduces only the authoritative commit / Building registration seam behind the already frozen placement interaction and preview path. It performs final IM-16A revalidation immediately before mutation and registers through the existing Building owners. It includes no Player Confirm/Cancel or implicit live commit trigger.

## 8. IM-16E – Player Placement Confirm / Cancel Interaction Contract

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive baseline:** frozen IM-16D @ `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

### Leitfrage

„Wie darf der Spieler eine bereits vorbereitete Platzierung ausdrücklich bestätigen oder abbrechen, sodass Confirm ausschließlich den eingefrorenen autoritativen IM-16D-Commit aufruft und Cancel ausschließlich den temporären Placement-Zustand beendet, ohne eine zweite Placement-, Validity-, Building- oder Mutation-Authority einzuführen?“

### Defined capability

IM-16E is limited to explicit Player-interaction orchestration between the already frozen owners:

`IM-16B Placement State → IM-16C Preview → Player CONFIRM → IM-16D authoritative Commit`

or:

`IM-16B Placement State → Player CANCEL → Placement State INACTIVE`

- `CONFIRM` must be an explicit Player action.
- `CONFIRM` may run only while Placement is active and a real candidate with `definitionId` plus `targetCellId` exists.
- Preview/validity state may guide the UI but is not mutation authority.
- Actual mutation must go only through frozen IM-16D; IM-16D performs final frozen-IM-16A revalidation immediately before mutation.
- A successful commit may be followed by controlled deactivation of temporary Placement state; the created Building remains owned by the frozen Building/registration owners.
- A rejected commit preserves the authoritative IM-16D / IM-16A reason; IM-16E creates no second validity semantic.
- `CANCEL` never commits and never mutates Building state; it only ends the temporary Placement state and preview.
- `pointerup`, ordinary world tap, drag end, pan, pinch and `pointercancel` are not implicit confirm triggers.
- Existing Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime and Domain ownership remains unchanged.

### Defined exclusions

IM-16E includes no new placement-validity rules, no second Building creation/registration path, no cost/resource/Gold deduction, no construction progression, no workforce/production integration, no Building rotation, no multi-cell footprints, no new terrain/distance/resource/building-type rules, no Camera/Selection ownership change, no Inspector mutation/editor path, no SaveGame rearchitecture, no implicit world-tap commit, no complete Building catalogue/management UI and no legacy `main` BuildDock/gameplay reuse.

## 9. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16C – Player Placement Preview & Validity Projection Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16D – Authoritative Placement Commit & Building Registration Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16E – Player Placement Confirm / Cancel Interaction Contract = DEFINED / NOT IMPLEMENTED.**

This documentation update authorizes no IM-16E implementation.

The next permissible action is exclusively the IM-16E Documentation Verification / Finalization Gate against frozen IM-16D @ `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1` and the resulting documentation HEAD on `feature/im-16-player-construction-placement-integration`. Only after PASS / 0 BLOCKER may IM-16E implementation be explicitly authorized.

---

**Updated:** 2026-09-09 — IM-16E Player Placement Confirm / Cancel Interaction Contract documented as DEFINED / NOT IMPLEMENTED against frozen IM-16D. No IM-16E implementation in this step.
