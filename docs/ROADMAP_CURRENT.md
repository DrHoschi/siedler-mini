# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15E DEFINED / NOT IMPLEMENTED  
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
- **IM-15E – Simulation & Balancing Observation Foundation — DEFINED / NOT IMPLEMENTED**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 4. Frozen IM-15D predecessor boundary

The frozen IM-15D allowlist remains exactly:

- `START`,
- `PAUSE`,
- `SINGLE_STEP`,
- `RESET_BASELINE_MINIWORLD`.

The frozen single active Runtime composition remains the only scenario-dependent authoritative truth behind `window.CleanRuntime`.

IM-15E must not expand IM-15D into fast-forward, repeated stepping, arbitrary step duration, generic state editing or additional lifecycle actions.

## 5. IM-15E defined capability boundary

IM-15E is a purely observational, scheduler-synchronous and bounded simulation/balancing diagnostics foundation.

It may sample already authoritative Runtime/Domain facts at defined scheduler boundaries and derive clearly identified diagnostic deltas/time-series values from those facts.

It owns no gameplay/domain/persistence truth and must never feed diagnostic metrics back into simulation rules or balancing parameters.

## 6. Scheduler / timeline observation

The existing Scheduler remains the only simulation cadence/time-step owner.

IM-15E must not introduce a second simulation timer or clock.

The preferred first sampling boundary is one read-only diagnostics sampler registered at the end of the Scheduler step in the existing `maintenance` phase.

Defined timeline observations:

- observed step count,
- diagnostic simulated time derived from `stepCount × configured fixed stepMs`,
- current Runtime lifecycle state,
- current Scenario ID.

Derived simulated time is diagnostics only and is not gameplay time.

## 7. Authoritative sample sources

The first defined IM-15E sample may read only existing authoritative boundaries:

- Runtime state,
- active Scenario ID,
- Scheduler fixed `stepMs`,
- Population,
- Gold,
- existing `CoreDomainStores.snapshot()` for Buildings, Persons/Units, Jobs and Resources,
- Stock/Production/Transport fields only where they actually exist in current authoritative records/read boundaries.

Absent values remain unavailable rather than estimated or synthesized.

## 8. First metric set

The first IM-15E observation/metric set is limited to:

- Step count,
- diagnostic simulated time,
- Runtime state,
- Scenario ID,
- Population and delta,
- Gold and delta,
- Building count and delta,
- Person/Unit count and delta,
- Job count and delta,
- Resource count and delta,
- only existing Stock/Production/Transport values and supported deltas.

Throughput, wait time, utilization, production rate, deadlock frequency or similar metrics are unavailable until an authoritative state/event source exists for them.

## 9. Bounded observation history

IM-15E may hold only a bounded in-memory diagnostics history.

Binding requirements:

- explicit finite history limit,
- immutable/frozen samples and derived results,
- no Domain ownership,
- no SaveGame persistence,
- no write-back into Runtime/gameplay owners,
- no telemetry/upload,
- no unbounded accumulation.

## 10. Scenario reset/session semantics

A successful frozen IM-15D `RESET_BASELINE_MINIWORLD` replaces the active scenario composition.

IM-15E must therefore begin a new observation session or clear/reinitialize the current bounded history when the active composition is replaced.

Samples from distinct scenario instances must not be silently joined into one continuous time series.

IM-15D remains the sole owner of reset/action execution.

## 11. Inspector observation surface

The first IM-15E UI surface is limited to a compact read-only **Simulation Observation** section.

It may display current session/sample values including:

- Step,
- simulated diagnostic time,
- sample count,
- Runtime state,
- Scenario ID,
- Population / delta,
- Gold / delta,
- Buildings / Persons / Jobs / Resources counts and deltas,
- supported existing Stock/Production/Transport observation values.

No interactive balancing controls, thresholds, automatic PASS/FAIL decision logic or state editing are part of IM-15E.

## 12. Explicit IM-15E exclusions

Not part of IM-15E:

- automatic or manual gameplay changes based on metrics,
- automatic balancing/correction,
- thresholds that alter production/transport/gold/population rules,
- new Runtime/Domain/Transport gameplay rules,
- fast-forward/repeated stepping for measurement generation,
- caller-configurable simulation speed or tick duration,
- new gameplay events created solely for Inspector metrics,
- SaveGame persistence of observation history,
- telemetry/upload,
- unbounded history,
- invented metrics without authoritative sources,
- new selection/pointer/touch/camera semantics.

## 13. Frozen IM-15D evidence remains binding

Frozen IM-15D head: `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

Its PASS / 0 BLOCKER action/composition boundary, CI/Pages and real iPad evidence remain predecessor requirements for IM-15E.

## 14. Current gate

IM-15E is **DEFINED / NOT IMPLEMENTED** against frozen IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

No IM-15E implementation was performed in this documentation step.

The next and only permissible action is the separate **IM-15E Definition/Implementation Gate**: inspect the current repository and derive the exact scheduler observation hook, bounded session/history contract, immutable sample/delta model and read-only Inspector integration surface that can be implemented without introducing a second simulation truth or balancing control. No IM-15E code implementation in the same step.

---

**Updated:** 2026-09-08 — IM-15E Simulation & Balancing Observation Foundation = DEFINED / NOT IMPLEMENTED against frozen IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`. No implementation in this step.
