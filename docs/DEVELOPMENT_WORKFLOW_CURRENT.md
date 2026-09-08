# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-block branch: `feature/im-15-guidance-inspector`
- Whole-block branch base: frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current migration block: **IM-15 – Guidance / Inspector: DEFINED / NOT IMPLEMENTED**
- First planned subblock: **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract**

## 2. Frozen predecessor line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

Frozen IM-14 substeps:

- IM-14A – Player UI Shell & Responsive Surface Contract,
- IM-14B – Unified Pointer / Touch Interaction Contract,
- IM-14C – Runtime HUD Projection,
- IM-14D – World Selection & Context Projection,
- IM-14E – Player Camera Controls Integration.

Authoritative frozen IM-14 baseline for IM-15: `053d4cc7f8befdb747ebce9afb755f286e2b0682`.

## 3. IM-15 – Guidance / Inspector reconciliation

IM-15 establishes a modular diagnostic, observation, guidance and later simulation/balancing surface over already authoritative runtime systems. It does not become an owner of gameplay/domain/persistence state.

Binding sequence:

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract**
   - establish the Inspector shell/boundary in the modular architecture, separate from the Player UI Shell,
   - observe existing authoritative runtime state only,
   - first narrow observation set: Runtime/World basics, Population, Gold and selected Building/Person identity,
   - no runtime/domain mutation,
   - no simulation controls, scenario triggering, world overlays or balancing functions yet.

2. **IM-15B – Structured Runtime Diagnostics Projection**
   - extend read-only structured diagnostics across existing authoritative owners such as Buildings/Stocks, Persons/Workforce, Jobs/Carrier, Movement/Routes, Cell Occupancy, Reservations/Queues/Deadlocks, Construction/Production and Path/Wear,
   - no second truth and no direct mutation.

3. **IM-15C – World Diagnostic Overlay Foundation**
   - add diagnostic-only world visualization for existing runtime facts such as occupancy, path/road classification, reservations, carrier/route relationships and stable object identities,
   - no gameplay/world mutation.

4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions**
   - allow controlled triggering of reproducible existing diagnostic/test scenarios through explicit runtime/test boundaries,
   - Inspector must not directly repair or mutate domain state outside those boundaries.

5. **IM-15E – Simulation & Balancing Observation Foundation**
   - establish long-running observation/collection for scheduler/tick behavior, throughput, stocks, transport/wait behavior, production/population development and other balancing metrics,
   - observation/collection only; no balancing AI or rule changes.

A separate **IM-15 Whole-Block Completion / Regression / Freeze Gate** follows only after all authorized IM-15 substeps are individually complete and frozen.

## 4. Binding IM-15 architectural boundary

- IM-15 owns no new gameplay/domain/persistence truth.
- Inspector reads existing authoritative owners and visualizes their state.
- Later Inspector actions are allowed only through explicit diagnostic/test/runtime boundaries.
- Automated tests remain test code; Inspector may later display results or trigger reproducible scenarios but does not replace test ownership.
- Legacy Inspector/debug architecture from `main` must not be imported; `main` remains historical reference only.
- No IM-15 implementation is implied by this reconciliation or by branch creation.

## 5. Current gate

The IM-15 Whole-Block branch exists and is based exactly on frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`.

IM-15 is **DEFINED / NOT IMPLEMENTED**.

The next permissible action is exclusively the separate **IM-15A Definition/Implementation Gate** for **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract**. This gate is not automatically executed by this control-state synchronization.

No IM-15A runtime/UI/Inspector implementation is authorized in the same step as this synchronization.

## 6. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15 whole-block branch control state synchronized against frozen IM-14. IM-15 is DEFINED / NOT IMPLEMENTED; IM-15A is the first planned subblock and requires a separate Definition/Implementation Gate before implementation.
