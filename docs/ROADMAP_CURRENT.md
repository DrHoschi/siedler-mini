# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15E IMPLEMENTED / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen predecessor for IM-15E: frozen IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

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
- **IM-15E – Simulation & Balancing Observation Foundation — IMPLEMENTED / NOT FROZEN**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 4. Frozen IM-15D predecessor boundary

Frozen IM-15D retains the exact action allowlist `START`, `PAUSE`, `SINGLE_STEP`, `RESET_BASELINE_MINIWORLD` and one active scenario composition behind `window.CleanRuntime`.

IM-15E adds no action, fast-forward, arbitrary step duration or gameplay/domain editing.

## 5. IM-15E implemented scheduler observation

New `src/diagnostics/simulation-balancing-observation.js` registers one observer system in the existing Scheduler `maintenance` phase:

- system id `im15e.simulation-observation`,
- one sample per actual Scheduler step,
- Scheduler `dtMs` is the only diagnostic time increment,
- no second simulation timer/clock,
- hard bounded history maximum **120 samples**.

Sampling is read-only and does not modify Runtime, Scheduler, Domain, Transport or persistence owners.

## 6. Session / composition semantics

The observer uses `getActiveRuntimeComposition()` as the scenario-instance read boundary.

When frozen IM-15D resets/replaces the composition, IM-15E starts a new diagnostic session, clears bounded history and restarts diagnostic step/time counters. Samples from distinct composition instances are never silently combined.

IM-15D remains the sole scenario-action owner.

## 7. Sample / delta model

Deeply frozen sample data contains:

- Session/Scenario identity,
- sample/step indices,
- Scheduler step duration and derived diagnostic simulated time,
- sampled Runtime state,
- source facts for Population, Gold, Buildings, Persons/Units, Jobs and Resources counts,
- Stock/Production/Transport numeric facts only when an authoritative source exists; otherwise `UNAVAILABLE`.

Deeply frozen derived deltas compare only consecutive samples in the same session. The first sample has no synthesized delta.

## 8. Read-only Inspector surface

New `src/ui/simulation-balancing-observation.js` renders a separate **Simulation Observation — READ ONLY · BOUNDED 120** section.

It shows Session, Scenario, Runtime, Step, diagnostic Sim Time, current history Sample count, current core metrics and deltas plus optional Stock/Production/Transport observations.

Its 250-ms UI refresh is presentation-only. Simulation samples are created only by Scheduler execution.

## 9. IM-15E implementation surface

Relative to frozen IM-15D, IM-15E is limited to:

- new `src/diagnostics/simulation-balancing-observation.js`,
- new `src/ui/simulation-balancing-observation.js`,
- `index.html`,
- `src/ui/app.css`,
- `src/runtime/config.js`,
- `src/main.js` only for cache-busted IM-15E RuntimeConfig identity,
- `docs/DEVELOPMENT_WORKFLOW_CURRENT.md`,
- this Roadmap.

Visible/build identity is `IM-15E-SIMULATION-BALANCING-OBSERVATION-FOUNDATION`.

No `scheduler.js`, `runtime.js`, Domain or Transport owner source is modified.

## 10. Explicit exclusions

Still unimplemented:

- automatic/manual gameplay mutation based on metrics,
- balancing correction/threshold actions,
- fast-forward/repeated measurement steps,
- configurable simulation speed/tick duration,
- new gameplay events only for Inspector metrics,
- SaveGame persistence of observation history,
- telemetry/upload,
- unbounded history,
- estimated/invented metrics,
- charts/heatmaps in this Foundation step,
- new selection/pointer/touch/camera semantics.

## 11. Current gate

IM-15E is **IMPLEMENTED / NOT FROZEN** against frozen IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

Before status documentation, the branch was **8 commits ahead / 0 behind** and limited to the two prior IM-15E definition documents plus six intended code/UI/build-identity files.

CI Baseline and Pages were triggered on code/build-identity head `99a8557935a0849286d7f50d73eb1bd8c50640ac`. This implementation step does not perform a freeze decision.

The next and only permissible action is **IM-15E – Completion / Regression / Freeze Gate**: full diff against frozen IM-15D, final CI/Pages, scheduler single-sample behavior, bounded immutable history, reset/session separation, read-only/no-feedback ownership, frozen IM-15A/B/C/D + IM-14 regression, visible/build identity and real browser/device evidence.

Freeze only at **PASS / 0 BLOCKER**. No IM-15 Whole-Block Completion / Regression / Freeze Gate before IM-15E freeze.

---

**Updated:** 2026-09-08 — IM-15E Simulation & Balancing Observation Foundation IMPLEMENTED / NOT FROZEN within the defined scheduler-synchronous bounded read-only scope. Next permissible action: IM-15E Completion / Regression / Freeze Gate only.
