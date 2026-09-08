# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER / IM-15 DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-14 – UI / Mobile Foundation is COMPLETE / FROZEN / PASS / 0 BLOCKER as a whole block.**

Frozen IM-14 substeps:

- IM-14A – Player UI Shell & Responsive Surface Contract,
- IM-14B – Unified Pointer / Touch Interaction Contract,
- IM-14C – Runtime HUD Projection,
- IM-14D – World Selection & Context Projection,
- IM-14E – Player Camera Controls Integration.

Authoritative frozen IM-14 baseline for IM-15: `053d4cc7f8befdb747ebce9afb755f286e2b0682`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — COMPLETE / FROZEN**,
- **IM-15 – Guidance / Inspector — DEFINED / NOT IMPLEMENTED**.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — PLANNED / NOT IMPLEMENTED**
2. **IM-15B – Structured Runtime Diagnostics Projection — PLANNED / NOT IMPLEMENTED**
3. **IM-15C – World Diagnostic Overlay Foundation — PLANNED / NOT IMPLEMENTED**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**
5. **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**
6. **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT EXECUTED**

## 4. Reconciled IM-15 boundaries

### IM-15A – Inspector Shell & Read-Only Runtime Observation Contract

First narrow IM-15 implementation boundary:

- create the Inspector shell/boundary in the modular architecture, separate from the Player UI Shell,
- read/display existing authoritative runtime state only,
- initial observation scope limited to Runtime/World basics, Population, Gold and selected Building/Person identity,
- no simulation controls,
- no scenario/test triggering,
- no world diagnostic overlays,
- no balancing functions,
- no gameplay/domain/persistence mutation.

### IM-15B – Structured Runtime Diagnostics Projection

Read-only structured projection of existing authoritative systems including Buildings/Stocks, Persons/Workforce, Jobs/Carrier, Movement/Routes, Cell Occupancy, Reservations/Queues/Deadlocks, Construction/Production and Path/Wear. No second truth and no direct mutation.

### IM-15C – World Diagnostic Overlay Foundation

Diagnostic-only visualization of existing runtime facts such as occupancy, path/road classification, reservations, route/carrier relationships and stable object identities. No world/gameplay mutation.

### IM-15D – Controlled Guidance / Diagnostic Scenario Actions

Controlled triggering of reproducible existing diagnostic/test scenarios only through explicit runtime/test boundaries. Inspector does not directly repair or mutate domain state.

### IM-15E – Simulation & Balancing Observation Foundation

Long-running observation/collection for scheduler/tick behavior, throughput, stocks, transport/wait behavior, production/population development and related balancing metrics. Observation/collection only; no balancing AI or rule changes.

## 5. Binding architectural boundary

- IM-15 owns no gameplay/domain/persistence truth.
- Inspector consumes existing authoritative owners and visualizes them.
- Later actions must cross explicit diagnostic/test/runtime boundaries.
- Automated tests remain test code; Inspector may later expose results or reproducible triggers without becoming test ownership.
- Legacy Inspector/debug architecture from `main` is not an implementation source and must not be imported.

## 6. Current gate

`feature/im-15-guidance-inspector` exists on frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`.

IM-15 is **DEFINED / NOT IMPLEMENTED**.

The next and only permissible action is the separate **IM-15A Definition/Implementation Gate** for **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract**.

That gate is not automatically executed by branch creation or this control-state synchronization. No IM-15A implementation is authorized in the same step.

---

**Updated:** 2026-09-08 — IM-15 branch control state synchronized against frozen IM-14; IM-15 is DEFINED / NOT IMPLEMENTED and IM-15A is the first planned subblock.
