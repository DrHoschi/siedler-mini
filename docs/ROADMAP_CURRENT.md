# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A now also remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen predecessor for IM-15 remains frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`; IM-15B must additionally preserve the frozen IM-15A boundary.

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

- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15B – Structured Runtime Diagnostics Projection — PLANNED / NOT IMPLEMENTED**,
- **IM-15C – World Diagnostic Overlay Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**,
- **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 5. Frozen IM-15A boundary

IM-15A establishes only:

- a separate Inspector shell distinct from the frozen IM-14 Player UI shell,
- read-only Runtime/World basic observation,
- read-only Population and Gold projection from existing authoritative sources,
- read-only selected Building/Person identity reuse from the frozen IM-14D Selection owner,
- responsive Inspector presentation,
- synchronized visible/build identity `IM-15A-INSPECTOR-SHELL-READ-ONLY-RUNTIME-OBSERVATION`.

The World Basics projection reads through the existing authoritative `MapStructure.map()` and `MapStructure.dimensions()` boundaries only.

Explicitly excluded and still unimplemented:

- Stocks/Workforce/Jobs/Carrier/Routes/Occupancy/Reservations/Queues/Deadlocks/Construction/Production/Path-Wear structured diagnostics,
- world diagnostic overlays,
- scenario/test trigger actions,
- arbitrary state editing or repair,
- long-running simulation/balancing metrics,
- balancing automation or rule changes.

## 6. IM-15A freeze evidence

Corrected implementation head before final gate-status synchronization: `e38a32268d587d3398e77211f2a4a22faa1bd79b`.

- full branch diff against frozen IM-14 remained limited to IM-15A/control surfaces,
- CI Baseline run `34208394304`: **SUCCESS**,
- Pages run `34208393550`: **SUCCESS**,
- real iPhone/Safari evidence at 2026-09-08 11:12 local confirmed Inspector `READ ONLY`, Runtime `READY`, Population `3`, correct IM-15A build identity, Person selection reuse and corrected World Basics `CR-32A World-backed Path Classification Contract Miniworld · 8×6 · Zelle 1`,
- frozen IM-14 Player HUD, world rendering and Selection/Context remained operational,
- no IM-15B functionality or mutation ownership introduced.

**Gate result: IM-15A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 7. Current gate

IM-15A is frozen. IM-15 remains **IN PROGRESS / NOT FROZEN**.

The next and only permissible action is the separate **reconciliation/definition of IM-15B – Structured Runtime Diagnostics Projection** against frozen IM-15A. No IM-15B implementation is authorized in the same step.

---

**Updated:** 2026-09-08 — IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER. Next permissible action is IM-15B reconciliation/definition only.
