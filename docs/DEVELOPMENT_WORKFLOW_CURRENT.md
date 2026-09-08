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

## 2. Frozen predecessor chain

Frozen IM-15 substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Authoritative frozen IM-15 development baseline for IM-16: `9e797ab93036f6b3731442dc626edb8c091893c8`.

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

No IM-16B implementation exists in this frozen scope.

## 7. IM-16A Completion / Regression / Freeze Gate

Full cumulative branch diff against frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8` was reviewed before freeze.

Pre-freeze implementation HEAD: `0a6d1dcd5f660e821d68b1dc1456d3636c26beea`.

At that implementation HEAD:

- branch status: **10 commits ahead / 0 behind**,
- exactly **10 changed files** against frozen IM-15,
- two changed files are the previously verified IM-16/IM-16A control-documentation changes,
- eight changed files are the narrow IM-16A implementation/evidence/CI/visible-identity surface listed above,
- no unrelated Domain/Transport/Runtime/Scheduler/SaveGame owner expansion,
- no Player Placement interaction beyond read-only authoritative evaluation.

Technical evidence on exact implementation HEAD `0a6d1dcd5f660e821d68b1dc1456d3636c26beea`:

- CI Baseline `34279481109`: **SUCCESS**,
- CI step `Run IM-16A + frozen predecessor regression`: **SUCCESS**,
- Pages `34279480168`: **SUCCESS**.

Real-device evidence on 2026-09-08:

- real iPad/Safari displayed Build identity `IM-16A-AUTHORITATIVE-CONSTRUCTION-PLACEMENT-CONTRACT`,
- Empty Cell → `VALID`,
- Occupied Cell → `TARGET_CELL_OCCUPIED`,
- Missing Cell → `TARGET_CELL_NOT_FOUND`,
- Build Identity → PASS,
- existing IM-15 Inspector remained functional/read-only,
- no Building creation and no UI Placement Mode were present.

**Gate result: PASS / 0 BLOCKER.**

## 8. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The final frozen marker `frozen/im-16a-authoritative-construction-placement-contract` must point at the final documentation HEAD produced by this closing gate. Its creation is a mechanical freeze operation only and adds no capability.

No IM-16B implementation and no further Player Placement function is authorized in this step.

After the frozen marker exists, the next permissible action is exclusively reconciliation/definition of the next IM-16 substep against frozen IM-16A. No implementation is automatically authorized.

## 9. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-16A Authoritative Construction Placement Contract COMPLETE / FROZEN / PASS / 0 BLOCKER after complete frozen-IM-15 diff review, successful CI/Pages and real iPad evidence. No IM-16B in this step.
