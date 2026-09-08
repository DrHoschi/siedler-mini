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
- **IM-15E – Simulation & Balancing Observation Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen predecessor line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen IM-15D baseline for IM-15E: `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
2. **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**
3. **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — COMPLETE / FROZEN / PASS / 0 BLOCKER**
5. **IM-15E – Simulation & Balancing Observation Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no second gameplay/domain/persistence truth.
- Inspector observation remains read-only except for explicitly allowlisted frozen IM-15D actions.
- IM-15E observes and derives diagnostics only; metrics never feed back into gameplay/domain/runtime rules.
- Automated tests remain test code.
- Legacy Inspector/debug architecture from `main` must not be imported.

## 5. Frozen IM-15D predecessor boundary

The frozen IM-15D allowlist remains exactly `START`, `PAUSE`, `SINGLE_STEP`, `RESET_BASELINE_MINIWORLD`.

The single active Runtime composition remains the only scenario-dependent authoritative truth behind the stable `window.CleanRuntime` facade.

IM-15E adds no fast-forward, repeated stepping, arbitrary step duration, generic state editing or additional lifecycle actions.

## 6. Frozen IM-15E observation boundary

`src/diagnostics/simulation-balancing-observation.js` registers exactly one read-only diagnostics system:

- system id `im15e.simulation-observation`,
- existing Scheduler phase `maintenance`,
- no second simulation timer/clock,
- one sample per actual Scheduler step,
- Scheduler-provided `dtMs` accumulated as diagnostic `simulatedMs`,
- bounded in-memory history with hard maximum **120 samples**.

The observer changes no Runtime, Domain, Transport, Scheduler or SaveGame state.

## 7. Frozen session / reset semantics

The observer compares the current object returned by `getActiveRuntimeComposition()` with the previously observed composition reference.

When frozen IM-15D `RESET_BASELINE_MINIWORLD` replaces the active composition:

- a new diagnostic session is created,
- `stepIndex` and diagnostic `simulatedMs` restart at `0`,
- bounded history is cleared,
- samples from distinct scenario instances are not joined.

IM-15D remains sole reset/action owner. IM-15E only observes the composition replacement.

## 8. Frozen immutable sample / delta contract

Samples are deeply frozen diagnostic data with Session/Scenario identity, sample/step indices, Scheduler step duration, diagnostic simulated time, Runtime state and source facts for Population, Gold, Buildings, Persons/Units, Jobs and Resources.

Stock/Production/Transport are sampled only where an authoritative numeric source exists; otherwise they remain `UNAVAILABLE`.

Derived deltas are separate deeply frozen diagnostic values for consecutive samples of the same session. No first-sample delta is synthesized.

## 9. Frozen read-only Inspector integration

`src/ui/simulation-balancing-observation.js` owns only the read-only **Simulation Observation** projection.

The UI displays Session, Scenario, Runtime, Step, diagnostic Sim Time, bounded Sample count, current core metrics and deltas plus optional Stock/Production/Transport observations.

The UI refresh timer is presentation-only; it does not sample or advance simulation. Samples are created only by the registered Scheduler maintenance system.

Visible/build identity remains `IM-15E-SIMULATION-BALANCING-OBSERVATION-FOUNDATION`.

## 10. IM-15E Completion / Regression / Freeze Gate

Regression against frozen IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741` before freeze-status synchronization confirmed:

- **10 commits ahead / 0 behind**,
- exactly eight permitted changed files,
- no `scheduler.js`, `runtime.js`, Domain or Transport owner modification,
- no IM-15 Whole-Block freeze functionality.

Static verification confirmed:

- exactly one Scheduler observer in `maintenance`,
- Scheduler `dtMs` as the only diagnostic time increment,
- hard bounded history limit 120,
- deeply frozen samples/deltas/history projections,
- composition-reference based session separation,
- no Runtime/Domain/Scheduler write-back or balancing feedback,
- frozen IM-14 and IM-15A/B/C/D ownership preserved.

Technical evidence:

- CI Baseline `34272335658` on code/build-identity head `99a8557935a0849286d7f50d73eb1bd8c50640ac`: **SUCCESS**,
- Pages `34272541677` on implementation/documentation head `c4f7a9451fe6c3c4ad633536cac95b5bca48ac43`: **SUCCESS**.

Real iPad/Safari evidence at 2026-09-08 22:12–22:13 local confirmed:

- initial `READY`, `session:0001`, Step/Samples `0/0`, correct IM-15E build identity,
- while `RUNNING`, Step and Samples advance together (e.g. `26/26`, later `114/114`),
- after `PAUSE`, observation stops advancing,
- `SINGLE_STEP` from paused advances exactly one step/sample (`66/66` → `67/67`) and exactly `100 ms`,
- at Step `131`, bounded Samples remain capped at `120`,
- `RESET_BASELINE_MINIWORLD` creates `session:0002` with Step/Sim Time/Samples reset to `0`,
- Population `3`, Gold `3`, Buildings `3`, Persons `3`, Jobs `0`, Resources `0` remain authoritative after sampling,
- Stock/Production/Transport remain `UNAVAILABLE` rather than synthesized,
- frozen IM-15D actions and IM-15C world overlays remain intact.

**Gate result: IM-15E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 11. Explicit exclusions remain unimplemented

- automatic/manual gameplay mutation based on metrics,
- automatic balancing/correction or thresholds that alter simulation rules,
- fast-forward/repeated measurement steps,
- configurable simulation speed/tick duration,
- new gameplay events only for Inspector metrics,
- SaveGame persistence of observation history,
- telemetry/upload,
- unbounded history,
- estimated/invented metrics,
- charts/heatmaps in this Foundation step,
- new selection/pointer/touch/camera semantics.

## 12. Current gate

IM-15E is frozen. IM-15 as a whole remains **IN PROGRESS / NOT FROZEN**.

The next permissible action is exclusively **IM-15 Whole-Block Completion / Regression / Freeze Gate** against the frozen IM-14 baseline and all frozen IM-15A/B/C/D/E substeps. No next migration block is authorized before that gate.

## 13. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15E Simulation & Balancing Observation Foundation COMPLETE / FROZEN / PASS / 0 BLOCKER after full diff, CI/Pages, static read-only/history/session verification and seven real iPad screenshots. IM-15 remains IN PROGRESS / NOT FROZEN.
