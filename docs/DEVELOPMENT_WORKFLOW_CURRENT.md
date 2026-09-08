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
- **IM-15B – Structured Runtime Diagnostics Projection: DEFINED / NOT IMPLEMENTED**

## 2. Frozen predecessor line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen IM-15A baseline for IM-15B: `f0eb70e1501d19c60b264699dde2a2ed05a5959b`.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
   - separate Inspector shell alongside Player UI ownership,
   - read-only projection from existing authoritative runtime owners,
   - Runtime/World basics, Population, Gold and selected Building/Person identity,
   - IM-14D Selection reused read-only; no new selection semantics,
   - visible/build identity `IM-15A-INSPECTOR-SHELL-READ-ONLY-RUNTIME-OBSERVATION`,
   - no runtime/domain/persistence mutation.

2. **IM-15B – Structured Runtime Diagnostics Projection — DEFINED / NOT IMPLEMENTED**
   - extend the frozen IM-15A read-only Inspector with structured diagnostics from existing authoritative runtime owners,
   - diagnostics may be grouped into dedicated Inspector sections/lists,
   - no second gameplay/domain/persistence truth and no direct mutation ownership,
   - no legacy Inspector/debug architecture from `main`.

3. **IM-15C – World Diagnostic Overlay Foundation — PLANNED / NOT IMPLEMENTED**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**
5. **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no new gameplay/domain/persistence truth.
- Inspector reads existing authoritative owners and visualizes their state.
- Later Inspector actions are allowed only through explicit diagnostic/test/runtime boundaries.
- Automated tests remain test code; Inspector may later display results or trigger reproducible scenarios but does not replace test ownership.
- Legacy Inspector/debug architecture from `main` must not be imported; `main` remains historical reference only.

## 5. Frozen IM-15A boundary

Frozen IM-15A surfaces remain unchanged:

- separate Inspector shell,
- Runtime/World basics,
- Population,
- Gold,
- read-only Building/Person selection reuse from IM-14D,
- responsive presentation,
- synchronized IM-15A build identity.

The Inspector continues to read only existing `CleanRuntime` sources and the existing `IM14DWorldSelectionContext`; it introduces no second gameplay truth and no mutation API.

## 6. Binding IM-15B definition

IM-15B may add structured read-only diagnostic projection only for runtime facts that already have authoritative owners/read boundaries.

Permitted diagnostic groups:

- **Buildings / Stocks:** existing Building identities and already authoritative local stock state,
- **Persons / Workforce:** existing Person identities and already authoritative workforce/assignment state,
- **Jobs / Carriers:** existing TransportJob and Carrier state,
- **Movement / Routes:** existing movement/navigation/route state where already authoritative and readable,
- **Cell Occupancy / Reservations / Queues / Deadlocks:** existing traffic, occupancy, reservation, queue and deadlock state,
- **Construction / Production:** existing construction/production state and already authoritative stock relationships,
- **Path / Wear:** existing PATH/ROAD classification and already authoritative wear state.

Binding implementation rules:

- Inspector projection remains read-only,
- existing snapshots/stores/contracts/read methods may be used,
- no new Domain API may be invented solely for Inspector convenience when an existing authoritative read boundary already exposes the required fact,
- if a diagnostic group does not currently have a clean existing read boundary, it must be omitted or explicitly reported as unavailable/blocking rather than creating new ownership inside IM-15B,
- frozen IM-15A and IM-14 Player UI/HUD/Selection/Pointer/Camera boundaries must remain unchanged.

Explicitly excluded from IM-15B:

- world diagnostic overlays, highlights or world-linked visualization — IM-15C,
- scenario/test triggers, pause/start/step controls, repair/reset or direct state editing — IM-15D,
- long-running throughput/history metrics, balancing analysis or automation — IM-15E,
- gameplay/domain/persistence mutation of any kind.

## 7. Current gate

IM-15B is **DEFINED / NOT IMPLEMENTED** against frozen IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`.

The next permissible action is exclusively the separate **IM-15B Definition/Implementation Gate** on `feature/im-15-guidance-inspector`, where the exact implementation surface must be checked against currently available authoritative read boundaries before any code change begins.

No IM-15C function and no world overlay/scenario/simulation functionality is authorized.

## 8. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15B Structured Runtime Diagnostics Projection reconciled and DEFINED / NOT IMPLEMENTED against frozen IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`. Next permissible action is the separate IM-15B Definition/Implementation Gate only.
