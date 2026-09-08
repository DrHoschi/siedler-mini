# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B IMPLEMENTED / NOT FROZEN  
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
- **IM-15B – Structured Runtime Diagnostics Projection — IMPLEMENTED / NOT FROZEN**,
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

## 6. IM-15B implemented capability boundary

The IM-15B Definition/Implementation Gate confirmed only the following currently live authoritative read boundaries for implementation:

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

No new owner or read API is added merely to fill these gaps.

## 7. IM-15B build identity correction

Real iPhone/Safari evidence at 2026-09-08 11:33 local showed the IM-15B page/status while the Inspector `Build` field still contained the stale IM-15A RuntimeConfig build identity.

Repository verification showed `src/runtime/config.js` already contained `IM-15B-STRUCTURED-RUNTIME-DIAGNOSTICS-PROJECTION`, while `src/main.js` still imported `./runtime/config.js` without the IM-15B cache identity. The top-level `main.js?v=im15b-1` query therefore did not guarantee a fresh dependency module on Safari.

The correction is limited to versioning that existing import as `./runtime/config.js?v=im15b-1`. No gameplay/runtime behavior, Domain owner or Transport owner was changed.

## 8. IM-15B explicit exclusions

Still unimplemented:

- world diagnostic overlays/highlights — IM-15C,
- scenario/test triggering, pause/start/step, repair/reset or direct editing — IM-15D,
- long-running metrics/history/throughput and balancing analysis or automation — IM-15E,
- any gameplay/domain/persistence mutation.

The frozen IM-14 Player UI/HUD/Selection/Pointer/Camera contracts and frozen IM-15A observation behavior must remain regressionsafe.

## 9. Current gate

IM-15B is **IMPLEMENTED / NOT FROZEN** against frozen IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`.

The next and only permissible action is continuation of **IM-15B – Completion / Regression / Freeze Gate** with corrected real-device build-identity verification, full diff, CI/Pages, read-only ownership verification and frozen predecessor regression. IM-15B may be frozen only at **PASS / 0 BLOCKER**.

No IM-15C implementation is authorized in the same step.

---

**Updated:** 2026-09-08 — IM-15B remains IMPLEMENTED / NOT FROZEN. Safari build-identity cache-chain corrected by versioning the RuntimeConfig import; real-device confirmation and freeze gate remain pending.
