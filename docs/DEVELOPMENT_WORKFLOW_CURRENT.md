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
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions: IMPLEMENTED / NOT FROZEN**

## 2. Frozen predecessor line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen IM-15C baseline for IM-15D: `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
2. **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**
3. **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — IMPLEMENTED / NOT FROZEN**
5. **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no second gameplay/domain/persistence truth.
- Inspector observation remains read-only except for explicitly allowlisted IM-15D diagnostic actions.
- Automated tests remain test code.
- Legacy Inspector/debug architecture from `main` must not be imported.

## 5. Frozen predecessor regression boundary

IM-15D preserves:

- IM-15A read-only Runtime/World/Population/Gold/Selection observation,
- IM-15B structured diagnostics,
- IM-15C camera-synchronous read-only world overlays,
- IM-14D selection/hit-test ownership,
- IM-14E pointer/touch/camera ownership,
- authoritative Domain/Transport ownership.

## 6. Implemented IM-15D action contract

The implemented allowlist contains exactly:

- `START`,
- `PAUSE`,
- `SINGLE_STEP`,
- `RESET_BASELINE_MINIWORLD`.

No UI path dynamically invokes arbitrary `window.CleanRuntime`, Domain Store or Scheduler methods.

`START` is accepted only from `READY` or `PAUSED`.

`PAUSE` is accepted only from `RUNNING`.

`SINGLE_STEP` is accepted only from `READY` or `PAUSED`, invokes exactly one Scheduler step with the Scheduler-owned configured `stepMs`, accepts no caller-provided duration, performs no loop/fast-forward and preserves Runtime lifecycle state.

`RESET_BASELINE_MINIWORLD` is rejected while `RUNNING` and otherwise replaces the active scenario composition through the registered deterministic baseline factory.

`STOP` remains excluded.

## 7. Implemented deterministic scenario composition

New `src/diagnostics/baseline-miniworld-scenario.js` owns the deterministic `BASELINE_MINIWORLD` factory. It reconstructs the previously inline browser miniworld without duplicating gameplay truth:

- new WorldStore and MapStructure,
- three Buildings and three Persons,
- PATH and ROAD evidence cells,
- Housing/Population and Gold,
- Traversability, Reachability and Navigation validation,
- Carrier Movement evidence.

`src/main.js` now owns one active runtime composition. The stable `window.CleanRuntime` facade exposes scenario-dependent read properties through getters that always resolve to that active composition. Rendering, HUD, IM-15A, IM-15B and IM-15C therefore continue to observe the same authoritative active scenario after reset.

The existing `installActiveRuntimeComposition()` remains the composition installation boundary. `resetBaselineMiniworld()` creates and installs a fresh registered baseline composition and redraws the world.

## 8. Implemented immutable action-result contract

New `src/diagnostics/controlled-diagnostic-action-adapter.js` returns deeply frozen results with the controlled fields:

- `kind: im15d-diagnostic-action-result`,
- `actionId`,
- `scenarioId`,
- `status: COMPLETED | REJECTED | FAILED`,
- `previousRuntimeState`,
- `currentRuntimeState`,
- `stepMs`,
- `message`.

No Domain snapshots or unrestricted error objects are exposed through the result contract.

## 9. Implemented Inspector action surface

New `src/ui/controlled-diagnostic-scenario-actions.js` binds exactly four buttons to the allowlisted adapter.

The Inspector heading now distinguishes `OBSERVATION READ ONLY` from the separate `Controlled Diagnostic Actions` section.

After controlled actions, the existing HUD/Inspector/Structured Diagnostics surfaces are refreshed. On successful baseline reset, the existing frozen IM-14D `clear()` selection boundary is used; no new selection mutation path is introduced.

The IM-15C overlay continues to read runtime getters dynamically and therefore follows the active scenario composition.

## 10. IM-15D implementation surfaces

Relative to frozen IM-15C, implementation is limited to:

- new `src/diagnostics/baseline-miniworld-scenario.js`,
- new `src/diagnostics/controlled-diagnostic-action-adapter.js`,
- new `src/ui/controlled-diagnostic-scenario-actions.js`,
- `src/main.js` for active scenario composition/facade/reset integration,
- `index.html`,
- `src/ui/app.css`,
- `src/runtime/config.js`,
- this workflow file and `docs/ROADMAP_CURRENT.md`.

Visible/build identity is `IM-15D-CONTROLLED-DIAGNOSTIC-SCENARIO-ACTIONS`.

## 11. Explicit exclusions remain unimplemented

- `STOP`,
- caller-provided step duration,
- fast-forward/repeated-step loops,
- generic scenario parameters,
- direct Domain/Store CRUD,
- arbitrary Gold/Population/Building/Person/Stock/Path/Transport edits,
- SaveGame manipulation,
- automatic repair,
- new gameplay/transport/reservation/deadlock/path/wear rules,
- new selection/pointer/touch/camera semantics,
- IM-15E long-running metrics/balancing.

## 12. Current implementation gate

IM-15D is **IMPLEMENTED / NOT FROZEN** against frozen IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

Before this documentation update, the implementation diff was **9 commits ahead / 0 behind** and limited to the defined IM-15D implementation surfaces. CI Baseline `34241716956` and Pages `34241715444` on build-identity head `164788d32103c4e826e228aa42219eea073e0eb6` had been triggered and were not yet used as a freeze decision.

No IM-15D Completion / Regression / Freeze Gate has been executed in this implementation step.

The next permissible action is exclusively **IM-15D – Completion / Regression / Freeze Gate**: full diff against frozen IM-15C, CI/Pages, exact allowlist/precondition/result-contract verification, active-composition consistency, predecessor regression, visible/build identity and real browser/device evidence for START/PAUSE/SINGLE STEP/RESET BASELINE. Freeze only at **PASS / 0 BLOCKER**.

No IM-15E implementation is authorized before IM-15D freeze.

## 13. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15D Controlled Guidance / Diagnostic Scenario Actions IMPLEMENTED / NOT FROZEN within the defined allowlist/scenario-composition boundary. Next permissible action is IM-15D Completion / Regression / Freeze Gate only.
