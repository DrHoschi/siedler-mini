# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-16-player-construction-placement-integration`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Authoritative frozen IM-15 development baseline for IM-16: `9e797ab93036f6b3731442dc626edb8c091893c8`.

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.

Authoritative frozen IM-16A baseline for IM-16B: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

## 2. Frozen IM-15 capability set

- **IM-15A:** Inspector shell + read-only Runtime/World/Population/Gold/Selection observation.
- **IM-15B:** structured read-only Runtime diagnostics over existing authoritative sources.
- **IM-15C:** read-only camera-synchronous world diagnostic overlays.
- **IM-15D:** controlled allowlist actions `START`, `PAUSE`, `SINGLE_STEP`, `RESET_BASELINE_MINIWORLD` only.
- **IM-15E:** scheduler-synchronous bounded read-only Simulation Observation with immutable samples/deltas, session separation and history limit 120.

## 3. Binding ownership after IM-15

The frozen block preserves one authoritative Runtime/Domain/Transport/Scheduler/SaveGame/Selection/Camera ownership line. IM-15 remains observation/guidance except its already frozen diagnostic action allowlist.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

**Exclusive development baseline:** frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`.

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

The frozen IM-14 Player UI/Pointer/Touch/Selection/Camera boundaries are consumed, IM-13 SaveGame ownership is preserved, and frozen IM-15 Inspector/Diagnostics may observe resulting state but do not own construction.

## 5. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16a-authoritative-construction-placement-contract`

Frozen IM-16A establishes the immutable, mutation-free authoritative evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId` with current outcomes `VALID`, `TARGET_CELL_OCCUPIED` and `TARGET_CELL_NOT_FOUND`.

It creates no Building, consumes no `BuildingRegistrationWorldOwnership`, changes no SaveGame/Pointer/Selection/Camera/Inspector ownership and introduces no player-facing Placement Mode.

Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

## 6. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive baseline:** frozen IM-16A @ `5b19e57bd118d601a25c0ce042e123366e4869d0`.

### Leitfrage

„Wie hält die Player-Seite einen kontrollierten temporären Platzierungsvorgang aus gewählter Building-`definitionId` und aktuell anvisierter realer Weltzelle, ohne selbst Placement-Gültigkeit, Building-Erzeugung oder Domain-State zu besitzen?“

### Goal

IM-16B defines only the temporary Player Placement interaction state and the controlled world-target seam above frozen IM-16A.

The minimal state is either `INACTIVE` or an active placement context containing the existing Building `definitionId`, current authoritative `targetCellId` when a real map cell is targeted, and the current immutable IM-16A evaluation result when available.

### Binding ownership and targeting boundary

- Existing Building `definitionId` is only the selected building-type reference.
- `targetCellId` must resolve to a real `MapStructure` cell; screen coordinates are never placement authority.
- Frozen IM-14 unified WORLD Pointer/Touch input remains the single player world-input source.
- Existing Camera state/transform geometry remains authoritative for view transformation.
- IM-16B may consume only the inverse targeting seam needed for `screen/pointer → world target → MapStructure cell`; it must not create a second coordinate/camera truth.
- Placement valid/invalid comes exclusively from frozen IM-16A `AuthoritativeConstructionPlacementContract`.
- `VALID`, `TARGET_CELL_OCCUPIED` and `TARGET_CELL_NOT_FOUND` must not be duplicated or reinterpreted in Player state.
- The temporary Player Placement state performs no Building, Construction, World or persistence mutation.
- Existing Selection remains Selection only and does not become placement authority.
- Frozen IM-15 Inspector remains observer only.

### Gesture compatibility

Existing single-pointer pan, pinch pan/zoom and wheel zoom behavior must remain valid. Pan/pinch/wheel/cancelled gestures must never implicitly confirm placement. IM-16B may update a temporary target cell but introduces no commit action.

### Explicit exclusions

IM-16B does **not** include:

- new player-facing Build catalogue/menu architecture,
- visual Placement Ghost/Preview,
- Confirm action,
- actual Building creation/registration,
- consumption of `BuildingRegistrationWorldOwnership`,
- construction progression,
- cost/resource deduction,
- SaveGame persistence of placement interaction state,
- new terrain/distance/resource/building-type placement rules,
- new Selection ownership,
- new Camera control semantics,
- new Inspector mutation paths.

Confirm/commit remains deferred to a later separately authorized IM-16 substep.

## 7. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = DEFINED / NOT IMPLEMENTED.**

This documentation update authorizes no IM-16B implementation and no later IM-16 capability.

The next permissible action is exclusively the IM-16B Documentation Verification / Finalization Gate against frozen IM-16A @ `5b19e57bd118d601a25c0ce042e123366e4869d0` and the resulting documentation HEAD on `feature/im-16-player-construction-placement-integration`. Only after PASS / 0 BLOCKER may IM-16B implementation be explicitly authorized.

---

**Updated:** 2026-09-08 — IM-16B Player Placement Interaction State & World Target Contract documented as DEFINED / NOT IMPLEMENTED against frozen IM-16A. No implementation authorized in this step.
