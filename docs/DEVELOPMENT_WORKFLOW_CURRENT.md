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
- **IM-16B – Player Placement Interaction State & World Target Contract: DEFINED / NOT IMPLEMENTED**

## 2. Frozen predecessor chain

Frozen IM-15 substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Authoritative frozen IM-15 development baseline for IM-16: `9e797ab93036f6b3731442dc626edb8c091893c8`.

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.

Authoritative frozen IM-16A baseline for IM-16B: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

## 3. Binding ownership boundary after IM-15

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- IM-15 remains diagnostic/observation/guidance only, except its previously frozen explicit diagnostic allowlist.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

**Binding baseline:** exclusively frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`.

IM-16 establishes the first complete player-facing construction flow while preserving existing Runtime/Domain/Construction, SaveGame, Selection, Pointer/Touch, Camera and Inspector ownership. UI ownership remains limited to temporary player interaction/preview state when later substeps are separately authorized.

Target flow remains:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

No legacy `main` BuildDock architecture is an implementation basis.

## 5. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16a-authoritative-construction-placement-contract`

### Frozen capability boundary

IM-16A closes only the authoritative placement-evaluation seam between a later player-facing placement interaction and the existing world/building owners.

- Building type input is an existing non-empty Building `definitionId` reference; IM-16A invents no new Building definition registry.
- Placement target is a real `MapStructure` cell identified by authoritative `cellId`.
- `MapStructure` remains owner of `cellId`, grid coordinates and world coordinates.
- Evaluation is immutable and currently returns only:
  - `VALID`
  - `TARGET_CELL_OCCUPIED`
  - `TARGET_CELL_NOT_FOUND`
- Existing Building lifecycle `EXISTS` blocks the occupied cell.
- A `RETIRED` Building does not block the cell.
- Invalid and valid evaluation perform no Building, Construction, World or persistence mutation.
- Valid evaluation does not create or register a Building.
- Existing `BuildingRegistrationWorldOwnership` remains reserved for a later separately authorized confirm/commit step.
- IM-14 Pointer/Touch, Selection and Camera contracts remain unchanged.
- Frozen IM-15 Inspector remains observer only and gains no Placement mutation authority.

### Frozen exclusions

IM-16A introduces none of the following:

- player-facing Build menu/building picker,
- Placement Mode lifecycle,
- visual Placement Ghost/Preview,
- Pointer/Touch-to-cell controller,
- Confirm/Cancel flow,
- actual Building creation/registration,
- construction progression,
- cost/resource deduction,
- SaveGame changes,
- new Selection semantics,
- new Camera semantics,
- new Inspector mutation paths,
- speculative terrain/distance/resource/building-type placement rule catalogues.

## 6. IM-16A implementation surface

The implementation remains deliberately narrow:

- `src/domain/authoritative-construction-placement-contract.js`
- `src/dev/im-16a-self-test.js`
- `src/dev/im-16a-self-test.node.js`
- `src/im16a-runtime-evidence.js`
- CI wiring in `.github/workflows/ci.yml`
- visible/browser verification synchronization in `index.html`, `src/main.js` and `src/runtime/config.js`

## 7. IM-16A Completion / Regression / Freeze Gate

Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

The completed gate confirmed the cumulative IM-16A branch scope against frozen IM-15, successful CI/Pages and real iPad evidence. IM-16A is bindingly **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

## 8. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive baseline:** frozen IM-16A @ `5b19e57bd118d601a25c0ce042e123366e4869d0`.

### Leitfrage

„Wie hält die Player-Seite einen kontrollierten temporären Platzierungsvorgang aus gewählter Building-`definitionId` und aktuell anvisierter realer Weltzelle, ohne selbst Placement-Gültigkeit, Building-Erzeugung oder Domain-State zu besitzen?“

### Ziel

IM-16B defines only the temporary Player Placement interaction state and the controlled world-target seam above frozen IM-16A.

The Player side may carry a selected existing Building `definitionId`, derive a current real world target cell from the already frozen IM-14 WORLD input plus authoritative camera geometry, and display/retain the immutable evaluation returned by frozen IM-16A. It does not become owner of placement validity, Building creation, Construction state or persistence.

### Binding interaction state

The minimal Player Placement state is either:

- `INACTIVE`, or
- an active placement context containing:
  - existing Building `definitionId`,
  - current authoritative `targetCellId` when a real map cell is targeted,
  - the current immutable IM-16A placement-evaluation result when available.

This state is temporary Player interaction state only and is not Domain or SaveGame truth.

### Binding ownership and targeting boundary

- Existing Building `definitionId` remains only the chosen building-type reference.
- `targetCellId` must resolve to a real `MapStructure` cell; raw screen coordinates are never placement authority.
- Frozen IM-14 unified WORLD Pointer/Touch input remains the single Player world-input source.
- Existing Camera state and camera transform geometry remain authoritative for view transformation.
- IM-16B may consume only the inverse targeting seam needed to derive `screen/pointer → world target → MapStructure cell`; it must not create a second camera or coordinate truth.
- Placement valid/invalid comes exclusively from frozen IM-16A `AuthoritativeConstructionPlacementContract`.
- IM-16B must not duplicate or reinterpret `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND` rules.
- The temporary Player Placement state must not mutate Building, Construction, World or persistence state.
- Existing Selection remains Selection only and must not become a second placement authority.
- Frozen IM-15 Inspector remains observer only and receives no new mutation path.

### Binding gesture compatibility

- Existing single-pointer pan, pinch pan/zoom and wheel zoom behavior must remain valid.
- A pan, pinch, wheel or cancelled gesture must not implicitly confirm a placement.
- IM-16B may determine/update the current target cell for temporary placement state, but it introduces no placement commit action.

### Explicit exclusions

IM-16B does **not** introduce:

- new player-facing Build catalogue/menu architecture,
- visual Placement Ghost/Preview rendering,
- Confirm action,
- Cancel action UI/flow beyond any purely internal state-reset contract that may later be separately authorized,
- actual Building creation or registration,
- consumption of `BuildingRegistrationWorldOwnership`,
- construction progression,
- cost/resource deduction,
- SaveGame persistence of placement interaction state,
- new terrain/distance/resource/building-type placement rules,
- new Selection ownership,
- new Camera control semantics,
- new Inspector mutation paths.

Confirm/commit remains explicitly deferred to a later separately authorized IM-16 substep.

## 9. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = DEFINED / NOT IMPLEMENTED.**

This documentation update authorizes no IM-16B implementation and no later IM-16 capability.

The next permissible action is exclusively the IM-16B Documentation Verification / Finalization Gate against frozen IM-16A @ `5b19e57bd118d601a25c0ce042e123366e4869d0` and the resulting documentation HEAD on `feature/im-16-player-construction-placement-integration`. Only after PASS / 0 BLOCKER may IM-16B implementation be explicitly authorized.

## 10. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-16B Player Placement Interaction State & World Target Contract documented as DEFINED / NOT IMPLEMENTED against frozen IM-16A. No implementation authorized in this step.
