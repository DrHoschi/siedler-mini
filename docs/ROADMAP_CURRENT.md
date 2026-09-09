# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16E COMPLETE / FROZEN / PASS / 0 BLOCKER  
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
Final frozen IM-16E head is the completion-documentation head after final-head CI/Pages verification and frozen-marker creation.

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

IM-16A through IM-16E are frozen. Any still-missing later IM-16 capability must be separately reconciled and defined against frozen IM-16E; this freeze step authorizes no later implementation.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16B adds only the temporary Player Placement interaction-state and world-target seam above frozen IM-16A.

## 6. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16C projects only the already existing frozen-IM-16B state into a temporary player-visible world preview. It owns no placement validity and no Building mutation.

Real iPhone tests also established that accumulated verification/inspector overlays are difficult to read on the narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and was not folded into IM-16E.

## 7. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

Frozen IM-16D introduces only the authoritative commit / Building registration seam behind the already frozen placement interaction and preview path. It performs final IM-16A revalidation immediately before mutation and registers through the existing Building owners.

## 8. IM-16E – Player Placement Confirm / Cancel Interaction Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16D @ `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

**Pre-freeze implementation/evidence head:** `b077553d9158c504ba5fb2b898732b651fe81054`.

### Frozen capability

IM-16E is limited to explicit Player-interaction orchestration between the already frozen owners:

`IM-16B Placement State → IM-16C Preview → Player CONFIRM → IM-16D authoritative Commit`

or:

`IM-16B Placement State → Player CANCEL → Placement State INACTIVE`

- Confirm requires active Placement and a real candidate with `definitionId` plus `targetCellId`.
- Preview/validity may guide the UI but is not mutation authority.
- Actual mutation goes only through frozen IM-16D, including final frozen-IM-16A revalidation immediately before mutation.
- Successful Confirm deactivates temporary Placement state after commit; rejected Confirm preserves Placement and the authoritative rejection reason.
- Cancel never commits and never mutates Building state; it only ends temporary Placement state.
- World pointer/touch and camera gestures remain non-commit paths.
- Existing Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime and Domain ownership remains unchanged.
- The player-facing surface contains exactly one Confirm/Cancel group after correction of the duplicate-control defect found during real iPhone verification.

### Verification evidence

Full frozen-IM-16D → pre-freeze-IM-16E diff: **13 commits ahead / 0 behind**, merge-base exactly frozen IM-16D, 10 changed files limited to the two control documents plus IM-16E implementation/evidence/CI/visible-entry-point surfaces.

CI run `34351027622` on `b077553d9158c504ba5fb2b898732b651fe81054`: **SUCCESS**, including `Run IM-16E + frozen predecessor regression`.

Pages run `34351026003` on the same head: **SUCCESS**.

Real iPhone/Safari evidence confirms visible IM-16E title and PASS, exact Build identity, occupied-target rejection with Placement preserved, free-target authoritative commit with Placement inactive, Cancel without Building mutation, no implicit world-pointer Confirm, Inspector `OBSERVATION READ ONLY`, and exactly one visible `Bestätigen / Abbrechen / Placement inaktiv` control group.

### Preserved exclusions

No new placement-validity rules, second Building creation/registration path, cost/resource/Gold deduction, construction progression, workforce/production integration, rotation, multi-cell footprint, new terrain/distance/resource/building-type rules, Camera/Selection ownership, Inspector mutation/editor path, SaveGame rearchitecture, implicit world-tap commit, complete Building catalogue/management UI, legacy `main` BuildDock/gameplay reuse or later IM-16 substep implementation is introduced.

## 9. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A through IM-16E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

IM-16E completion documentation is synchronized after full-diff, automated regression and real iPhone/Safari verification. Final frozen-marker creation is permitted only after CI and Pages succeed on the resulting final documentation head.

No later IM-16 substep is implemented or authorized here. After frozen IM-16E is verified, the next permissible action is exclusively reconciliation/definition of the next still-missing IM-16 capability against frozen IM-16E.

---

**Updated:** 2026-09-09 — IM-16E Completion / Regression / Freeze Gate synchronized. No later IM-16 substep implemented.
