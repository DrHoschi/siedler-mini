# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 ACTIVE / CR-30A FROZEN / CR-30B AUTHORIZED  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-30-housing-population-gold-integration-foundation`  
**Latest whole-CR freeze:** **CR-29 – Camera & World View Foundation**  
**Latest substep freeze:** **CR-30A – Home & Housing Capacity Contract**

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Whole-CR predecessor marker:

`frozen/cr-29-camera-world-view-foundation` @ `560334f6481aef0398b699d21100d0079ea429f1`

CR-30A substep marker:

`frozen/cr-30a-home-housing-capacity-contract` @ `f74d6bc1399212650c11196f8f098a419eda6cbf`

## 2. Binding migration order around the current boundary

The capability order remains:

- IM-09 – Logistics & Reservation Migration,
- **IM-10 – Housing / Population / Gold Integration**,
- later Navigation work,
- later Path/Wear work,
- IM-13 – SaveGame,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

CR-30 remains the active implementation block for IM-10. Later migration blocks remain locked.

## 3. IM-10 ↔ CR-30 reconciliation

**CR-30 – Housing / Population / Gold Integration Foundation** — **ACTIVE / NOT FROZEN**.

Whole-CR branch:

`feature/cr-30-housing-population-gold-integration-foundation`

Branch base:

`frozen/cr-29-camera-world-view-foundation` @ `560334f6481aef0398b699d21100d0079ea429f1`

Guiding question:

> How are already-real persons controlled into residents of real houses, population derived from those real residents, and the non-physical gold economy built on that truth?

### CR-30A – Home & Housing Capacity Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen capability:

- a real stable Building identity exposes immutable housing capacity,
- a real existing Person identity may receive one immutable Home assignment,
- duplicate active Home assignment is rejected,
- exhausted housing capacity rejects further assignment,
- CR-23A Person identity remains unchanged,
- no automatic residents, Population or Gold are introduced.

Evidence:

- `src/domain/housing-home-capacity-integration-contract.js`
- `src/dev/cr-30a-self-test.node.js`
- automated regression including whole CR-29 + CR-30A direct test: **PASS / 0 BLOCKER**,
- real iPad/Safari browser evidence on 2026-09-06: current CR-30A title/heading/status visible, preserved 3 Buildings / 3 Persons world visible, stale build identity absent: **PASS / 0 BLOCKER**,
- freeze marker: `frozen/cr-30a-home-housing-capacity-contract` @ `f74d6bc1399212650c11196f8f098a419eda6cbf`.

### CR-30B – Deterministic Housing & Population Integration

Status: **AUTHORIZED / ACTIVE / NOT FROZEN**.

Allowed capability increment:

- controlled deterministic assignment of existing real Persons to valid housing,
- Population derived only from valid real resident/home truth,
- no separate mutable Population counter or second Population truth,
- only genuinely remaining free housing slots may create general residents,
- a generated general resident must become a real stable Person before it contributes to Population,
- no random specialist generation,
- frozen CR-30A capacity and one-home invariants remain binding.

Not yet allowed: Gold, SaveGame/restore, UI/Inspector features, Navigation/Path/Wear changes, or ownership changes to BuildingStock/Workforce/Logistics/camera/render beyond necessary read-only relationships.

### CR-30C – Gold Economy Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Target boundary: a clear economy owner derives/generates Gold from real valid residents. Gold remains non-physical and is not BuildingStock or Logistics cargo. No restore surcharge/additional restore tax.

### CR-30 Completion / Regression / Freeze Gate

Status: **PLANNED**.

A+B+C must be regressed together against frozen CR-29 and relevant predecessor contracts. CR-30 becomes FROZEN only at **PASS / 0 BLOCKER**.

## 4. Frozen architectural boundaries preserved during CR-30

CR-29 presentation chain remains unchanged:

`gameplay/world owners -> CR-28A immutable projection -> CR-28B deterministic world render commands -> CR-29A immutable camera/view state -> CR-29B deterministic screen-space projection -> CR-29C controlled camera-only input -> Canvas`

CR-30 must preserve BuildingStock, Workforce, Logistics, world-render and camera/view ownership boundaries. Gold remains an economy truth, not physical stock or cargo.

## 5. Current next step

Implement **CR-30B – Deterministic Housing & Population Integration** only on `feature/cr-30-housing-population-gold-integration-foundation`, building strictly on frozen CR-30A.

Before using the browser page as CR-30B verification evidence, synchronize all visible/build identity surfaces to CR-30B. Do not implement CR-30C early.

No successor CR is implicitly authorized.

---

**Updated:** 2026-09-06 — CR-30A browser-verifiziert and frozen at PASS / 0 BLOCKER; CR-30B explicitly authorized as the next and only active implementation substep.
