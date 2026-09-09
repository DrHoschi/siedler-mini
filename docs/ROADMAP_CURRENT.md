# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16E COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16F COMPLETE / FROZEN / PASS / 0 BLOCKER  
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
Frozen IM-16E marker: `frozen/im-16e-player-placement-confirm-cancel-interaction-contract`.
Frozen IM-16E head and exclusive IM-16F baseline: `a943ac93554e32a8909be2d44ae2d327dd044d58`.

IM-16F pre-freeze implementation/evidence head: `e3685a4f826c4897224d89ee4ecc2900feb7977f`.
Final frozen IM-16F head is the completion-documentation head after final-head CI/Pages verification and frozen-marker creation.

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
- Frozen IM-16F owns only the narrow Player Building selection / Placement activation seam: bounded known/testable options `HQ`, `WOODCUTTER`, `STOREHOUSE` → frozen IM-16B `activate(definitionId)`.
- IM-16F does not own Building definitions, placement validity, Building mutation, registration, commit, Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime or Domain truth and does not introduce an authoritative Building-definition registry.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

IM-16A through IM-16F are complete/frozen after this gate. No later IM-16 capability is authorized by the IM-16F freeze; the next capability must be separately reconciled against frozen IM-16F.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16B adds only the temporary Player Placement interaction-state and world-target seam above frozen IM-16A.

## 6. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16C projects only the already existing frozen-IM-16B state into a temporary player-visible world preview. It owns no placement validity and no Building mutation.

Real iPhone tests also established that accumulated verification/inspector overlays are difficult to read on the narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and was not folded into IM-16E or IM-16F.

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

## 9. IM-16F – Player Building Selection & Placement Activation Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16E @ `a943ac93554e32a8909be2d44ae2d327dd044d58`.

**Pre-freeze implementation/evidence head:** `e3685a4f826c4897224d89ee4ecc2900feb7977f`.

### Purpose

IM-16F fills the remaining Player-entry gap before frozen IM-16B:

`Player Building Selection → existing definitionId → frozen IM-16B activate(definitionId) → ACTIVE Placement State`.

The player receives a controlled, narrow selection of already known/testable Building definition IDs. Selecting one option activates the already frozen Placement flow; the selection layer itself does not become Building, validity, construction or persistence authority.

### Contract boundary

- Explicit Player selection yields exactly one existing/non-empty `definitionId`.
- The bounded Player selection source exposes `HQ`, `WOODCUTTER` and `STOREHOUSE` only.
- The selected `definitionId` is handed only to frozen IM-16B `activate(definitionId)`.
- A successful selection produces frozen IM-16B state `ACTIVE` for that definition.
- Selecting another available Building option replaces the temporary selected definition only by another call to frozen IM-16B `activate(...)`.
- An unavailable option is rejected with `BUILDING_OPTION_NOT_AVAILABLE` and causes no Placement activation.
- The selection action itself performs no validity evaluation, Building mutation, registration or commit.
- Frozen IM-16A remains sole placement-validity authority; IM-16B remains temporary Placement-state/world-target owner; IM-16C remains preview owner; IM-16D remains commit owner; IM-16E remains Confirm/Cancel owner.
- Cancel semantics stay unchanged under frozen IM-16E.
- IM-16F does not create a new authoritative Building-definition registry.
- Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime and Domain ownership remains unchanged.

### Verification evidence

Full frozen-IM-16E → pre-freeze-IM-16F diff: **12 commits ahead / 0 behind**, merge-base exactly frozen IM-16E, 10 changed files limited to the two control documents plus IM-16F selection implementation, self-test/evidence, visible entry-point/build identity and CI regression surfaces.

CI run `34355853367` on `e3685a4f826c4897224d89ee4ecc2900feb7977f`: **SUCCESS**, including `Run IM-16F + frozen predecessor regression`.

Pages run `34355852082` on the same head: **SUCCESS**.

Four fresh real iPhone/Safari screenshots confirm visible `IM-16F — PASS`, exact Build identity `IM-16F-PLAYER-BUILDING-SELECTION-PLACEMENT-ACTIVATION-CONTRACT`, the Player options `Hauptquartier`, `Holzfäller`, `Lagerhaus`, `HQ · PLACEMENT ACTIVE`, switch to `WOODCUTTER · PLACEMENT ACTIVE`, inactive `Gebäude wählen` / `Placement inaktiv`, unchanged explicit Confirm/Cancel behavior, successful existing flow `COMMITTED building:00000004`, Inspector `OBSERVATION READ ONLY`, and Runtime state transitions between `RUNNING` and `READY` independent of IM-16F selection.

The narrow-phone verification/Inspector overlap remains the previously documented **NON-BLOCKING later UI/readability need**.

### Explicit exclusions

No complete Building catalogue/management UI, categories, search, favourites, unlocks/tech tree, costs, resource/Gold deductions, production/workforce data, construction progression, rotation, multi-cell footprints, new placement-validity rules, terrain/distance/resource/building-type rules, SaveGame rearchitecture, Inspector mutation, second Building-definition authority, legacy `main` BuildDock/gameplay reuse or later IM-16 capability is introduced.

## 10. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A through IM-16F = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

IM-16F completion documentation is synchronized after full-diff, automated regression and real iPhone/Safari verification. Final frozen-marker creation is permitted only after CI and Pages succeed on the exact resulting final documentation head.

No IM-16G or later IM-16 capability is implemented or authorized here. After frozen IM-16F is verified, the next permissible action is exclusively reconciliation/definition of the next still-missing IM-16 capability against frozen IM-16F.

---

**Updated:** 2026-09-09 — IM-16F Completion / Regression / Freeze Gate synchronized. No later IM-16 capability implemented.
