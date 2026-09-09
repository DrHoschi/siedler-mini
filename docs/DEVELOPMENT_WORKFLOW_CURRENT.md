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
- **IM-16C – Player Placement Preview & Validity Projection Contract: DEFINED / NOT IMPLEMENTED**

## 2. Frozen predecessor chain

Frozen IM-15 substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.

Frozen IM-16A baseline for IM-16B: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

Frozen IM-16B marker: `frozen/im-16b-player-placement-interaction-state-world-target-contract`.

Authoritative frozen IM-16B baseline for IM-16C: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

## 3. Binding ownership boundary

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the currently supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and world-target consumption.
- Frozen IM-15 Inspector remains observer only.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

Target flow remains:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

IM-16A and IM-16B are frozen. IM-16C is defined but not implemented. No later IM-16 capability is authorized by this documentation step.

## 5. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16a-authoritative-construction-placement-contract`

Frozen head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

IM-16A remains the immutable, mutation-free placement-evaluation authority for an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 6. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16b-player-placement-interaction-state-world-target-contract`

Frozen head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

IM-16B establishes only temporary Player Placement interaction state plus camera-compatible targeting of real `MapStructure` cells. State is `INACTIVE` or `ACTIVE`; active state carries Building `definitionId`, current `targetCellId` when available and the immutable frozen-IM-16A evaluation result when available. It creates no Building, no Ghost/Preview and no Confirm/Commit path.

## 7. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive baseline:** frozen IM-16B @ `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

### Leitfrage

„Wie wird der bereits vorhandene temporäre IM-16B-Placement-Zustand für den Spieler sichtbar in die Welt projiziert, sodass aktuelle Zielzelle und autoritatives VALID/INVALID-Ergebnis klar erkennbar sind, ohne Building-, Construction-, Placement-Validity- oder Commit-Authority zu übernehmen?“

### Ziel

IM-16C defines only the player-visible projection of the already existing frozen-IM-16B placement interaction state.

The Player side may visually project the current real target cell and the immutable frozen-IM-16A validity result carried by frozen IM-16B. The preview is temporary presentation only and does not become Building, Construction, Placement-validity or persistence truth.

### Binding preview and validity boundary

- Input is exclusively the frozen-IM-16B state containing `definitionId`, current `targetCellId` when available and the unchanged frozen-IM-16A evaluation result when available.
- The preview must use the already camera-synchronous world projection; it must not create a second camera transform or coordinate truth.
- The current real target cell may be visibly highlighted.
- `VALID` and `TARGET_CELL_OCCUPIED` must be visually distinguishable without re-evaluating or reinterpreting their rules.
- `NO TARGET` or an absent real target cell must not display a valid placement cell.
- Any Building Ghost/Preview is temporary render presentation only. It must not create a Building entity, Domain entity or Construction state.
- Placement validity remains exclusively owned by frozen IM-16A.
- Target state remains exclusively supplied by frozen IM-16B.
- Camera pan/zoom must keep the preview synchronized with the existing world projection.
- Existing Selection remains independent and does not become preview or placement authority.
- Frozen IM-15 Inspector remains read-only and is not the owner of Player Placement Preview.

### Minimal visual scope

The first IM-16C preview is intentionally narrow:

- current target-cell highlight,
- simple temporary building representation sufficient to identify placement position,
- clear visual distinction between valid and occupied/invalid target result,
- no-target suppression when no real cell is targeted.

This contract does not require final building art, construction animation, rotation, multi-cell footprint rendering or additional placement-rule visualization.

### Explicit exclusions

IM-16C does **not** introduce:

- Confirm action,
- Commit action,
- actual Building creation or registration,
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
- conversion of the IM-15C diagnostic overlay into Player Placement authority.

Confirm/commit remains deferred to a later separately authorized IM-16 substep.

## 8. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16C – Player Placement Preview & Validity Projection Contract = DEFINED / NOT IMPLEMENTED.**

This documentation update authorizes no IM-16C implementation and no later IM-16 capability.

The next permissible action is exclusively the IM-16C Documentation Verification / Finalization Gate against frozen IM-16B @ `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2` and the resulting documentation HEAD on `feature/im-16-player-construction-placement-integration`. Only after PASS / 0 BLOCKER may IM-16C implementation be explicitly authorized.

## 9. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-09 — IM-16C Player Placement Preview & Validity Projection Contract documented as DEFINED / NOT IMPLEMENTED against frozen IM-16B. No implementation authorized in this step.
