# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-16-player-construction-placement-integration`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.

Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

Frozen IM-16B marker: `frozen/im-16b-player-placement-interaction-state-world-target-contract`.

Frozen IM-16B head and exclusive IM-16C baseline: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

## 2. Binding ownership after frozen IM-16B

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the current supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and real world-target consumption.
- IM-15 remains observation/guidance except its already frozen diagnostic action allowlist.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

IM-16A and IM-16B are frozen. IM-16C is defined but not implemented. Later IM-16 capability remains separately gated.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16a-authoritative-construction-placement-contract`

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16b-player-placement-interaction-state-world-target-contract`

Frozen head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

Frozen IM-16B adds only the temporary Player Placement interaction-state and world-target seam above frozen IM-16A. It creates no Ghost/Preview, no Confirm/Commit and no Building mutation path.

## 6. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive baseline:** frozen IM-16B @ `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

### Leitfrage

„Wie wird der bereits vorhandene temporäre IM-16B-Placement-Zustand für den Spieler sichtbar in die Welt projiziert, sodass aktuelle Zielzelle und autoritatives VALID/INVALID-Ergebnis klar erkennbar sind, ohne Building-, Construction-, Placement-Validity- oder Commit-Authority zu übernehmen?“

### Goal

IM-16C defines only the player-visible projection of the already existing frozen-IM-16B placement state.

The preview may show the current real target cell and the immutable frozen-IM-16A validity result carried by frozen IM-16B. It remains temporary presentation only and does not become Building, Construction, Placement-validity or persistence truth.

### Binding preview and validity boundary

- Input is exclusively frozen IM-16B state: Building `definitionId`, current `targetCellId` when available and unchanged frozen-IM-16A evaluation when available.
- Existing camera-synchronous world projection remains the only visual geometry authority.
- The current real target cell may be visibly highlighted.
- `VALID` and `TARGET_CELL_OCCUPIED` must be visually distinguishable without duplicating or reinterpreting placement rules.
- `NO TARGET` or absent real target cell must not display a valid placement cell.
- Any Building Ghost/Preview is temporary render presentation only; it creates no Building/Domain entity and no Construction state.
- Placement validity remains exclusively frozen-IM-16A authority.
- Target state remains exclusively frozen-IM-16B authority.
- Camera pan/zoom must keep preview synchronized with the existing world projection.
- Existing Selection remains independent.
- Frozen IM-15 Inspector remains read-only and is not Player Placement Preview authority.

### Minimal visual scope

The initial preview is limited to target-cell highlight, a simple temporary building representation sufficient to show placement position, clear valid-versus-occupied/invalid distinction, and no-target suppression.

No final building art, construction animation, rotation, multi-cell footprint rendering or new placement-rule visualization is required by IM-16C.

### Explicit exclusions

IM-16C does **not** include:

- Confirm action,
- Commit action,
- actual Building creation/registration,
- consumption of `BuildingRegistrationWorldOwnership`,
- construction progression,
- cost/resource or Gold deduction,
- SaveGame persistence,
- new Building catalogue/menu architecture,
- new terrain/distance/resource/building-type placement rules,
- Building rotation,
- multi-cell footprints,
- new Camera control semantics,
- new Selection ownership,
- Inspector mutation paths,
- conversion of IM-15C diagnostic overlay into Player Placement authority.

Confirm/commit remains deferred to a later separately authorized IM-16 substep.

## 7. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16C – Player Placement Preview & Validity Projection Contract = DEFINED / NOT IMPLEMENTED.**

This documentation update authorizes no IM-16C implementation and no later IM-16 capability.

The next permissible action is exclusively the IM-16C Documentation Verification / Finalization Gate against frozen IM-16B @ `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2` and the resulting documentation HEAD on `feature/im-16-player-construction-placement-integration`. Only after PASS / 0 BLOCKER may IM-16C implementation be explicitly authorized.

---

**Updated:** 2026-09-09 — IM-16C Player Placement Preview & Validity Projection Contract documented as DEFINED / NOT IMPLEMENTED against frozen IM-16B. No implementation authorized in this step.
