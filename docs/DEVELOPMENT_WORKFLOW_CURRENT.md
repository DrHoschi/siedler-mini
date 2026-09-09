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
- **IM-16D – Authoritative Placement Commit & Building Registration Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**

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

Frozen IM-16C marker: `frozen/im-16c-player-placement-preview-validity-projection-contract`.
Frozen IM-16C head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

The IM-16D frozen marker must point at the final documentation HEAD produced by this closing gate after final CI/Pages verification.

## 3. Binding ownership boundary after IM-16D

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the currently supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and world-target consumption.
- Frozen IM-16C owns only temporary Player Placement Preview / Validity projection.
- Frozen IM-16D owns only the authoritative commit seam: final revalidation through IM-16A and controlled handoff to existing Building identity/lifecycle/store/registration owners.
- Existing Building Domain/store remains sole owner of stable Building identity, lifecycle and Building-store mutation.
- Existing `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- Frozen IM-15 Inspector remains observer only; IM-15C diagnostic overlay is not Player Placement authority.
- Legacy `main` gameplay/UI architecture is not an implementation basis.
- No Player Confirm/Cancel control exists yet.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

Target flow remains:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

IM-16A, IM-16B, IM-16C and IM-16D are frozen. No later IM-16 capability is authorized by this gate.

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

Frozen head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

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

### Non-blocking UI/readability evidence

Real iPhone evidence showed that accumulated Inspector/verification surfaces are difficult to read on a narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and was not silently folded into IM-16D.

## 8. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16C @ `ddebbb4ee8b743b869e069da11d644690e0620eb`.

### Frozen capability boundary

IM-16D adds only the authoritative commit / Building registration boundary behind the frozen interaction/preview path.

- Candidate input is only existing Building `definitionId` plus real `targetCellId`.
- A cached frozen-IM-16A evaluation carried by IM-16B/IM-16C is never mutation authority.
- Immediately before any Building mutation, the candidate is re-evaluated through frozen IM-16A against current authoritative Map/Building state.
- Only a candidate still `VALID` at this final revalidation may proceed.
- Rejection preserves the authoritative IM-16A reason and creates no Building mutation.
- Stable Building ID is allocated only through the existing Building-store allocation boundary.
- Building identity uses existing `BuildingIdentityOwnershipContract`.
- Building lifecycle uses existing `BuildingLifecycleStateContract` and only its already supported minimal semantics.
- Actual registration occurs exclusively through existing `BuildingRegistrationWorldOwnership.register(...)`.
- `BuildingRegistrationWorldOwnership` was extended only to carry optional existing Building `position`; this keeps registration inside the same existing owner and lets later frozen-IM-16A occupancy checks see the committed Building at its real cell.
- Exactly one successful registration may result from one successful commit invocation.
- The immutable commit result identifies success plus the created Building ID, or rejection plus the authoritative reason.
- Player UI, frozen IM-16B interaction state and frozen IM-16C preview remain consumers only and gain no Building/Domain mutation authority.

### Frozen exclusions

IM-16D introduces none of the following:

- Player Confirm button,
- Player Cancel button,
- Pointer/Touch commit trigger,
- automatic Placement Mode deactivation after success,
- Player-facing live commit trigger,
- cost/resource or Gold deduction,
- construction progression,
- workforce or production integration,
- SaveGame rearchitecture or special persistence path,
- Building rotation,
- multi-cell footprints,
- new terrain/distance/resource/building-type placement rules,
- new Camera control semantics,
- new Selection ownership,
- Inspector mutation/editor paths,
- IM-16E implementation.

## 9. IM-16D implementation surface

The implementation is limited to:

- `src/domain/authoritative-placement-commit-building-registration-contract.js`
- narrow owner-compatible extension in `src/domain/building-registration-world-ownership.js`
- `src/dev/im-16d-self-test.js`
- `src/dev/im-16d-self-test.node.js`
- `src/im16d-runtime-evidence.js`
- CI wiring in `.github/workflows/ci.yml`
- visible/browser verification synchronization in `index.html`, `src/main.js` and `src/runtime/config.js`

No Player Confirm/Cancel implementation and no IM-16E implementation exists in this frozen scope.

## 10. IM-16D Completion / Regression / Freeze Gate

Frozen baseline: IM-16C @ `ddebbb4ee8b743b869e069da11d644690e0620eb`.

Pre-freeze IM-16D implementation HEAD: `463ca686e0f0986573c4b96c2939e28a979c8e62`.

Full cumulative diff from frozen IM-16C to that implementation HEAD was reviewed before freeze:

- **11 commits ahead / 0 behind**,
- merge base exactly frozen IM-16C,
- exactly **11 changed files**,
- two changed files are the already verified IM-16D control-documentation updates,
- nine changed files are the narrow IM-16D implementation/evidence/CI/visible-identity surface listed above,
- no unrelated Runtime/Transport/Scheduler/SaveGame/Selection/Camera/Inspector ownership expansion,
- no Player Confirm/Cancel and no IM-16E.

Technical evidence:

- CI Baseline `34335841839`: **SUCCESS**,
- CI step `Run IM-16D + frozen predecessor regression`: **SUCCESS**,
- Pages deploy `34335841057`: **SUCCESS** on implementation HEAD `463ca686e0f0986573c4b96c2939e28a979c8e62`.

Real-device evidence on 2026-09-09:

- real iPhone/Safari displayed page title `IM-16D – Authoritative Placement Commit & Building Registration Contract`,
- visible Build identity `IM-16D-AUTHORITATIVE-PLACEMENT-COMMIT-BUILDING-REGISTRATION-CONTRACT`,
- browser evidence reported `IM-16D — PASS`,
- occupied `cell:00000019` → `TARGET_CELL_OCCUPIED / NO MUTATION`,
- free `cell:00000001` → `COMMITTED building:00000004`,
- immediate recheck same target → `TARGET_CELL_OCCUPIED / NO SECOND REGISTRATION`,
- authoritative position registered,
- Inspector remained `OBSERVATION READ ONLY`,
- no Player Confirm/Cancel,
- Build Identity PASS.

The browser evidence runs in an isolated Miniworld and exposes `liveRuntimeMutation: false`; it does not commit the visible live runtime during verification.

**Gate result: PASS / 0 BLOCKER.**

## 11. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16C – Player Placement Preview & Validity Projection Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16D – Authoritative Placement Commit & Building Registration Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The final frozen marker `frozen/im-16d-authoritative-placement-commit-building-registration-contract` must point at the final documentation HEAD produced by this closing gate. Marker creation is mechanical only and adds no capability.

No Player Confirm/Cancel and no IM-16E implementation is authorized in this same step.

After the frozen marker exists, the next permissible action is exclusively reconciliation/definition of the next IM-16 substep against frozen IM-16D. No implementation is automatically authorized.

## 12. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-09 — IM-16D Authoritative Placement Commit & Building Registration Contract COMPLETE / FROZEN / PASS / 0 BLOCKER after full frozen-IM-16C diff review, successful CI/Pages and real iPhone evidence. No Player Confirm/Cancel and no IM-16E in this step.
