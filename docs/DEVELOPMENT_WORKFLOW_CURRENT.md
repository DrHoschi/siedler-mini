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
- **IM-15E – Simulation & Balancing Observation Foundation: DEFINED / NOT IMPLEMENTED**

## 2. Frozen predecessor line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen IM-15D baseline for IM-15E: `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
2. **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**
3. **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — COMPLETE / FROZEN / PASS / 0 BLOCKER**
5. **IM-15E – Simulation & Balancing Observation Foundation — DEFINED / NOT IMPLEMENTED**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no second gameplay/domain/persistence truth.
- Inspector observation remains read-only except for explicitly allowlisted IM-15D diagnostic actions.
- IM-15E may observe and derive diagnostic metrics, but may not feed those metrics back into gameplay/domain/runtime rules.
- Automated tests remain test code.
- Legacy Inspector/debug architecture from `main` must not be imported.

## 5. Frozen IM-15D predecessor boundary

The frozen IM-15D allowlist remains exactly:

- `START`,
- `PAUSE`,
- `SINGLE_STEP`,
- `RESET_BASELINE_MINIWORLD`.

The frozen single active Runtime composition remains the only scenario-dependent authoritative truth behind the stable `window.CleanRuntime` facade.

IM-15E must not extend IM-15D into fast-forward, repeated stepping, arbitrary step durations, generic state editing or additional lifecycle actions.

## 6. IM-15E defined observation contract

IM-15E is a purely observational, scheduler-synchronous and bounded simulation/balancing diagnostics layer.

It may collect existing authoritative runtime/domain facts at defined scheduler boundaries and derive clearly marked diagnostic deltas/time-series values from those facts.

It may not alter simulation state, gameplay rules, balancing parameters, persistence state or scheduler behavior.

## 7. Scheduler-synchronous observation boundary

IM-15E must use the existing Scheduler as the only simulation cadence source.

The existing Scheduler owns:

- configured fixed `stepMs`,
- phase ordering,
- registered systems,
- start/pause/single-step execution.

IM-15E must not create a second simulation timer or simulation clock.

The preferred observation boundary is one read-only diagnostics sampler registered at the end of a Scheduler step, using the existing `maintenance` phase.

Diagnostic timeline values may include:

- observed `stepCount`,
- `simulatedMs = stepCount × configured fixed stepMs`,
- current Runtime state,
- active scenario identity.

`simulatedMs` is diagnostic derived time only and is not a new gameplay-time owner.

## 8. Authoritative sampling sources

Each IM-15E sample may read only already authoritative sources exposed by the current active composition/runtime facade.

The first defined source set is:

- Runtime lifecycle state,
- active Scenario ID,
- configured Scheduler fixed `stepMs`,
- Population,
- Gold,
- `CoreDomainStores.snapshot()` for Buildings, Persons/Units, Jobs and Resources,
- only Stock/Production/Transport fields that are actually present in those authoritative records/read boundaries.

Missing data must remain unavailable. IM-15E must not synthesize runtime facts that do not exist.

## 9. Source facts versus derived diagnostics

IM-15E must keep authoritative source facts and diagnostic derivations conceptually separate.

Examples:

- `Gold = 3` is an authoritative sampled fact,
- `Gold delta = +1 since previous sample` is an IM-15E derived diagnostic,
- `Population = 3` is an authoritative sampled fact,
- `Population delta = 0` is an IM-15E derived diagnostic,
- `simulatedMs = stepCount × fixedStepMs` is an IM-15E diagnostic timeline value.

Derived metrics must never become gameplay/domain inputs.

## 10. First defined observation/metric set

The first IM-15E observation set is limited to:

- Step count,
- simulated diagnostic time,
- Runtime state,
- Scenario ID,
- Population,
- Gold,
- Building count,
- Person/Unit count,
- Job count,
- Resource count,
- only already present Stock/Production/Transport fields,
- delta to the immediately previous sample for supported numeric/count values.

No throughput, wait-time, utilization, production-rate, deadlock-frequency or similar metric may be invented without an existing authoritative state/event source.

If a defined metric has no source in the current composition, it must be represented as unavailable rather than estimated.

## 11. Bounded diagnostic history

IM-15E may maintain a bounded in-memory observation history for diagnostics only.

Binding requirements:

- history size must be explicitly bounded,
- samples/results must be immutable/frozen diagnostic data,
- history is not Domain state,
- history is not SaveGame state,
- history is not written back into gameplay/runtime owners,
- no telemetry/upload is introduced.

## 12. Scenario reset/session boundary

A successful frozen IM-15D `RESET_BASELINE_MINIWORLD` creates a new active composition.

IM-15E must therefore start a new observation session or clear/reinitialize its current bounded history when the active scenario composition is reset/replaced.

Samples from different scenario instances must not be silently joined into one continuous time series.

IM-15D remains the action owner; IM-15E does not trigger resets itself.

## 13. Inspector projection boundary

The first IM-15E UI surface is limited to a compact read-only **Simulation Observation** section.

It may show current sample/session information such as:

- step count,
- simulated diagnostic time,
- sample count,
- Runtime state,
- Scenario ID,
- Population / delta,
- Gold / delta,
- Buildings / Persons / Jobs / Resources counts and deltas,
- supported existing Stock/Production/Transport observation values.

No interactive balancing controls, thresholds, automatic PASS/FAIL rules or state editing belong to IM-15E.

## 14. Explicit IM-15E exclusions

Not part of IM-15E:

- automatic or manual gameplay-value changes based on metrics,
- automatic balancing/correction,
- thresholds that alter production/transport/gold/population rules,
- new Runtime/Domain/Transport gameplay rules,
- fast-forward or repeated stepping for data generation,
- caller-configurable simulation speed or step duration,
- new Domain/Transport/Production/Path/Wear events created only for Inspector convenience,
- SaveGame persistence of diagnostic history,
- telemetry/upload,
- unbounded history,
- invented/estimated metrics without authoritative sources,
- new selection/pointer/touch/camera semantics.

## 15. Frozen IM-15D evidence remains binding

Frozen IM-15D head: `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

Its PASS / 0 BLOCKER action, composition, CI/Pages and real iPad evidence remain predecessor requirements for IM-15E and must not regress.

## 16. Current gate

IM-15E is **DEFINED / NOT IMPLEMENTED** against frozen IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

No IM-15E implementation has been authorized or performed in this documentation step.

The next permissible action is exclusively the separate **IM-15E Definition/Implementation Gate**: inspect the current repository to determine the exact scheduler observation hook, bounded session/history contract, immutable sample/delta model and Inspector integration surface that can be implemented entirely as observation without introducing a second simulation truth or balancing control. No IM-15E code implementation is authorized in the same step.

## 17. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15E Simulation & Balancing Observation Foundation documented as DEFINED / NOT IMPLEMENTED against frozen IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`. No IM-15E implementation in this step.
