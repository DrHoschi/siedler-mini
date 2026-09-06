# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – Post-CR27 planning  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen gameplay baseline:** **CR-27 – Game-Facing Logistics Integration Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Sub-blocks:

- CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**
- CR-27B – Workforce-Aware Transport Dispatch Integration: **PASS / FROZEN / 0 BLOCKER**
- CR-27C – Delivered Transport -> BuildingStock Settlement: **PASS / FROZEN / 0 BLOCKER**

Frozen markers:

- `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`
- `frozen/cr-27b-workforce-aware-transport-dispatch-integration`
- `frozen/cr-27c-delivered-transport-buildingstock-settlement`
- `frozen/cr-27-game-facing-logistics-integration-foundation`

## 2. Frozen CR-27 integrated capability

The frozen game-facing logistics chain is:

`CR-25 BuildingStock -> CR-27A ACTIVE Reservation -> CR-26 CAN_SIMPLE_TRANSPORT Workforce -> CR-27B Dispatch -> existing confirmed delivery evidence -> CR-27C Settlement -> CR-25 successor BuildingStock + CR-27A RELEASED + CR-26 FREE`

Whole-system device/browser Completion / Regression / Freeze Gate passed **PASS / 0 BLOCKER** on 2026-09-06.

CR-27 now guarantees:

- source availability protection before physical transfer,
- CR-26-authoritative workforce dispatch,
- reuse of the selected Person as execution `unitId`,
- no second Carrier availability truth,
- physical stock unchanged through reservation/dispatch,
- settlement only from correctly linked confirmed delivery,
- exact source decrement / target increment,
- quantity conservation,
- reservation closure and workforce release only after successful settlement,
- no partial result on linkage/state/underflow/overflow failure,
- no legacy Claim/Demand/ResourceState gameplay ownership.

## 3. Frozen CR-27 global non-scope

CR-27 did not add new pathfinding, route, movement, traffic, reservation-traffic, deadlock, Carrier-AI, production timing, construction work, job priority/scoring, graphics, Inspector, balancing or SaveGame ownership.

## 4. Next required activity

No next CR number/title is authorized yet.

The next activity is a short **live-repository IM ↔ CR reconciliation** against this frozen CR-27 baseline. It must inspect current migration/IM documents, remaining roadmap priorities and actual owner/runtime gaps before proposing the next minimal system block.

The resulting next CR and its A/B/C boundaries must be explicitly accepted before creating any new development branch or implementation.

## 5. Branch / gate policy

- The whole CR-27 frozen baseline is `frozen/cr-27-game-facing-logistics-integration-foundation`.
- The completed feature branch remains historical working context only.
- Frozen branches are immutable markers.
- Do not move into another system block based solely on prior chat assumptions.

---

**Updated:** 2026-09-06 after whole CR-27 Completion / Regression / Freeze Gate: **PASS / 0 BLOCKER**. Next step: post-CR27 live IM ↔ CR reconciliation.
