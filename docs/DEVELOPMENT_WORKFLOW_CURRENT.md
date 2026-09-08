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
- **IM-16 – Player Construction & Placement Integration: DEFINED / NOT IMPLEMENTED**
- **IM-16A – Authoritative Construction Placement Contract: DEFINED / NOT IMPLEMENTED**

## 2. Frozen IM-15 chain

The five frozen substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Authoritative frozen IM-15 development baseline for IM-16: `9e797ab93036f6b3731442dc626edb8c091893c8`.

## 3. Frozen IM-15 capability boundary

IM-15 is a modular diagnostic/observation/guidance surface over existing authoritative runtime owners.

Frozen capabilities:

1. **IM-15A:** separate Inspector shell and read-only Runtime/World/Population/Gold/Selection observation.
2. **IM-15B:** structured read-only diagnostics for existing Buildings, Persons, Jobs, Resources, Movement/Navigation and Path Classification sources.
3. **IM-15C:** camera-synchronous read-only world diagnostic overlays for existing Path/ROAD cells, Building/Person identities, Carrier movement evidence and existing Selection.
4. **IM-15D:** explicit allowlist diagnostic actions only: `START`, `PAUSE`, `SINGLE_STEP`, `RESET_BASELINE_MINIWORLD`.
5. **IM-15E:** scheduler-synchronous bounded read-only Simulation Observation with immutable samples/deltas, session separation and hard history limit 120.

## 4. Binding ownership boundary after IM-15

- IM-15 owns no second gameplay/domain/persistence truth.
- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Observation surfaces are read-only except the explicitly allowlisted IM-15D action adapter.
- IM-15D exposes no arbitrary state editing, free step duration, fast-forward or generic Runtime/Store invocation.
- IM-15E metrics/deltas never feed back into gameplay, Runtime, Scheduler, Domain, Transport or persistence.
- Legacy Inspector/debug architecture from `main` was not imported.

## 5. IM-15 Whole-Block Completion / Regression / Freeze Gate

Whole-block regression against frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682` confirmed:

- pre-identity synchronization: **66 commits ahead / 0 behind**,
- after Whole-Block identity and initial freeze documentation: **72 commits ahead / 0 behind**,
- exactly **14 changed files** throughout,
- changed surfaces limited to control docs, Inspector/Diagnostics/UI, the active Runtime composition/integration in `src/main.js`, Build identity and the new diagnostic/scenario modules,
- no Domain owner source modification,
- no Transport owner source modification,
- no `src/runtime/runtime.js` modification,
- no `src/runtime/scheduler.js` modification.

Frozen A→E markers were re-verified at their exact authoritative heads before Whole-Block freeze.

## 6. Whole-Block regression evidence

The complete frozen evidence chain is binding and cumulative:

- IM-15A real iPhone evidence confirmed read-only Inspector basics and authoritative world/population/gold/selection projection.
- IM-15B real iPhone evidence confirmed structured read-only diagnostics and corrected visible Build identity.
- IM-15C real iPhone evidence confirmed PATH/ROAD, Building/Person IDs, Carrier relationship and camera-synchronous overlay behavior.
- IM-15D real iPad evidence confirmed `READY → START → RUNNING → PAUSE → PAUSED → SINGLE_STEP 100 ms → PAUSED → RESET_BASELINE_MINIWORLD` with the fixed action allowlist.
- IM-15E seven real iPad/Safari screenshots confirmed one sample per Scheduler step, pause stillness, exactly +1 sample/100 ms for SINGLE STEP, bounded history 120 and a new session after baseline reset.

Final Whole-Block technical evidence:

- CI Baseline `34274868699`: **SUCCESS**,
- Pages `34274915778` on Whole-Block documentation head `f0012a577e804684e0ece34f015492c06f375f56`: **SUCCESS**.

## 7. Whole-Block visible/build identity

Whole-Block visible/build identity:

`IM-15-GUIDANCE-INSPECTOR-WHOLE-BLOCK`

Visible verification state:

`IM-15 — COMPLETE / FROZEN / PASS / 0 BLOCKER`

The final synchronization changed only visible/gate/cache identity and added no new IM-15 capability.

## 8. Whole-Block exclusions remain binding

Not introduced by IM-15:

- arbitrary gameplay/domain editing,
- generic Runtime/Store method execution,
- unrestricted scenario authoring,
- fast-forward or repeated diagnostic stepping,
- configurable simulation speed/tick duration,
- automatic balancing/correction,
- diagnostic feedback into gameplay rules,
- SaveGame persistence of observation history,
- telemetry/upload,
- unbounded history,
- invented metrics,
- new Selection/Pointer/Touch/Camera semantics.

## 9. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / NOT IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

**Binding baseline:** exclusively frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`.

