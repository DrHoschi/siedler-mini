# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-block branch: `feature/im-15-guidance-inspector`
- Whole-block branch base: frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current migration block: **IM-15 – Guidance / Inspector: IN PROGRESS / NOT FROZEN**
- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15B – Structured Runtime Diagnostics Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15C – World Diagnostic Overlay Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen predecessor line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-15B remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen IM-15B baseline for IM-15C: `513636c0fbb4a892134734dc49d8b9a438b7a513`.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
2. **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**
3. **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**
   - separate transparent read-only diagnostic canvas over the existing world canvas,
   - same existing world/camera projection truth as the frozen renderer,
   - PATH/ROAD cell overlay from existing `pathClassification.entries()`,
   - existing Building IDs and Person/Unit IDs projected from existing camera-transformed render commands,
   - existing `carrierMovementEvidence` visualized as current→target diagnostic relationship only,
   - existing IM-14D selection read-only highlighted without new selection/hit-test semantics,
   - overlay surface owns no pointer/touch input (`pointer-events: none`),
   - no new gameplay/domain/persistence truth or mutation path.
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**
5. **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no new gameplay/domain/persistence truth.
- Inspector reads existing authoritative owners and visualizes their state.
- Later Inspector actions are allowed only through explicit diagnostic/test/runtime boundaries.
- Automated tests remain test code.
- Legacy Inspector/debug architecture from `main` must not be imported; `main` remains historical reference only.

## 5. Frozen predecessor regression boundary

Frozen IM-15A and IM-15B remain behaviorally preserved. IM-15C does not modify:

- `src/ui/inspector-read-only-runtime-observation.js`,
- `src/ui/inspector-structured-runtime-diagnostics.js`,
- IM-14D hit-test/selection ownership,
- IM-14E pointer/touch/camera ownership,
- Domain or Transport owner contracts.

## 6. Frozen IM-15C read-only overlay scope

IM-15C uses only already authoritative/read-only facts:

- **Path / ROAD:** `pathClassification.entries()` joined to existing `grid-cell` render commands through the same cell ID,
- **Building identities:** existing camera-projected Building commands and their `sourceId`,
- **Person identities:** existing camera-projected Person commands and their `sourceId`,
- **Carrier movement:** existing `carrierMovementEvidence.currentPosition`, `targetPosition`, `unitId`, `state`; no route/intermediate points are calculated,
- **Selection highlight:** `window.IM14DWorldSelectionContext.getSelection()` read-only.

The existing world renderer remains normal gameplay/world owner. IM-15C adds only a small read-only render-integration hook in `src/main.js`: normal rendering completes first, returns its immutable render result plus current view scale, then the optional diagnostic overlay renderer receives that result. Pan/zoom still call the frozen camera functions and therefore redraw the overlay through the same render path.

The selection highlight is synchronized by observing the existing read-only selection value; IM-15C does not subscribe to or mutate input/selection ownership.

## 7. IM-15C implementation surfaces

Relative to frozen IM-15B, IM-15C is limited to:

- new `src/ui/world-diagnostic-overlay-foundation.js`,
- `index.html`,
- `src/ui/app.css`,
- `src/runtime/config.js`,
- `src/main.js` only for the read-only overlay render hook, immutable render-view metadata and RuntimeConfig cache identity,
- this workflow file and `docs/ROADMAP_CURRENT.md`.

Visible/build identity remains `IM-15C-WORLD-DIAGNOSTIC-OVERLAY-FOUNDATION`.

## 8. IM-15C Completion / Regression / Freeze Gate

Regression against frozen IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513` confirmed before freeze-status synchronization:

- branch: **10 commits ahead / 0 behind**,
- exactly seven permitted changed files: `docs/DEVELOPMENT_WORKFLOW_CURRENT.md`, `docs/ROADMAP_CURRENT.md`, `index.html`, `src/main.js`, `src/runtime/config.js`, `src/ui/app.css`, `src/ui/world-diagnostic-overlay-foundation.js`,
- frozen IM-15A/IM-15B projector files unchanged,
- no Domain or Transport source files changed,
- no IM-15D/IM-15E functionality introduced.

Read-only / ownership verification:

- overlay canvas is separate and `pointer-events: none`,
- overlay reads existing render commands, `pathClassification.entries()`, `carrierMovementEvidence` and IM-14D `getSelection()` only,
- overlay projection is recursively frozen,
- world/camera mutation remains only in frozen IM-14E camera owner,
- no Domain/Transport mutation API is called by IM-15C.

Technical evidence:

- implementation CI Baseline `34236720224` on `fec9c39fd6ef500f81075024d2fd1e3277069bfa`: **SUCCESS**,
- implementation Pages `34236765007` on `39a04cab18d8d9f7b3e2242d8e038e40afdcc6f1`: **SUCCESS**,
- final visible-freeze-status CI Baseline `34237371166` on `5d333caa83f21f9fb8b80ef40fbb218e3fcee1c2`: **SUCCESS**,
- final visible-freeze-status Pages `34237370186` on `5d333caa83f21f9fb8b80ef40fbb218e3fcee1c2`: **SUCCESS**.

Real-device evidence:

- iPhone / Safari, 2026-09-08 16:14 local,
- Runtime `READY`, Population `3`, Gold `3`, World Basics preserved,
- visible build identity `IM-15C-WORLD-DIAGNOSTIC-OVERLAY-FOUNDATION`,
- PATH and ROAD overlays visible on their world cells,
- Building/Person IDs visible,
- Carrier current→target diagnostic relationship visible,
- two distinct camera positions show overlays moving synchronously with the world,
- Inspector remains `READ ONLY`, Structured Diagnostics remains present, selection/context remains `Keine Auswahl / Weltobjekt antippen` in the supplied evidence.

**Gate result: IM-15C = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 9. Explicit exclusions remain unimplemented

- occupancy/reservation/queue/deadlock overlays without a live authoritative read owner,
- Wear overlay without a live Wear owner,
- complete route visualization without an authoritative live route registry,
- new Path/Road computation,
- new selection/pointer/touch/camera semantics,
- interactive overlay elements,
- scenario/test triggers, start/pause/step, repair/reset or state editing — IM-15D,
- long-running metrics, heatmaps, throughput history or balancing — IM-15E,
- any gameplay/domain/persistence mutation.

## 10. Current gate

IM-15C is frozen. IM-15 as a whole remains **IN PROGRESS / NOT FROZEN**.

The next permissible action is exclusively the separate **reconciliation/definition of IM-15D – Controlled Guidance / Diagnostic Scenario Actions** against the frozen IM-15C stand. No IM-15D implementation is authorized in the same step.

## 11. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15C COMPLETE / FROZEN / PASS / 0 BLOCKER after full diff, CI/Pages, read-only ownership, predecessor regression and real iPhone camera-synchronous overlay evidence. IM-15 remains IN PROGRESS / NOT FROZEN.
