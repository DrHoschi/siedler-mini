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
- **IM-15E – Simulation & Balancing Observation Foundation: IMPLEMENTED / NOT FROZEN**

## 2. Frozen predecessor line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen IM-15D baseline for IM-15E: `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
2. **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**
3. **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — COMPLETE / FROZEN / PASS / 0 BLOCKER**
5. **IM-15E – Simulation & Balancing Observation Foundation — IMPLEMENTED / NOT FROZEN**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no second gameplay/domain/persistence truth.
- Inspector observation remains read-only except for explicitly allowlisted frozen IM-15D actions.
- IM-15E observes and derives diagnostics only; metrics never feed back into gameplay/domain/runtime rules.
- Automated tests remain test code.
- Legacy Inspector/debug architecture from `main` must not be imported.

## 5. Frozen IM-15D predecessor boundary

The frozen IM-15D allowlist remains exactly `START`, `PAUSE`, `SINGLE_STEP`, `RESET_BASELINE_MINIWORLD`.

The single active Runtime composition remains the only scenario-dependent authoritative truth behind the stable `window.CleanRuntime` facade.

IM-15E does not add fast-forward, repeated stepping, arbitrary step duration, generic state editing or additional lifecycle actions.

## 6. IM-15E implemented observation boundary

New `src/diagnostics/simulation-balancing-observation.js` registers exactly one read-only diagnostics system:

- system id `im15e.simulation-observation`,
- existing Scheduler phase `maintenance`,
- no second simulation timer/clock,
- one sample per actual Scheduler step,
- Scheduler-provided `dtMs` accumulated as diagnostic `simulatedMs`,
- bounded in-memory history with hard maximum **120 samples**.

The observer changes no Runtime, Domain, Transport, Scheduler or SaveGame state.

## 7. Session / reset semantics

The observer compares the current object returned by `getActiveRuntimeComposition()` with the previously observed composition reference.

When frozen IM-15D `RESET_BASELINE_MINIWORLD` replaces the active composition:

- a new diagnostic session is created,
- `stepIndex` and diagnostic `simulatedMs` restart at `0`,
- bounded history is cleared,
- samples from distinct scenario instances are not joined.

IM-15D remains sole reset/action owner. IM-15E only observes the composition replacement.

## 8. Immutable sample / delta contract

Samples are deeply frozen diagnostic data with:

- `kind`, `sessionId`, `scenarioId`,
- `sampleIndex`, `stepIndex`, `stepMs`, `simulatedMs`,
- sampled Runtime state,
- source facts: Population, Gold, Buildings count, Persons/Units count, Jobs count, Resources count,
- optional Stock/Production/Transport facts only when an authoritative numeric source exists; otherwise `UNAVAILABLE`.

Derived deltas are separate deeply frozen diagnostic values for consecutive samples of the same session.

No first-sample delta is synthesized. Missing/non-numeric sources remain `UNAVAILABLE`.

## 9. Read-only Inspector integration

New `src/ui/simulation-balancing-observation.js` owns only the read-only **Simulation Observation** projection.

The UI displays:

- Session,
- Scenario,
- Runtime,
- Step,
- diagnostic Sim Time,
- current bounded Sample count,
- Population / Gold / Buildings / Persons / Jobs / Resources current values and deltas,
- Stock / Production / Transport only when available.

The UI refresh timer is presentation-only; it does not sample or advance simulation. Samples are created only by the registered Scheduler maintenance system.

## 10. IM-15E implementation surface

Relative to frozen IM-15D the intended implementation surface is limited to:

- new `src/diagnostics/simulation-balancing-observation.js`,
- new `src/ui/simulation-balancing-observation.js`,
- `index.html`,
- `src/ui/app.css`,
- `src/runtime/config.js`,
- `src/main.js` only for cache-busted IM-15E RuntimeConfig identity,
- this workflow file and `docs/ROADMAP_CURRENT.md`.

Visible/build identity is `IM-15E-SIMULATION-BALANCING-OBSERVATION-FOUNDATION`.

No `scheduler.js`, `runtime.js`, Domain or Transport owner source is modified.

## 11. Explicit IM-15E exclusions

Still unimplemented:

- automatic/manual gameplay changes based on metrics,
- automatic balancing/correction,
- thresholds that alter simulation rules,
- fast-forward/repeated stepping for measurement generation,
- caller-configurable simulation speed/tick duration,
- new gameplay events created only for Inspector metrics,
- SaveGame persistence of observation history,
- telemetry/upload,
- unbounded history,
- invented/estimated metrics,
- charts/heatmaps in this Foundation step,
- new selection/pointer/touch/camera semantics.

## 12. Current implementation gate state

IM-15E is **IMPLEMENTED / NOT FROZEN** against frozen IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

Before implementation-status documentation, the branch was **8 commits ahead / 0 behind** relative to frozen IM-15D and limited to the two prior definition documents plus the six intended IM-15E code/UI/build-identity files.

CI Baseline and Pages were triggered on code/build-identity head `99a8557935a0849286d7f50d73eb1bd8c50640ac`; no freeze decision is made in this implementation step.

The next permissible action is exclusively **IM-15E – Completion / Regression / Freeze Gate**: full diff against frozen IM-15D, final CI/Pages, scheduler-synchronous single-sample verification, bounded/immutable history and session reset semantics, read-only/no-feedback ownership, predecessor regression, visible/build identity and real browser/device evidence. Freeze only at **PASS / 0 BLOCKER**.

No IM-15 Whole-Block Completion / Regression / Freeze Gate before IM-15E is frozen.

## 13. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15E Simulation & Balancing Observation Foundation IMPLEMENTED / NOT FROZEN within the scheduler-synchronous, bounded, read-only observation/session/history scope. Next permissible action: IM-15E Completion / Regression / Freeze Gate only.
