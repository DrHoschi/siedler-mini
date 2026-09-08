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
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions: COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen predecessor line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen IM-15C baseline for IM-15D: `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
2. **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**
3. **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — COMPLETE / FROZEN / PASS / 0 BLOCKER**
5. **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no second gameplay/domain/persistence truth.
- Inspector observation remains read-only except for explicitly allowlisted IM-15D diagnostic actions.
- Automated tests remain test code.
- Legacy Inspector/debug architecture from `main` must not be imported.

## 5. Frozen IM-15D action contract

The frozen allowlist contains exactly:

- `START`,
- `PAUSE`,
- `SINGLE_STEP`,
- `RESET_BASELINE_MINIWORLD`.

`START` is valid only from `READY` or `PAUSED`.

`PAUSE` is valid only from `RUNNING`.

`SINGLE_STEP` is valid only from `READY` or `PAUSED`, executes exactly one Scheduler-owned fixed step and preserves Runtime lifecycle state.

`RESET_BASELINE_MINIWORLD` is rejected while `RUNNING` and otherwise installs a fresh deterministic registered baseline composition.

`STOP`, arbitrary step durations, repeat/fast-forward and direct Domain/Store editing remain excluded.

## 6. Frozen scenario composition / result boundary

`src/diagnostics/baseline-miniworld-scenario.js` owns deterministic `BASELINE_MINIWORLD` creation.

`src/main.js` owns exactly one active Runtime composition. The stable `window.CleanRuntime` facade resolves scenario-dependent read properties through getters to this active composition so World rendering, HUD, IM-15A, IM-15B and IM-15C observe the same authoritative scenario after reset.

`src/diagnostics/controlled-diagnostic-action-adapter.js` returns deeply frozen action results limited to:

- `kind`,
- `actionId`,
- `scenarioId`,
- `status: COMPLETED | REJECTED | FAILED`,
- `previousRuntimeState`,
- `currentRuntimeState`,
- `stepMs`,
- `message`.

## 7. IM-15D freeze surface

Relative to frozen IM-15C, IM-15D is limited to:

- new `src/diagnostics/baseline-miniworld-scenario.js`,
- new `src/diagnostics/controlled-diagnostic-action-adapter.js`,
- new `src/ui/controlled-diagnostic-scenario-actions.js`,
- `src/main.js`,
- `index.html`,
- `src/ui/app.css`,
- `src/runtime/config.js`,
- this workflow file and `docs/ROADMAP_CURRENT.md`.

Visible/build identity remains `IM-15D-CONTROLLED-DIAGNOSTIC-SCENARIO-ACTIONS`.

## 8. IM-15D Completion / Regression / Freeze Gate

Regression against frozen IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd` before freeze-status synchronization confirmed:

- **11 commits ahead / 0 behind**,
- exactly nine permitted changed files,
- no new Domain/Transport owner source files,
- no IM-15E functionality.

Static verification confirmed:

- exact four-action allowlist only,
- explicit Runtime-state preconditions,
- `SINGLE_STEP` uses Scheduler-owned `stepMs` with no caller duration,
- immutable/deeply frozen result contract,
- one active scenario composition behind the stable `CleanRuntime` facade,
- existing IM-14D `clear()` reused for selection reset,
- frozen IM-14/IM-15A/B/C ownership preserved.

Technical evidence:

- CI Baseline `34241716956` on code/build-identity head `164788d32103c4e826e228aa42219eea073e0eb6`: **SUCCESS**,
- Pages `34241924788` on implementation/documentation head `fd2ee3b4782cf06d798972fb467c2e6e96184f35`: **SUCCESS**.

Real iPad/Safari evidence at 2026-09-08 19:47–19:48 local confirmed:

- initial Runtime `READY`, Population `3`, Gold `3`, correct build identity,
- `START · COMPLETED · READY → RUNNING`, with only PAUSE available while running,
- `PAUSE` returns Runtime to `PAUSED`,
- `SINGLE_STEP · COMPLETED · PAUSED → PAUSED · 100 ms`,
- `RESET_BASELINE_MINIWORLD · COMPLETED · PAUSED → PAUSED · BASELINE_MINIWORLD`,
- after reset the baseline remains 3 Buildings, 3 Persons, Population `3`, Gold `3`, 2 Paths and the existing world/overlay/navigation evidence,
- observation remains read-only while diagnostic actions remain explicitly allowlisted.

**Gate result: IM-15D = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 9. Explicit exclusions remain unimplemented

- `STOP`,
- caller-provided step duration,
- fast-forward/repeated-step loops,
- generic scenario parameters,
- direct Domain/Store CRUD,
- arbitrary gameplay/domain value editing,
- SaveGame manipulation,
- automatic state repair,
- new gameplay/transport/reservation/deadlock/path/wear rules,
- new selection/pointer/touch/camera semantics,
- IM-15E long-running metrics/balancing.

## 10. Current gate

IM-15D is frozen. IM-15 as a whole remains **IN PROGRESS / NOT FROZEN**.

The next permissible action is exclusively the separate **reconciliation/definition of IM-15E – Simulation & Balancing Observation Foundation** against the frozen IM-15D stand. No IM-15E implementation is authorized in the same step.

## 11. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15D Controlled Guidance / Diagnostic Scenario Actions COMPLETE / FROZEN / PASS / 0 BLOCKER after full diff, CI/Pages, static action/composition verification, predecessor regression and real iPad action-sequence evidence. IM-15 remains IN PROGRESS / NOT FROZEN.
