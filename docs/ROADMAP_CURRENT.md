# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15D COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen predecessor for IM-15D: frozen IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — COMPLETE / FROZEN**,
- **IM-15 – Guidance/Inspector — IN PROGRESS / NOT FROZEN**.

## 3. IM-15 sequence

- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 4. Frozen IM-15D controlled action boundary

The frozen allowlist contains exactly:

- `START`,
- `PAUSE`,
- `SINGLE_STEP`,
- `RESET_BASELINE_MINIWORLD`.

`START` is valid only from `READY`/`PAUSED`.

`PAUSE` is valid only from `RUNNING`.

`SINGLE_STEP` is valid only from `READY`/`PAUSED`, executes exactly one Scheduler-owned fixed step and preserves Runtime lifecycle state. No caller-provided duration, repeat loop or fast-forward exists.

`RESET_BASELINE_MINIWORLD` is rejected while `RUNNING` and otherwise loads a fresh deterministic registered baseline composition.

`STOP` remains excluded.

## 5. Frozen active scenario composition

`src/diagnostics/baseline-miniworld-scenario.js` owns deterministic `BASELINE_MINIWORLD` creation and reproduces the established browser miniworld: World/Map, Buildings, Persons, PATH/ROAD evidence, Housing/Population, Gold, Traversability, Navigation and Carrier Movement evidence.

`src/main.js` holds one active runtime composition. The stable `window.CleanRuntime` facade resolves all scenario-dependent read properties through getters to that active composition, keeping World rendering, HUD, IM-15A, IM-15B and IM-15C on one authoritative scenario truth after reset.

## 6. Frozen immutable action result

`src/diagnostics/controlled-diagnostic-action-adapter.js` returns deeply frozen results limited to:

`kind`, `actionId`, `scenarioId`, `status`, `previousRuntimeState`, `currentRuntimeState`, `stepMs`, `message`.

Result status is `COMPLETED`, `REJECTED` or `FAILED`.

## 7. Frozen Inspector action integration

`src/ui/controlled-diagnostic-scenario-actions.js` binds exactly four Inspector buttons to the allowlisted adapter.

The observation area remains explicitly `OBSERVATION READ ONLY`; controlled actions remain a separate `Controlled Diagnostic Actions / ALLOWLIST` section.

Successful baseline reset uses the frozen IM-14D `clear()` selection path. IM-14D remains selection owner and IM-14E remains pointer/touch/camera owner.

## 8. IM-15D freeze surface

Relative to frozen IM-15C, IM-15D is limited to:

- new `src/diagnostics/baseline-miniworld-scenario.js`,
- new `src/diagnostics/controlled-diagnostic-action-adapter.js`,
- new `src/ui/controlled-diagnostic-scenario-actions.js`,
- `src/main.js`,
- `index.html`,
- `src/ui/app.css`,
- `src/runtime/config.js`,
- `docs/DEVELOPMENT_WORKFLOW_CURRENT.md`,
- this Roadmap.

Visible/build identity remains `IM-15D-CONTROLLED-DIAGNOSTIC-SCENARIO-ACTIONS`.

## 9. IM-15D freeze evidence

Regression against frozen IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd` before freeze-status synchronization confirmed:

- **11 commits ahead / 0 behind**,
- exactly nine permitted changed files,
- no new Domain/Transport owner source files,
- no IM-15E functionality.

Static verification confirmed exact allowlist/preconditions, Scheduler-owned fixed-step use, immutable result contract, single active composition and predecessor ownership preservation.

Technical evidence:

- CI Baseline `34241716956` on `164788d32103c4e826e228aa42219eea073e0eb6`: **SUCCESS**,
- Pages `34241924788` on `fd2ee3b4782cf06d798972fb467c2e6e96184f35`: **SUCCESS**.

Real iPad/Safari evidence at 2026-09-08 19:47–19:48 local confirmed:

- initial `READY`, Population `3`, Gold `3`, correct IM-15D build identity,
- `START · COMPLETED · READY → RUNNING`,
- `PAUSE` returns to `PAUSED`,
- `SINGLE_STEP · COMPLETED · PAUSED → PAUSED · 100 ms`,
- `RESET_BASELINE_MINIWORLD · COMPLETED · PAUSED → PAUSED · BASELINE_MINIWORLD`,
- baseline world/diagnostics/overlay data remains consistent after reset.

**Gate result: IM-15D = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 10. Explicit exclusions

Still unimplemented:

- `STOP`,
- caller-provided step/tick duration,
- fast-forward/repeated stepping loops,
- generic scenario parameters,
- direct Domain/Store CRUD or arbitrary Runtime/Scheduler invocation,
- arbitrary gameplay/domain value editing,
- automatic state repair,
- SaveGame manipulation,
- new gameplay/transport/reservation/deadlock/path/wear rules,
- new selection/pointer/touch/camera semantics,
- long-running metrics, heatmaps, throughput histories and balancing — IM-15E.

## 11. Current gate

IM-15D is frozen. IM-15 remains **IN PROGRESS / NOT FROZEN**.

The next and only permissible action is the separate **reconciliation/definition of IM-15E – Simulation & Balancing Observation Foundation** against the frozen IM-15D stand. No IM-15E implementation is authorized in the same step.

---

**Updated:** 2026-09-08 — IM-15D Controlled Guidance / Diagnostic Scenario Actions COMPLETE / FROZEN / PASS / 0 BLOCKER. Next permissible action: IM-15E reconciliation/definition only.
