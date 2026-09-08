# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15D IMPLEMENTED / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

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
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — IMPLEMENTED / NOT FROZEN**,
- **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 4. IM-15D implemented controlled action boundary

IM-15D now implements a fixed allowlist-based diagnostic action adapter. The only exposed action IDs are:

- `START`,
- `PAUSE`,
- `SINGLE_STEP`,
- `RESET_BASELINE_MINIWORLD`.

`START` uses the existing Runtime lifecycle boundary and is valid only from `READY`/`PAUSED`.

`PAUSE` is valid only from `RUNNING`.

`SINGLE_STEP` is valid only from `READY`/`PAUSED`, executes exactly one Scheduler step with the Scheduler-owned configured fixed `stepMs` and preserves Runtime lifecycle state. No caller-provided duration, repeat loop or fast-forward exists.

`RESET_BASELINE_MINIWORLD` is rejected while `RUNNING` and otherwise loads a fresh deterministic registered baseline composition.

`STOP` remains excluded.

## 5. Active scenario composition

New `src/diagnostics/baseline-miniworld-scenario.js` owns the deterministic `BASELINE_MINIWORLD` factory and reproduces the established browser miniworld: World/Map, Buildings, Persons, PATH/ROAD evidence, Housing/Population, Gold, Traversability, Navigation and Carrier Movement evidence.

`src/main.js` now holds one active runtime composition. The stable `window.CleanRuntime` facade resolves all scenario-dependent read properties through getters to that active composition. This keeps World rendering, HUD, IM-15A observation, IM-15B structured diagnostics and IM-15C overlays on one authoritative scenario truth after reset.

## 6. Immutable action result

New `src/diagnostics/controlled-diagnostic-action-adapter.js` returns deeply frozen results limited to controlled diagnostic fields:

`kind`, `actionId`, `scenarioId`, `status`, `previousRuntimeState`, `currentRuntimeState`, `stepMs`, `message`.

Result status is `COMPLETED`, `REJECTED` or `FAILED`. No Domain snapshot or generic state editor is exposed.

## 7. Inspector action integration

New `src/ui/controlled-diagnostic-scenario-actions.js` binds exactly four Inspector buttons to the allowlisted adapter.

The existing observation area remains explicitly `OBSERVATION READ ONLY`; controlled actions are shown in a separate `Controlled Diagnostic Actions / ALLOWLIST` section with a read-only last-result output.

Successful baseline reset uses the existing frozen IM-14D `clear()` path for selection reset and then refreshes existing HUD/Inspector/Structured Diagnostics surfaces. IM-14D remains selection owner and IM-14E remains pointer/touch/camera owner.

## 8. IM-15D implementation surface

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

Visible/build identity is `IM-15D-CONTROLLED-DIAGNOSTIC-SCENARIO-ACTIONS`.

## 9. Explicit exclusions

Still unimplemented:

- `STOP`,
- caller-provided step/tick duration,
- fast-forward/repeated stepping loops,
- generic scenario parameters,
- direct Domain/Store CRUD or arbitrary Runtime/Scheduler invocation,
- arbitrary Gold/Population/Building/Person/Stock/Path/Transport edits,
- automatic state repair,
- SaveGame manipulation,
- new gameplay/transport/reservation/deadlock/path/wear rules,
- new selection/pointer/touch/camera semantics,
- long-running metrics, heatmaps, throughput histories and balancing — IM-15E.

## 10. Frozen predecessor evidence remains binding

Frozen IM-15C head: `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

All frozen IM-15A/B/C and IM-14 ownership/regression requirements remain binding for IM-15D.

## 11. Current gate

IM-15D is **IMPLEMENTED / NOT FROZEN** against frozen IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

Before implementation-status documentation, the branch diff was **9 commits ahead / 0 behind** and limited to the defined implementation surface. CI Baseline `34241716956` and Pages `34241715444` on build-identity head `164788d32103c4e826e228aa42219eea073e0eb6` had been triggered; no freeze decision was made in the implementation step.

The next and only permissible action is **IM-15D – Completion / Regression / Freeze Gate**: full diff against frozen IM-15C, CI/Pages, action allowlist/preconditions/result contract, active-composition consistency, predecessor regression, visible/build identity and real browser/device evidence for START/PAUSE/SINGLE STEP/RESET BASELINE. Freeze only at **PASS / 0 BLOCKER**.

No IM-15E implementation before IM-15D freeze.

---

**Updated:** 2026-09-08 — IM-15D Controlled Guidance / Diagnostic Scenario Actions IMPLEMENTED / NOT FROZEN within the defined allowlist/scenario-composition boundary. Next permissible action: IM-15D Completion / Regression / Freeze Gate only.
