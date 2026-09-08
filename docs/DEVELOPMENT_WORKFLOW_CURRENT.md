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
- **IM-15C – World Diagnostic Overlay Foundation: IMPLEMENTED / NOT FROZEN**

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
3. **IM-15C – World Diagnostic Overlay Foundation — IMPLEMENTED / NOT FROZEN**
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

## 5. Frozen IM-15A / IM-15B predecessor boundary

Frozen IM-15A and IM-15B remain behaviorally preserved. IM-15C does not modify:

- `src/ui/inspector-read-only-runtime-observation.js`,
- `src/ui/inspector-structured-runtime-diagnostics.js`,
- IM-14D hit-test/selection ownership,
- IM-14E pointer/touch/camera ownership,
- Domain or Transport owner contracts.

## 6. IM-15C implemented read-only overlay scope

Implementation uses only already authoritative/read-only facts:

- **Path / ROAD:** `pathClassification.entries()` is joined to existing `grid-cell` render commands through the same cell ID,
- **Building identities:** existing camera-projected Building commands and their `sourceId`,
- **Person identities:** existing camera-projected Person commands and their `sourceId`,
- **Carrier movement:** existing `carrierMovementEvidence.currentPosition`, `targetPosition`, `unitId`, `state`; no route/intermediate points are calculated,
- **Selection highlight:** `window.IM14DWorldSelectionContext.getSelection()` read-only.

The existing world renderer remains the normal gameplay/world owner. IM-15C adds only a small render-integration hook in `src/main.js`: normal rendering completes first, returns its immutable render result plus current view scale, then the optional diagnostic overlay renderer receives that result. Pan/zoom still call the existing frozen camera functions and therefore automatically redraw the overlay through the same render path.

The selection highlight is synchronized independently by observing the existing read-only selection value; it does not subscribe to or mutate input/selection ownership.

## 7. IM-15C implementation surfaces

Relative to frozen IM-15B, IM-15C implementation is limited to:

- new `src/ui/world-diagnostic-overlay-foundation.js` — read-only overlay projector/controller/renderer,
- `index.html` — separate overlay canvas, IM-15C visible identity and cache identity,
- `src/ui/app.css` — overlay canvas stacking and `pointer-events: none`,
- `src/runtime/config.js` — synchronized build identity `IM-15C-WORLD-DIAGNOSTIC-OVERLAY-FOUNDATION`,
- `src/main.js` — only read-only overlay render-hook integration, immutable `view` metadata in the existing render result, and RuntimeConfig cache identity update to `im15c-1`,
- this workflow file and `docs/ROADMAP_CURRENT.md` — control state.

## 8. Explicit exclusions remain unimplemented

IM-15C does not implement:

- occupancy/reservation/queue/deadlock overlays without a live authoritative read owner,
- Wear overlay without a live Wear owner,
- complete route visualization without an authoritative live route registry,
- new Path/Road computation,
- new selection/pointer/touch/camera semantics,
- interactive overlay elements,
- scenario/test triggers, start/pause/step, repair/reset or state editing — IM-15D,
- long-running metrics, heatmaps, throughput history or balancing — IM-15E,
- any gameplay/domain/persistence mutation.

## 9. Current gate

IM-15C is **IMPLEMENTED / NOT FROZEN** against frozen IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`.

CI Baseline and Pages were triggered by the implementation commits and are not used here as a freeze decision; the Completion / Regression / Freeze Gate remains separate.

The next permissible action is exclusively **IM-15C – Completion / Regression / Freeze Gate**: verify full diff against frozen IM-15B, CI/Pages, read-only ownership, IM-15A/IM-15B and IM-14 selection/camera regression, synchronized visible build identity, camera-synchronous overlay rendering and real browser/device evidence. Freeze only at **PASS / 0 BLOCKER**.

No IM-15D implementation is authorized before IM-15C is separately frozen.

## 10. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15C World Diagnostic Overlay Foundation IMPLEMENTED / NOT FROZEN within the defined read-only, camera-synchronous overlay scope. Next permissible action is IM-15C Completion / Regression / Freeze Gate only.