IM-16 establishes the first complete player-facing construction flow while preserving existing Runtime/Domain/Construction, SaveGame, Selection, Pointer/Touch, Camera and Inspector ownership. UI ownership remains limited to temporary player interaction and preview state.

Player-facing target flow:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

No legacy `main` BuildDock architecture is an implementation basis.

## 10. IM-16A – Authoritative Construction Placement Contract

**Status:** DEFINED / NOT IMPLEMENTED

### Leitfrage

„Wie wird eine gewünschte Gebäudeplatzierung erstmals als eindeutige Anfrage gegen die bestehende Map-/Building-Authority beschrieben und autoritativ als zulässig oder unzulässig bewertet, ohne dass Pointer-, UI- oder Preview-Zustand selbst über Gameplay-Gültigkeit entscheiden darf?“

### Ziel

IM-16A closes only the missing authoritative seam between a later player-facing placement interaction and the existing world/building owners.

A placement candidate refers to an existing Building `definitionId` and a real `MapStructure` cell. UI, Pointer/Touch and preview state may later submit or display such a candidate, but they never own the gameplay validity decision.

### Binding contract boundary

- Placement input is based on an existing Building `definitionId`.
- Placement target is a real `MapStructure` cell, not a screen coordinate.
- `MapStructure` remains owner of `cellId`, grid coordinates and world coordinates.
- Existing Building/Construction Domain ownership remains authoritative for the placement decision.
- The placement evaluation returns a clear immutable valid/invalid result containing the evaluated Building-definition and cell reference.
- An invalid request must not mutate Building, Construction, World or persistence state.
- A valid evaluation in IM-16A also does **not** create a Building.
- Existing `BuildingRegistrationWorldOwnership` remains the authoritative registration boundary and is not consumed until a later explicit confirm/commit step.
- IM-14 Pointer/Touch, Selection and Camera contracts are preserved unchanged.
- Screen/Pointer-to-cell interaction is outside IM-16A and belongs to a later integration step above this contract.
- Frozen IM-15 Inspector may later observe resulting state but receives no Placement mutation authority.

### Explicit exclusions

IM-16A does not introduce:

- player-facing Build menu or building picker,
- Placement Mode lifecycle,
- visual Placement Ghost/Preview,
- Pointer/Touch-to-cell controller,
- Confirm/Cancel flow,
- actual Building creation or registration,
- construction progression,
- cost/resource deduction,
- SaveGame changes,
- new Selection semantics,
- new Camera semantics,
- new Inspector mutation paths,
- broad new terrain/distance/resource/building-type placement rules not already supported by existing authoritative owners.

No speculative rule catalogue is authorized in IM-16A. The first implementation must remain limited to the narrow authoritative placement contract and only the minimum validation the current world/building model can actually support.

## 11. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / NOT IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = DEFINED / NOT IMPLEMENTED.**

This documentation step authorizes no IM-16A implementation and no later IM-16 substep.

The next permissible step after this documentation update is exclusively a separate IM-16A documentation verification/finalization gate against frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8` and the unchanged Whole-Block branch. Only after a clean gate may IM-16A implementation be explicitly authorized.

## 12. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-16A Authoritative Construction Placement Contract documented as DEFINED / NOT IMPLEMENTED on `feature/im-16-player-construction-placement-integration` against frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`. No implementation authorized in this step.
