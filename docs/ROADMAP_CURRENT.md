# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A IMPLEMENTED / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

Authoritative frozen predecessor for IM-15:

- frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — COMPLETE / FROZEN**,
- **IM-15 – Guidance/Inspector — IN PROGRESS / NOT FROZEN**.

## 3. IM-15 reconciled capability boundary

IM-15 is a modular diagnostic/observation/guidance surface over existing authoritative runtime owners.

Binding rules:

- no new gameplay/domain/persistence truth,
- read existing authoritative owners rather than duplicate them,
- no legacy Inspector/debug architecture imported from `main`,
- later actions only through explicit diagnostic/test/runtime boundaries,
- automated tests remain test-owned.

## 4. IM-15 sequence

- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — IMPLEMENTED / NOT FROZEN**,
- **IM-15B – Structured Runtime Diagnostics Projection — PLANNED / NOT IMPLEMENTED**,
- **IM-15C – World Diagnostic Overlay Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**,
- **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 5. IM-15A – implemented boundary

IM-15A establishes only:

- a separate Inspector shell distinct from the frozen IM-14 Player UI shell,
- read-only Runtime/World basic observation,
- read-only Population and Gold projection from existing authoritative sources,
- read-only selected Building/Person identity reuse from the frozen IM-14D Selection owner,
- responsive Inspector presentation,
- synchronized visible/build identity `IM-15A-INSPECTOR-SHELL-READ-ONLY-RUNTIME-OBSERVATION`.

Explicitly excluded and still unimplemented:

- Stocks/Workforce/Jobs/Carrier/Routes/Occupancy/Reservations/Queues/Deadlocks/Construction/Production/Path-Wear structured diagnostics,
- world diagnostic overlays,
- scenario/test trigger actions,
- arbitrary state editing or repair,
- long-running simulation/balancing metrics,
- balancing automation or rule changes.

## 6. Current gate

IM-15A is **IMPLEMENTED / NOT FROZEN**.

The next and only permissible action is the separate **IM-15A Completion / Regression / Freeze Gate** against frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`.

That gate must verify the full diff, CI/Pages evidence, read-only ownership boundary, IM-14 Player UI/HUD/Selection/Pointer/Camera regressions, visible build identity and real browser/device evidence.

No IM-15B implementation is authorized before IM-15A reaches PASS / 0 BLOCKER and is frozen.

---

**Updated:** 2026-09-08 — IM-15A implementation complete within its narrow Inspector Shell & Read-Only Runtime Observation boundary. IM-15A remains NOT FROZEN; next permissible action is its Completion / Regression / Freeze Gate only.
