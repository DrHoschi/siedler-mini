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
- **IM-16C – Player Placement Preview & Validity Projection Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen predecessor chain

Frozen IM-15 substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.
Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

Frozen IM-16B marker: `frozen/im-16b-player-placement-interaction-state-world-target-contract`.
Frozen IM-16B head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

The IM-16C frozen marker must point at the final documentation HEAD produced by this closing gate after final CI/Pages verification.

## 3. Binding ownership boundary after IM-16C

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the currently supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and world-target consumption.
- Frozen IM-16C owns only temporary Player Placement Preview / Validity projection.
- Frozen IM-15 Inspector remains observer only; IM-15C diagnostic overlay is not Player Placement authority.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

Target flow remains:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

IM-16A, IM-16B and IM-16C are frozen. No later IM-16 capability is authorized by this gate.

## 5. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

IM-16A remains the immutable, mutation-free placement-evaluation authority for an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 6. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

IM-16B establishes only temporary Player Placement interaction state plus camera-compatible targeting of real `MapStructure` cells. It creates no Building and no Confirm/Commit path.

## 7. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16B @ `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

### Frozen capability boundary

IM-16C adds only player-visible projection of the already existing IM-16B placement state.

- Input is exclusively frozen IM-16B state containing Building `definitionId`, current real `targetCellId` when available and unchanged frozen-IM-16A evaluation when available.
- Existing camera-synchronous projected world geometry remains the only visual geometry authority.
- Current target cell is visibly highlighted.
- `VALID` and `TARGET_CELL_OCCUPIED` are visually distinguishable without duplicating or reinterpreting placement rules.
- `NO TARGET` suppresses the Player Preview.
- Any Building Ghost is temporary render presentation only and creates no Building entity, Domain entity or Construction state.
- Camera pan/zoom keeps preview synchronized with existing world projection.
- Existing Selection remains independent.
- Frozen IM-15 Inspector remains read-only.

### Frozen exclusions

IM-16C introduces none of the following:

- Confirm action,
- Commit action,
- actual Building creation or registration,
- `BuildingRegistrationWorldOwnership`,
- construction progression,
- cost/resource or Gold deduction,
- SaveGame persistence,
- new Building catalogue/menu architecture,
- new terrain/distance/resource/building-type placement rules,
- Building rotation,
- multi-cell footprints,
- new Camera control semantics,
- new Selection ownership,
- Inspector mutation paths.

## 8. IM-16C implementation surface

The implementation is limited to:

- `src/ui/player-placement-preview-validity-projection.js`
- `src/dev/im-16c-self-test.js`
- `src/dev/im-16c-self-test.node.js`
- `src/im16c-runtime-evidence.js`
- CI wiring in `.github/workflows/ci.yml`
- visible/browser verification synchronization in `index.html`, `src/main.js` and `src/runtime/config.js`

No IM-16D implementation exists in this frozen scope.

## 9. IM-16C Completion / Regression / Freeze Gate

Frozen baseline: IM-16B @ `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

Pre-freeze IM-16C implementation HEAD: `77e1c75d361f0a816d84411f9c4e402b4b4c0142`.

Full cumulative diff from frozen IM-16B to that implementation HEAD was reviewed before freeze:

- **10 commits ahead / 0 behind**,
- merge base exactly frozen IM-16B,
- exactly **10 changed files**,
- two changed files are the already verified IM-16C control-documentation updates,
- eight changed files are the narrow IM-16C implementation/evidence/CI/visible-identity surface listed above,
- no unrelated Domain/Transport/Scheduler/SaveGame ownership expansion,
- no Confirm/Commit and no Building creation path.

Technical evidence:

- CI Baseline `34323894551`: **SUCCESS**,
- CI step `Run IM-16C + frozen predecessor regression`: **SUCCESS**,
- Pages deploy `34323894385`: **SUCCESS** for visible IM-16C browser surface at `3bee01efd2525f9255bea02cc585f4b4a400bbcd`,
- later implementation HEAD `77e1c75d...` differs only by `.github/workflows/ci.yml`, so deployed browser content is unchanged.

Real-device evidence on 2026-09-09:

- real iPhone/Safari displayed Build identity `IM-16C-PLAYER-PLACEMENT-PREVIEW-VALIDITY-PROJECTION-CONTRACT`,
- browser evidence reported `IM-16C — PASS`,
- free target `cell:00000001` → `VALID Ghost`,
- occupied target `cell:00000019` → `INVALID / TARGET_CELL_OCCUPIED`,
- outside target → `NO TARGET`,
- Inspector remained `OBSERVATION READ ONLY`,
- no Confirm/Commit,
- no Building mutation.

### Non-blocking UI/readability evidence

The same iPhone test shows that the accumulated Inspector/verification surfaces are now difficult to read on the narrow phone viewport. This is recorded as a **NON-BLOCKING later UI/readability need**. It does not invalidate the IM-16C functional Preview/Validity contract and must not be silently changed inside the frozen IM-16C scope.

**Gate result: PASS / 0 BLOCKER.**

## 10. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16C – Player Placement Preview & Validity Projection Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The final frozen marker `frozen/im-16c-player-placement-preview-validity-projection-contract` must point at the final documentation HEAD produced by this closing gate. Marker creation is mechanical only and adds no capability.

No IM-16D implementation, Confirm/Commit or Building creation is authorized in this same step.

After the frozen marker exists, the next permissible action is exclusively reconciliation/definition of the next IM-16 substep against frozen IM-16C. No implementation is automatically authorized.

## 11. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-09 — IM-16C Player Placement Preview & Validity Projection Contract COMPLETE / FROZEN / PASS / 0 BLOCKER after full frozen-IM-16B diff review, successful CI/Pages and real iPhone evidence. Smartphone readability recorded as non-blocking later UI need. No IM-16D in this step.
