# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-27A browser freeze gate exposed / device PASS pending  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen gameplay baseline:** **CR-26 – Workforce Capability & Job Eligibility Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Whole CR-26 frozen marker:

`frozen/cr-26-workforce-capability-job-eligibility-foundation`

CR-27 starts from frozen CR-26 HEAD `8b06aa4a14793628c608a7fcf822cb9576bbf5b5`.

## 2. Accepted current system block

# CR-27 – Game-Facing Logistics Integration Foundation

System chain:

`CR-25 BuildingStock → Logistics Intent/Reservation → CR-26 Workforce → existing transport runtime → Delivery → CR-25 BuildingStock`

### CR-27A – BuildingStock Transport Intent & Reservation Bridge

**IMPLEMENTED / BROWSER FREEZE GATE EXPOSED / AWAITING DEVICE PASS / NOT FROZEN**

Implemented boundary:

- stable `transport-reservation:` identity,
- stable source and target `building:` IDs,
- stable `resource-type:` ID,
- positive safe-integer amount,
- immutable `ACTIVE -> RELEASED` lifecycle,
- deterministic active-reservation accumulation,
- `available = physical stock - active reserved amount`,
- deterministic over-reservation rejection,
- released reservations no longer consume availability,
- physical CR-25 BuildingStock remains unchanged by reserve/release.

Direct self-test and Node runner are present. The dedicated browser Verification / Freeze Gate is now exposed.

### CR-27B – Workforce-Aware Transport Dispatch Integration

Not started. May begin only after CR-27A is **PASS / FROZEN / 0 BLOCKER**.

### CR-27C – Delivered Transport → BuildingStock Settlement

Not started. May begin only after CR-27B is frozen.

After A/B/C, run a whole **CR-27 Completion / Regression / Freeze Gate**.

## 3. CR-27A current gate boundary

The browser gate regressions cover:

- direct CR-27A self-test regression,
- valid and exact-fit accumulated reservations,
- aggregate over-commit rejection,
- release availability recovery,
- unchanged physical BuildingStock,
- source/resource isolation and deterministic accounting through the direct tests,
- stable-ID/amount validation and duplicate reservation protection through the direct tests,
- no Person/Carrier/TransportJob/path/movement/delivery/settlement leakage.

Required browser/device result:

`CR-27A BUILDINGSTOCK TRANSPORT INTENT & RESERVATION BRIDGE VERIFICATION / FREEZE GATE: PASS / 0 BLOCKER`

Only that browser **PASS / 0 BLOCKER** permits the immutable CR-27A marker.

## 4. CR-27 global non-scope

No new pathfinding, routes, traffic algorithms, traffic reservation semantics, deadlock logic, Carrier AI, production timing, construction work, job prioritization/scoring, graphics, Inspector, balancing or SaveGame ownership.

CR-27 integrates existing owners; it does not replace frozen CR-25/CR-26 or rebuild the mature `src/transport/*` foundation.

## 5. Branch / gate policy

- One CR-27 development branch: `feature/cr-27-game-facing-logistics-integration-foundation`.
- A/B/C proceed sequentially on that branch.
- Each sub-block gets direct tests and a browser Verification / Freeze Gate.
- Only PASS / 0 BLOCKER may create its immutable frozen marker.
- Frozen sub-block markers do not become the GitHub Pages development source; Pages remains on the active CR-27 branch during the whole CR-27 cycle.
- Whole CR-27 becomes FROZEN only after the final combined regression/invariant/scope gate passes.

---

**Updated:** 2026-09-06 after exposing the CR-27A browser Verification / Freeze Gate. Next step: device/browser verification; CR-27A remains NOT FROZEN until PASS / 0 BLOCKER.
