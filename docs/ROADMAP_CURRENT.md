# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 ACTIVE / CR-30A IMPLEMENTED + DIRECT VERIFICATION PASS / NOT FROZEN  
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

CR-25 through CR-27 reached the BuildingStock / Workforce / Logistics boundary. CR-28 and CR-29 deliberately established visible-world runtime integration and controlled camera/world viewing without changing gameplay truth.

With CR-29 frozen, IM-10 is assigned to CR-30. SaveGame, UI/Mobile and Guidance/Inspector remain later and are not authorized by this transition.

## 3. IM-10 ↔ CR-30 reconciliation

**CR-30 – Housing / Population / Gold Integration Foundation** — **ACTIVE / NOT FROZEN**.

Whole-CR branch:

`feature/cr-30-housing-population-gold-integration-foundation`

Branch base:

`frozen/cr-29-camera-world-view-foundation` @ `560334f6481aef0398b699d21100d0079ea429f1`

Guiding question:

> How are already-real persons controlled into residents of real houses, population derived from those real residents, and the non-physical gold economy built on that truth?

### CR-30A – Home & Housing Capacity Contract

Status: **IMPLEMENTED / DIRECT VERIFICATION PASS / 0 BLOCKER / NOT FROZEN**.

Implemented capability increment:

- a real stable Building identity can expose an immutable housing contract with deterministic capacity,
- a real existing Person identity can receive one explicit immutable Home assignment,
- duplicate active Home assignment for the same Person is rejected within the supplied assignment truth,
- exhausted housing capacity rejects further assignment,
- stable Building/Person identities remain unchanged,
- CR-23A Person identity remains free of Home/Housing fields,
- no automatic residents, Population truth or Gold are introduced.

Direct evidence:

- implementation: `src/domain/housing-home-capacity-integration-contract.js`
- self-test: `src/dev/cr-30a-self-test.node.js`
- GitHub Actions run `34057988131` on code HEAD `338db9bd3b91a3d664ea3f80919e43253da2a05f`
- existing regression + CR-24C + CR-28 + whole CR-29 + CR-30A direct verification: **PASS / 0 BLOCKER**.

Visible/build identity was also synchronized to CR-30A, including correction of the stale `RuntimeConfig.build` value that still named CR-16. No frozen presentation/gameplay behavior changed.

Not yet allowed: automatic resident creation, Population integration, free-slot resident generation, Gold, SaveGame, UI/Inspector behavior, Navigation/Path/Wear changes.

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

CR-30 must preserve the frozen BuildingStock, Workforce, Logistics, world-render and camera/view owner boundaries. Gold remains an economy truth, not a physical BuildingStock quantity and not a Logistics resource.

## 5. Current next step

Review/accept the completed **CR-30A – Home & Housing Capacity Contract** boundary.

Do **not** begin CR-30B automatically. CR-30B becomes implementation-authorized only after explicit authorization on this same whole-CR branch.

No successor CR is implicitly authorized.

---

**Updated:** 2026-09-06 — CR-30A implemented and directly verified PASS / 0 BLOCKER; visible/build identity synchronized; CR-30B remains explicitly locked pending authorization.
