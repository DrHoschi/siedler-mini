# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-27-game-facing-logistics-integration-foundation`
- Current immutable gameplay baseline: **CR-26 – Workforce Capability & Job Eligibility Foundation**
- Frozen baseline branch: `frozen/cr-26-workforce-capability-job-eligibility-foundation`
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**
- CR-27B – Workforce-Aware Transport Dispatch Integration: **NEXT ALLOWED / NOT STARTED / NOT FROZEN**

## 2. Frozen CR-27A boundary

CR-27A freezes the game-facing BuildingStock transport reservation boundary:

- immutable `building-stock-transport-reservation` records,
- stable `transport-reservation:` IDs,
- stable source/target `building:` IDs,
- stable `resource-type:` ID,
- positive safe-integer amount,
- lifecycle `ACTIVE -> RELEASED`,
- deterministic reserved/available amount evaluation,
- deterministic rejection of duplicate reservation IDs and over-reservation,
- source/resource isolation,
- release restoring transport availability without changing physical BuildingStock.

Availability invariant:

`availableForNewTransport = physicalBuildingStockQuantity - sum(ACTIVE reservation amounts for the same source Building/resource type)`

The device/browser **CR-27A Verification / Freeze Gate** passed with **PASS / 0 BLOCKER** on 2026-09-06.

## 3. Frozen CR-27A exclusions

CR-27A contains no:

- physical source withdrawal or target stock addition,
- TransportJob creation,
- Person/Carrier selection or assignment,
- `CAN_SIMPLE_TRANSPORT` use,
- Reachability calculation,
- route/pathfinding/movement,
- traffic/deadlock processing,
- pickup/delivery/settlement,
- priority/scoring,
- production/construction/work execution,
- SaveGame/rendering/gameplay UI/Inspector/balancing ownership.

CR-25, CR-26 and existing `src/transport/*` contracts remain semantically unchanged.

## 4. Branch / Pages rule

- All CR-27A/B/C implementation stays on the single branch `feature/cr-27-game-facing-logistics-integration-foundation`.
- `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge` is the immutable CR-27A marker.
- Frozen sub-block markers are immutable and are not development branches.
- GitHub Pages must remain pointed at the active CR-27 development branch during the CR-27 cycle.

## 5. Next allowed action

The next allowed sub-block is **CR-27B – Workforce-Aware Transport Dispatch Integration** on the same CR-27 feature branch. Before implementation, define the exact CR-27B scope against frozen CR-27A, frozen CR-26 eligibility/assignment ownership and the existing transport runtime. Do not begin CR-27C.

---

**Updated:** 2026-09-06 after device/browser CR-27A Verification / Freeze Gate: **PASS / 0 BLOCKER**. CR-27A is **FROZEN**; CR-27B is the next allowed sub-block.