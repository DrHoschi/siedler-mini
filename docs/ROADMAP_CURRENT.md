# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-15B now also remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

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
- **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15C – World Diagnostic Overlay Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**,
- **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 5. Frozen IM-15A boundary

IM-15A remains the frozen owner of:

- separate Inspector shell distinct from the frozen IM-14 Player UI shell,
- read-only Runtime/World basic observation,
- Population and Gold projection,
- read-only selected Building/Person identity reuse from IM-14D,
- responsive Inspector presentation.

IM-15B preserves this boundary and adds a separate diagnostics projector rather than replacing the IM-15A projector.

## 6. Frozen IM-15B capability boundary

Implemented and frozen read-only diagnostics use only currently live authoritative boundaries:

- **Buildings:** existing `domains.buildings` records,
- **Persons:** existing `domains.units` records,
- **Jobs:** existing `domains.jobs` records,
- **Resources:** existing `domains.resources` records,
- **Movement / Navigation:** already exposed carrier movement, runtime navigation validation and reachability evidence,
- **Path Classification:** existing `pathClassification.entries()`.

Within Building/Person records, Stock, Construction, Production, Resident, Workforce and Carrier detail is displayed only when that fact already exists in the authoritative record.

Explicitly omitted/unavailable rather than synthesized:

- live Cell Occupancy / Reservations / Queues / Deadlocks,
- a complete live Route registry,
- live Wear state.

No new owner or read API was added merely to fill these gaps.

## 7. IM-15B freeze evidence

Corrected implementation head before final gate-status synchronization: `ac6a202f8f1a70343c4064b810c73c15c8f5fd8e`.

Full regression against frozen IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b` confirmed:

- **11 commits ahead / 0 behind**,
- exactly seven permitted changed files: the two control files, `index.html`, `src/main.js`, `src/runtime/config.js`, `src/ui/app.css`, and new `src/ui/inspector-structured-runtime-diagnostics.js`,
- `src/main.js` changed only by the RuntimeConfig cache-identity query,
- frozen IM-15A projector and frozen IM-14 Player UI/HUD/Selection/Pointer/Camera ownership remained unchanged,
- read-only projector uses existing snapshots/evidence and DOM rendering only; no Domain/Transport mutation API is called.

Technical evidence:

- CI Baseline run `34210936764` on code-corrected head `be297c924876063075bedfe6982f86f3ad1d0308`: **SUCCESS**,
- final pre-freeze head `ac6a202f8f1a70343c4064b810c73c15c8f5fd8e` differs afterward only by Roadmap control-state synchronization,
- Pages run `34210971362` on `ac6a202f8f1a70343c4064b810c73c15c8f5fd8e`: **SUCCESS**.

Real iPhone/Safari evidence at 2026-09-08 11:35 local confirmed:

- Runtime `READY`, Population `3`, Gold `3`, correct World Basics,
- Inspector `READ ONLY`,
- build identity `IM-15B-STRUCTURED-RUNTIME-DIAGNOSTICS-PROJECTION`,
- Structured Diagnostics active with `3 Buildings · 3 Persons · 0 Jobs · 0 Resources · 2 Paths`,
- frozen selection/context behavior remained operational.

The former stale IM-15A build-identity blocker is resolved.

**Gate result: IM-15B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 8. Explicit exclusions remaining after IM-15B

Still unimplemented:

- world diagnostic overlays/highlights — IM-15C,
- scenario/test triggering, pause/start/step, repair/reset or direct editing — IM-15D,
- long-running metrics/history/throughput and balancing analysis or automation — IM-15E,
- any gameplay/domain/persistence mutation.

## 9. Current gate

IM-15B is frozen. IM-15 remains **IN PROGRESS / NOT FROZEN**.

The next and only permissible action is the separate **reconciliation/definition of IM-15C – World Diagnostic Overlay Foundation** against frozen IM-15B. No IM-15C implementation is authorized in the same step.

---

**Updated:** 2026-09-08 — IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER. Next permissible action is IM-15C reconciliation/definition only.
