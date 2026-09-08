# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-16-player-construction-placement-integration`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Authoritative frozen IM-15 development baseline for IM-16: `9e797ab93036f6b3731442dc626edb8c091893c8`.

## 2. Frozen IM-15 substep chain

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

## 3. Frozen IM-15 capability set

- **IM-15A:** Inspector shell + read-only Runtime/World/Population/Gold/Selection observation.
- **IM-15B:** structured read-only Runtime diagnostics over existing authoritative sources.
- **IM-15C:** read-only camera-synchronous world diagnostic overlays.
- **IM-15D:** controlled allowlist actions `START`, `PAUSE`, `SINGLE_STEP`, `RESET_BASELINE_MINIWORLD` only.
- **IM-15E:** scheduler-synchronous bounded read-only Simulation Observation with immutable samples/deltas, session separation and history limit 120.

## 4. Binding ownership after IM-15

IM-15 does not become a gameplay/domain/persistence owner.

The frozen block preserves:

- one authoritative active Runtime composition,
- existing Domain and Transport ownership,
- existing Runtime/Scheduler ownership,
- IM-14 Selection/Pointer/Touch/Camera ownership,
- SaveGame ownership,
- read-only observation except explicit IM-15D allowlist actions,
- no metrics/balancing feedback into simulation rules.

## 5. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

**Exclusive development baseline:** frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`.

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

The frozen IM-14 Player UI/Pointer/Touch/Selection/Camera boundaries are consumed, IM-13 SaveGame ownership is preserved, and frozen IM-15 Inspector/Diagnostics may observe resulting state but do not own construction.

## 6. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16a-authoritative-construction-placement-contract`

### Binding frozen capability

IM-16A establishes only the authoritative, mutation-free placement-evaluation seam between later Player Placement interaction and the existing Map/Building owners.

- Existing Building `definitionId` is carried as the building-type reference.
- A real `MapStructure` cell is the authoritative target; screen coordinates are not authoritative placement input.
- `MapStructure` remains owner of `cellId`, grid coordinates and world coordinates.
- Placement evaluation is immutable and returns one of the currently supported outcomes:
  - `VALID`
  - `TARGET_CELL_OCCUPIED`
  - `TARGET_CELL_NOT_FOUND`
- An existing Building with lifecycle `EXISTS` blocks its occupied target cell.
- A `RETIRED` Building does not block the cell.
- Evaluation performs no Building, Construction, World or persistence mutation.
- A valid evaluation does not create or register a Building.
- `BuildingRegistrationWorldOwnership` remains reserved for a later separately authorized confirm/commit integration.
- IM-14 Pointer/Touch, Selection and Camera ownership remains unchanged.
- IM-15 Inspector remains observer only and gains no placement mutation authority.

### Explicit frozen exclusions

IM-16A does **not** include:

- player-facing building picker or Build menu,
- Placement Mode lifecycle,
- Placement Ghost/Preview,
- Pointer/Touch-to-cell controller,
- Confirm/Cancel,
- actual Building registration/creation,
- construction progression,
- cost/resource deduction,
- SaveGame changes,
- new Selection or Camera semantics,
- new Inspector mutation paths,
- speculative terrain, distance, resource or building-type placement rule catalogues.

No legacy `main` BuildDock architecture was adopted.

## 7. IM-16A Completion / Regression / Freeze Gate

Full Whole-Block branch diff against frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8` was reviewed before freeze.

Pre-freeze implementation HEAD: `0a6d1dcd5f660e821d68b1dc1456d3636c26beea`.

At that implementation HEAD the branch was:

- **10 commits ahead / 0 behind** frozen IM-15,
- exactly **10 changed files** in the cumulative IM-16A branch diff,
- two files are the already verified IM-16/IM-16A control-documentation changes,
- eight files are limited to the IM-16A Domain contract, isolated self-test/runtime evidence, CI wiring and visible/build identity synchronization,
- no new IM-16B capability,
- no new player-facing placement interaction,
- no Building creation/registration path,
- no SaveGame, Pointer/Touch, Selection, Camera or Inspector mutation ownership change.

Technical evidence on exact implementation HEAD `0a6d1dcd5f660e821d68b1dc1456d3636c26beea`:

- CI Baseline `34279481109`: **SUCCESS**,
- Pages `34279480168`: **SUCCESS**,
- CI step `Run IM-16A + frozen predecessor regression`: **SUCCESS**.

Real-device evidence:

- real iPad/Safari screenshot on 2026-09-08 confirmed visible Build identity `IM-16A-AUTHORITATIVE-CONSTRUCTION-PLACEMENT-CONTRACT`,
- Empty Cell → `VALID`,
- Occupied Cell → `TARGET_CELL_OCCUPIED`,
- Missing Cell → `TARGET_CELL_NOT_FOUND`,
- Build Identity → PASS,
- existing IM-15 Inspector remained read-only and functional,
- no Building creation and no UI Placement Mode were present.

Gate result: **PASS / 0 BLOCKER**.

## 8. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The final IM-16A frozen marker must point at the final documentation HEAD produced by this freeze gate. Marker creation is a mechanical freeze operation only and introduces no capability.

No IM-16B implementation or later Player Placement functionality is authorized in this same step.

After the IM-16A frozen marker exists, the next permissible action is exclusively a separate reconciliation/definition of the next IM-16 substep against frozen IM-16A. No implementation is automatically authorized.

---

**Updated:** 2026-09-08 — IM-16A Authoritative Construction Placement Contract COMPLETE / FROZEN / PASS / 0 BLOCKER after full frozen-IM-15 diff review, successful CI/Pages and real iPad evidence. No IM-16B in this step.
