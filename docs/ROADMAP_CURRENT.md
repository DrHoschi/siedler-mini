# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-27C implemented / browser gate pending  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen gameplay baseline:** **CR-26 – Workforce Capability & Job Eligibility Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27A – BuildingStock Transport Intent & Reservation Bridge: **PASS / FROZEN / 0 BLOCKER**.

CR-27B – Workforce-Aware Transport Dispatch Integration: **PASS / FROZEN / 0 BLOCKER**.

Frozen markers:

- `frozen/cr-27a-buildingstock-transport-intent-reservation-bridge`
- `frozen/cr-27b-workforce-aware-transport-dispatch-integration`

## 2. Current system block

# CR-27 – Game-Facing Logistics Integration Foundation

System chain:

`CR-25 BuildingStock -> CR-27A Reservation -> CR-26 Workforce -> CR-27B Dispatch -> existing transport delivery evidence -> CR-27C Settlement -> CR-25 BuildingStock`

### CR-27A – BuildingStock Transport Intent & Reservation Bridge

**PASS / FROZEN / 0 BLOCKER**

ACTIVE reservation protects against double-disposition until settlement closure.

### CR-27B – Workforce-Aware Transport Dispatch Integration

**PASS / FROZEN / 0 BLOCKER**

Frozen dispatch uses CR-26 as the sole workforce owner and projects the selected Person into the existing transport execution foundation using the same stable `unit:` identity.

### CR-27C – Delivered Transport -> BuildingStock Settlement

**IMPLEMENTED / DIRECT TESTS ADDED / NOT FROZEN**

Implemented settlement boundary:

`confirmed delivered-cargo + frozen CR-27B dispatch + current source/target BuildingStock + current ACTIVE reservation + current ASSIGNED workforce -> source remove + target add + reservation RELEASED + workforce FREE`

Key ownership/invariant rules:

- delivery evidence must exactly match the dispatch job, selected Person/unit, compatibility resource, target and amount,
- source Building/resource type remain owned by frozen CR-27A/27B rather than reconstructed from delivery,
- current reservation and workforce state are supplied as authoritative current owner values,
- stock transfer uses only frozen CR-25 mutation contracts,
- reservation closure uses only frozen CR-27A release,
- workforce release uses only frozen CR-26 release,
- all values are immutable; failure returns no partial settlement result,
- target overflow and source underflow reject settlement,
- successful transfer conserves total quantity,
- committed `RELEASED` / `FREE` successor owner states reject another settlement attempt.

Direct self-test and Node runner are present.

## 3. CR-27C strict non-scope

No arrival decision, delivery creation, pickup/delivery movement, partial deliveries, multi-trip reservation handling, cancel/failure/recovery settlement, redispatch, TransportJob lifecycle redesign, legacy Claim/Demand/ResourceState mutation, Carrier availability truth, new pathfinding/routes/movement/traffic/deadlock behavior, priority/scoring, production/construction, SaveGame, graphics, gameplay UI, Inspector or balancing.

## 4. CR-27C next gate boundary

The upcoming browser gate must regress frozen CR-27A and CR-27B together with direct CR-27C tests and verify at least:

- valid confirmed delivery performs exact source -> target transfer,
- wrong delivery identity/resource/target/amount cannot settle,
- only current ACTIVE reservation + matching ASSIGNED workforce may settle,
- source underflow and target overflow reject without partial output,
- success returns RELEASED reservation + FREE workforce,
- total stock quantity is conserved,
- all inputs remain unchanged,
- no post-scope transport/legacy-store/Carrier ownership leaks in.

Only browser **PASS / 0 BLOCKER** permits the immutable CR-27C marker.

After CR-27C freezes, the next step is the whole **CR-27 Completion / Regression / Freeze Gate**. It must not be built before CR-27C is frozen.

## 5. Branch / gate policy

- One CR-27 development branch: `feature/cr-27-game-facing-logistics-integration-foundation`.
- A/B/C proceed sequentially on that branch.
- Each sub-block gets direct tests and a browser Verification / Freeze Gate.
- Frozen sub-block markers do not become the Pages development source.
- Pages remains on the active CR-27 branch during the whole CR-27 cycle.
- Whole CR-27 becomes FROZEN only after final combined regression/invariant/scope gate passes.

---

**Updated:** 2026-09-06 after CR-27C specification, atomic settlement implementation and direct tests. Next step: dedicated CR-27C browser Verification / Freeze Gate.
