# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15C COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-15B remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-15C now also remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen predecessor for IM-15C: frozen IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — COMPLETE / FROZEN**,
- **IM-15 – Guidance/Inspector — IN PROGRESS / NOT FROZEN**.

## 3. IM-15 reconciled capability boundary

IM-15 is a modular diagnostic/observation/guidance surface over existing authoritative runtime owners.

Binding rules:

- no new gameplay/domain/persistence truth,
- read existing authoritative owners rather than duplicate them,
- no legacy Inspector/debug architecture imported from `main`,
- later actions only through explicit diagnostic/test/runtime boundaries,
- automated tests remain test-owned.

## 4. IM-15 sequence

- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**,
- **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 5. Frozen predecessor boundary

IM-15A remains frozen owner of the read-only Inspector shell and Runtime/World/Population/Gold/Selection observation.

IM-15B remains frozen owner of structured read-only diagnostics over existing Buildings, Persons, Jobs, Resources, Movement/Navigation evidence and Path Classification.

IM-15C preserves those boundaries and the frozen IM-14 Player UI/HUD/Selection/Pointer/Camera contracts.

## 6. Frozen IM-15C capability boundary

IM-15C owns only a separate transparent read-only diagnostic canvas over the normal world canvas. It has no pointer/touch ownership and renders only existing authoritative/read-only facts through the same current world/camera projection truth.

Frozen overlays:

- **Path / ROAD cells:** existing `pathClassification.entries()` joined to existing grid-cell commands by authoritative cell ID,
- **Building IDs:** existing Building render-command `sourceId` labels,
- **Person/Unit IDs:** existing Person render-command `sourceId` labels,
- **Carrier Movement relationship:** existing `carrierMovementEvidence` current→target relationship only; no calculated route or intermediate points,
- **Selection highlight:** existing IM-14D selection read through `getSelection()` and highlighted only visually.

The normal world renderer remains owner of gameplay/world rendering. `src/main.js` contains only a minimal read-only overlay render hook plus immutable current view metadata so the overlay remains synchronized with the existing camera during resize, pan and zoom.

## 7. IM-15C implementation/freeze surface

Relative to frozen IM-15B the complete IM-15C block is limited to:

- new `src/ui/world-diagnostic-overlay-foundation.js`,
- `index.html`,
- `src/ui/app.css`,
- `src/runtime/config.js`,
- `src/main.js` only for the overlay render hook, immutable render-view metadata and IM-15C RuntimeConfig cache identity,
- `docs/DEVELOPMENT_WORKFLOW_CURRENT.md`,
- this Roadmap.

Visible/build identity remains `IM-15C-WORLD-DIAGNOSTIC-OVERLAY-FOUNDATION`.

## 8. IM-15C freeze evidence

Regression against frozen IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513` confirmed before freeze-status synchronization:

- **10 commits ahead / 0 behind**,
- exactly seven permitted changed files,
- frozen IM-15A/IM-15B projector files unchanged,
- no Domain or Transport source change,
- no IM-15D/IM-15E functionality.

Read-only ownership verified:

- separate overlay canvas with `pointer-events: none`,
- authoritative read sources only (`pathClassification.entries()`, existing render commands, `carrierMovementEvidence`, IM-14D `getSelection()`),
- recursively frozen overlay projection,
- no Domain/Transport mutation path,
- camera mutations remain owned by frozen IM-14E.

Technical evidence:

- implementation CI Baseline `34236720224`: **SUCCESS**,
- implementation Pages `34236765007`: **SUCCESS**,
- freeze-status CI Baseline `34237371166` on `5d333caa83f21f9fb8b80ef40fbb218e3fcee1c2`: **SUCCESS**,
- freeze-status Pages `34237370186` on the same head: **SUCCESS**.

Real iPhone/Safari evidence at 2026-09-08 16:14 local confirmed:

- Runtime `READY`, Population `3`, Gold `3`, correct World Basics,
- visible build identity `IM-15C-WORLD-DIAGNOSTIC-OVERLAY-FOUNDATION`,
- PATH/ROAD overlays, Building/Person IDs and Carrier current→target relationship visible,
- two different camera positions preserve overlay/world alignment,
- Inspector remains `READ ONLY`, Structured Diagnostics remains present, selection/context remains available.

**Gate result: IM-15C = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 9. Explicit exclusions

Still unimplemented:

- occupancy/reservation/queue/deadlock overlays without an authoritative live read owner,
- live Wear overlay without a live Wear owner,
- complete route visualization without an authoritative route registry,
- new Path/Road computation,
- new selection/pointer/touch/camera semantics or interactive overlay controls,
- scenario/test triggering, start/pause/step, repair/reset or direct state editing — IM-15D,
- long-running metrics, heatmaps, throughput history and balancing — IM-15E,
- any gameplay/domain/persistence mutation.

## 10. Current gate

IM-15C is frozen. IM-15 remains **IN PROGRESS / NOT FROZEN**.

The next and only permissible action is the separate **reconciliation/definition of IM-15D – Controlled Guidance / Diagnostic Scenario Actions** against the frozen IM-15C stand. No IM-15D implementation is authorized in the same step.

---

**Updated:** 2026-09-08 — IM-15C World Diagnostic Overlay Foundation COMPLETE / FROZEN / PASS / 0 BLOCKER. Next permissible action is IM-15D reconciliation/definition only.
