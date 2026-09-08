# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15C IMPLEMENTED / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-15B remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

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
- **IM-15C – World Diagnostic Overlay Foundation — IMPLEMENTED / NOT FROZEN**,
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**,
- **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 5. Frozen predecessor boundary

IM-15A remains frozen owner of the read-only Inspector shell and Runtime/World/Population/Gold/Selection observation.

IM-15B remains frozen owner of structured read-only diagnostics over existing Buildings, Persons, Jobs, Resources, Movement/Navigation evidence and Path Classification.

IM-15C preserves those boundaries and the frozen IM-14 Player UI/HUD/Selection/Pointer/Camera contracts.

## 6. IM-15C implemented capability boundary

IM-15C now adds a separate transparent diagnostic canvas over the normal world canvas. It has no pointer/touch ownership and renders only existing authoritative/read-only facts through the same current world/camera projection truth.

Implemented overlays:

- **Path / ROAD cells:** existing `pathClassification.entries()` joined to existing grid-cell commands by authoritative cell ID,
- **Building IDs:** existing Building render-command `sourceId` labels,
- **Person/Unit IDs:** existing Person render-command `sourceId` labels,
- **Carrier Movement relationship:** existing `carrierMovementEvidence` current→target relationship only; no calculated route or intermediate points,
- **Selection highlight:** existing IM-14D selection read through `getSelection()` and highlighted only visually.

The normal world renderer remains owner of gameplay/world rendering. `src/main.js` contains only a minimal read-only overlay render hook plus immutable current view metadata so the overlay can remain synchronized with the existing camera during resize, pan and zoom.

## 7. IM-15C implementation surfaces

Relative to frozen IM-15B the implementation is limited to:

- new `src/ui/world-diagnostic-overlay-foundation.js`,
- `index.html`,
- `src/ui/app.css`,
- `src/runtime/config.js`,
- `src/main.js` only for the overlay render hook, immutable render-view metadata and IM-15C RuntimeConfig cache identity,
- `docs/DEVELOPMENT_WORKFLOW_CURRENT.md`,
- this Roadmap.

Visible/build identity is `IM-15C-WORLD-DIAGNOSTIC-OVERLAY-FOUNDATION`.

## 8. Explicit exclusions

Still unimplemented:

- occupancy/reservation/queue/deadlock overlays without an authoritative live read owner,
- live Wear overlay without a live Wear owner,
- complete route visualization without an authoritative route registry,
- new Path/Road computation,
- new selection/pointer/touch/camera semantics or interactive overlay controls,
- scenario/test triggering, start/pause/step, repair/reset or direct state editing — IM-15D,
- long-running metrics, heatmaps, throughput history and balancing — IM-15E,
- any gameplay/domain/persistence mutation.

## 9. Current gate

IM-15C is **IMPLEMENTED / NOT FROZEN** against frozen IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`.

The implementation commits triggered CI/Pages, but no freeze decision is made in this implementation step.

The next and only permissible action is **IM-15C – Completion / Regression / Freeze Gate**: full diff, CI/Pages, read-only ownership verification, frozen predecessor regression, camera-synchronous overlay verification, synchronized visible/build identity and real browser/device evidence. Freeze only at **PASS / 0 BLOCKER**.

No IM-15D implementation is authorized in the same step.

---

**Updated:** 2026-09-08 — IM-15C World Diagnostic Overlay Foundation IMPLEMENTED / NOT FROZEN within the defined read-only camera-synchronous overlay boundary. Next permissible action is IM-15C Completion / Regression / Freeze Gate only.
