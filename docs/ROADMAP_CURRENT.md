# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-27A frozen / CR-27B next  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen gameplay baseline:** **CR-26 – Workforce Capability & Job Eligibility Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**.

Whole CR-26 frozen marker:

`frozen/cr-26-workforce-capability-job-eligibility-foundation`

CR-27A frozen marker:

`frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`

## 2. Current system block

# CR-27 – Game-Facing Logistics Integration Foundation

System chain:

`CR-25 BuildingStock → Logistics Intent/Reservation → CR-26 Workforce → existing transport runtime → Delivery → CR-25 BuildingStock`

### CR-27A – BuildingStock Transport Intent & Reservation Bridge

**PASS / FROZEN / 0 BLOCKER**

Frozen boundary:

- stable `transport-reservation:` identity,
- stable source and target `building:` IDs,
- stable `resource-type:` ID,
- positive safe-integer amount,
- immutable `ACTIVE -> RELEASED` lifecycle,
- deterministic active-reservation accumulation,
- `available = physical stock - active reserved amount`,
- deterministic duplicate-ID and over-reservation rejection,
- released reservations no longer consume availability,
- physical CR-25 BuildingStock remains unchanged by reserve/release.

The device/browser **CR-27A Verification / Freeze Gate** passed with **PASS / 0 BLOCKER** on 2026-09-06.

### CR-27B – Workforce-Aware Transport Dispatch Integration

**NEXT ALLOWED / NOT STARTED / NOT FROZEN**

CR-27B may connect a frozen CR-27A reservation/intent to the existing transport runtime while using frozen CR-26 as the authoritative workforce eligibility/assignment owner. Required capability: `CAN_SIMPLE_TRANSPORT`. Existing `CarrierContract AVAILABLE/OCCUPIED` must not become a second gameplay availability truth.

### CR-27C – Delivered Transport → BuildingStock Settlement

Not started. May begin only after CR-27B is frozen.

After A/B/C, run a whole **CR-27 Completion / Regression / Freeze Gate**.

## 3. CR-27 global non-scope

No new pathfinding, routes, traffic algorithms, traffic reservation semantics, deadlock logic, Carrier AI, production timing, construction work, job prioritization/scoring, graphics, Inspector, balancing or SaveGame ownership.

CR-27 integrates existing owners; it does not replace frozen CR-25/CR-26 or rebuild the mature `src/transport/*` foundation.

## 4. Branch / gate policy

- One CR-27 development branch: `feature/cr-27-game-facing-logistics-integration-foundation`.
- A/B/C proceed sequentially on that branch.
- Each sub-block gets direct tests and a browser Verification / Freeze Gate.
- Frozen sub-block markers are immutable markers only and do not become the GitHub Pages development source.
- Pages remains on the active CR-27 branch during the whole CR-27 cycle.
- Whole CR-27 becomes FROZEN only after the final combined regression/invariant/scope gate passes.

## 5. Next required activity

Define the exact **CR-27B – Workforce-Aware Transport Dispatch Integration** boundary against frozen CR-27A, frozen CR-26 workforce ownership and the existing transport runtime. Do not implement CR-27C or new pathfinding/traffic behavior.

---

**Updated:** 2026-09-06 after CR-27A device/browser Verification / Freeze Gate: **PASS / 0 BLOCKER**. CR-27A is **FROZEN**; CR-27B is next.