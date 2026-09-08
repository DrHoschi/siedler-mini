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

## 3. Binding ownership boundary

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the currently supported outcomes.
- IM-16B owns only temporary Player Placement interaction state and world-target consumption.
- Frozen IM-15 Inspector remains observer only.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

Target flow remains:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

Only IM-16A and IM-16B are frozen so far. No later IM-16 capability is authorized by this gate.

## 5. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16a-authoritative-construction-placement-contract`

Frozen head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

IM-16A remains the immutable, mutation-free placement-evaluation authority for an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 6. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16b-player-placement-interaction-state-world-target-contract`

### Frozen capability boundary

IM-16B establishes only temporary Player Placement interaction state plus camera-compatible targeting of real `MapStructure` cells.

- State is either `INACTIVE` or `ACTIVE`.
- Active state carries an existing Building `definitionId`, current `targetCellId` when available, and the immutable frozen-IM-16A evaluation result when available.
- Target resolution consumes the already camera-projected `grid-cell` render commands and accepts only `sourceId` values that exist in the real current `MapStructure` snapshot.
- No second camera transform or independent screen/world coordinate authority is introduced.
- Frozen IM-14 unified WORLD Pointer/Touch input remains the Player world-input source.
- Multi-touch samples are not used for Placement target updates.
- `pointercancel` causes no commit behavior.
- Existing Selection remains Selection only.
- Placement validity comes exclusively from frozen IM-16A.
- The interaction state is temporary and is not Domain or SaveGame truth.

### Frozen exclusions

IM-16B introduces none of the following:

- visual Placement Ghost/Preview,
- Confirm/Commit action,
- Building creation or registration,
- `BuildingRegistrationWorldOwnership` consumption,
- construction progression,
- cost/resource deduction,
- SaveGame persistence of Placement interaction state,
- new terrain/distance/resource/building-type placement rules,
- new Selection ownership,
- new Camera control semantics,
- new Inspector mutation paths.

## 7. IM-16B implementation surface

The implementation is limited to:

- `src/ui/player-placement-interaction-state-world-target.js`
- `src/dev/im-16b-self-test.js`
- `src/dev/im-16b-self-test.node.js`
- `src/im16b-runtime-evidence.js`
- CI wiring in `.github/workflows/ci.yml`
- visible/browser verification synchronization in `index.html`, `src/main.js` and `src/runtime/config.js`

No IM-16C implementation exists in this frozen scope.

## 8. IM-16B Completion / Regression / Freeze Gate

Frozen baseline: IM-16A @ `5b19e57bd118d601a25c0ce042e123366e4869d0`.

Pre-freeze IM-16B implementation HEAD: `8c926ae59fee2f42c7d6feb819f45eb1dcd8c1bb`.

Full cumulative diff from frozen IM-16A to that implementation HEAD was reviewed before freeze:

- **11 commits ahead / 0 behind**,
- merge base exactly frozen IM-16A,
- exactly **10 changed files**,
- two changed files are the already verified IM-16B control-documentation updates,
- eight changed files are the narrow IM-16B implementation/evidence/CI/visible-identity surface listed above,
- no unrelated Domain/Transport/Scheduler/SaveGame ownership expansion,
- no Ghost/Preview, Confirm/Commit or Building mutation path.

Technical evidence on exact implementation HEAD `8c926ae59fee2f42c7d6feb819f45eb1dcd8c1bb`:

- CI Baseline `34283207023`: **SUCCESS**,
- CI step `Run IM-16B + frozen predecessor regression`: **SUCCESS**,
- Pages `34283206512`: **SUCCESS**.

Real-device evidence on 2026-09-09:

- real iPad/Safari displayed Build identity `IM-16B-PLAYER-PLACEMENT-INTERACTION-STATE-WORLD-TARGET-CONTRACT`,
- visible runtime status `RUNNING`,
- browser evidence reported `IM-16B — PASS`,
- state lifecycle `INACTIVE → ACTIVE → INACTIVE` passed,
- free target cell → `VALID`,
- occupied target cell → `TARGET_CELL_OCCUPIED`,
- outside target → `NO TARGET`,
- no Building mutation,
- no Ghost/Preview,
- no Confirm/Commit,
- existing IM-15 Inspector remained visible/read-only.

**Gate result: PASS / 0 BLOCKER.**

## 9. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The final frozen marker `frozen/im-16b-player-placement-interaction-state-world-target-contract` must point at the final documentation HEAD produced by this closing gate. Marker creation is mechanical only and adds no capability.

No IM-16C implementation and no later Player Placement capability is authorized in this same step.

After the frozen marker exists, the next permissible action is exclusively reconciliation/definition of the next IM-16 substep against frozen IM-16B. No implementation is automatically authorized.

## 10. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-09 — IM-16B Player Placement Interaction State & World Target Contract COMPLETE / FROZEN / PASS / 0 BLOCKER after full frozen-IM-16A diff review, successful CI/Pages and real iPad evidence. No IM-16C in this step.
