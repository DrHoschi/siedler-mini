# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 AUTHORIZED / CR-30A ACTIVE / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-30-housing-population-gold-integration-foundation`  
**Latest freeze decision:** **CR-29 – Camera & World View Foundation**

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Current frozen predecessor marker:

`frozen/cr-29-camera-world-view-foundation`

Current frozen predecessor commit:

`560334f6481aef0398b699d21100d0079ea429f1`

## 2. Binding migration order around the current boundary

The current capability order remains:

- IM-09 – Logistics & Reservation Migration,
- **IM-10 – Housing / Population / Gold Integration**,
- later Navigation work,
- later Path/Wear work,
- IM-13 – SaveGame,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

CR-25 through CR-27 reached the BuildingStock / Workforce / Logistics boundary. CR-28 and CR-29 were deliberately inserted to establish visible-world runtime integration and controlled camera/world viewing without changing gameplay truth.

With CR-29 frozen, the selected next implementation block is the still-open IM-10 boundary. SaveGame, UI/Mobile and Guidance/Inspector remain later and are not authorized by this transition.

## 3. IM-10 ↔ CR-30 reconciliation

**IM-10 – Housing / Population / Gold Integration** is now assigned to:

**CR-30 – Housing / Population / Gold Integration Foundation** — **AUTHORIZED / ACTIVE / NOT FROZEN**.

This is not duplicate Person work. The earlier stable Person/Resident identity boundary remains authoritative; housing/home/capacity/occupancy, derived population and non-physical Gold are the new integration concerns.

Whole-CR branch:

`feature/cr-30-housing-population-gold-integration-foundation`

Branch base:

`frozen/cr-29-camera-world-view-foundation` @ `560334f6481aef0398b699d21100d0079ea429f1`

Guiding question:

> How are already-real persons controlled into residents of real houses, population derived from those real residents, and the non-physical gold economy built on that truth?

### CR-30A – Home & Housing Capacity Contract

Status: **AUTHORIZED / ACTIVE / NOT FROZEN**.

First allowed capability increment:

- Buildings may expose a housing function with defined capacity,
- Persons may receive one unambiguous Home relationship,
- identity and owner boundaries remain stable,
- invalid housing/home relationships must be deterministically rejectable.

Not yet allowed: automatic resident creation, Population integration, free-slot generation, Gold, SaveGame, UI/Inspector, Navigation/Path/Wear changes.

### CR-30B – Deterministic Housing & Population Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Target boundary: controlled deterministic assignment of existing real Persons to houses; Population derived only from valid real residents; only genuinely free housing places may create general residents; no random specialists and no second Population truth.

### CR-30C – Gold Economy Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Target boundary: a clear economy owner derives/generates Gold from real valid residents. Gold remains non-physical and is not BuildingStock or Logistics cargo. No restore surcharge/additional restore tax.

### CR-30 Completion / Regression / Freeze Gate

Status: **PLANNED**.

A+B+C must be regressed together against frozen CR-29 and all relevant frozen predecessor contracts. CR-30 becomes FROZEN only at **PASS / 0 BLOCKER**.

## 4. Frozen architectural boundaries preserved during CR-30

CR-29 presentation chain remains unchanged:

`gameplay/world owners -> CR-28A immutable projection -> CR-28B deterministic world render commands -> CR-29A immutable camera/view state -> CR-29B deterministic screen-space projection -> CR-29C controlled camera-only input -> Canvas`

CR-30 must preserve the frozen BuildingStock, Workforce, Logistics, world-render and camera/view owner boundaries. In particular, Gold is an economy truth, not a physical BuildingStock quantity and not a Logistics resource.

## 5. Current next step

Implement **CR-30A – Home & Housing Capacity Contract** only on `feature/cr-30-housing-population-gold-integration-foundation`.

Before code changes, inspect the existing Building and Person contracts/owners on this exact branch and design the smallest compatible Home/Housing-capacity contract. Add direct deterministic tests appropriate to CR-30A. Do not implement CR-30B or CR-30C behavior early.

If a visible browser/test page is changed or used for CR-30A verification, synchronize all visible CR/build identity surfaces to CR-30A before accepting the browser/device gate.

No successor CR is implicitly authorized.

---

**Updated:** 2026-09-06 — IM-10 explicitly selected as CR-30 after frozen CR-29; whole-CR branch created from exact frozen commit `560334f6481aef0398b699d21100d0079ea429f1`; CR-30A is the sole currently authorized implementation substep.