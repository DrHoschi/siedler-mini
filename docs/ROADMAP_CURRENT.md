# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen predecessor for IM-15B: frozen IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`.

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
- **IM-15B – Structured Runtime Diagnostics Projection — DEFINED / NOT IMPLEMENTED**,
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

IM-15B must preserve this boundary unchanged.

## 6. IM-15B – binding definition

IM-15B extends only the read-only Inspector diagnostics over facts that already exist in authoritative runtime owners.

Permitted structured groups:

- Buildings / Stocks,
- Persons / Workforce,
- Jobs / Carriers,
- Movement / Routes,
- Cell Occupancy / Reservations / Queues / Deadlocks,
- Construction / Production,
- Path / Wear.

For each group, only already authoritative/readable state may be projected. Existing stores, snapshots, contracts and read methods may be used. No second truth and no mutation ownership may be introduced.

If a group has no clean existing read boundary, IM-15B must omit it or expose it as unavailable/blocking rather than inventing a new Inspector-owned Domain API.

Structured presentation may use Inspector sections/lists only. Direct world visualization remains outside IM-15B.

Explicitly excluded and still unimplemented:

- world diagnostic overlays/highlights — IM-15C,
- scenario/test triggering, pause/start/step, repair/reset or direct editing — IM-15D,
- long-running metrics/history/throughput and balancing analysis or automation — IM-15E,
- any gameplay/domain/persistence mutation.

## 7. Current gate

IM-15B is **DEFINED / NOT IMPLEMENTED** against frozen IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`.

The next and only permissible action is the separate **IM-15B Definition/Implementation Gate** on `feature/im-15-guidance-inspector`. That gate must first verify which of the defined diagnostic groups already have clean authoritative read boundaries and then limit implementation strictly to those boundaries.

No IM-15C implementation, world overlay, scenario action or simulation/balancing functionality is authorized.

---

**Updated:** 2026-09-08 — IM-15B Structured Runtime Diagnostics Projection DEFINED / NOT IMPLEMENTED against frozen IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`. Next permissible action is the IM-15B Definition/Implementation Gate only.
