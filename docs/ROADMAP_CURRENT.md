# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-29C COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-29-camera-world-view-foundation`  
**Current frozen baseline:** **CR-28 – Visible World Runtime Integration Foundation**

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Current frozen marker:

`frozen/cr-28-visible-world-runtime-integration-foundation`

Frozen CR-28 commit:

`1ca2997a3933b312737dda5a220f1026d149bdf1`

## 2. Active system block

**CR-29 – Camera & World View Foundation** — **AUTHORIZED / IN_PROGRESS**

Whole-CR branch:

`feature/cr-29-camera-world-view-foundation`

The branch was created directly from frozen CR-28 at `1ca2997a3933b312737dda5a220f1026d149bdf1`.

## 3. CR-29 decomposition and status

### CR-29A – World View / Camera State Contract

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

### CR-29B – Deterministic World-to-Screen Projection

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

### CR-29C – Controlled Pan & Zoom Integration

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implemented presentation-only camera manipulation:

- one-pointer drag pan,
- two-pointer midpoint pan + pinch zoom,
- desktop wheel zoom,
- zoom anchored at the interaction point,
- controlled zoom range `0.5 .. 3`,
- immutable CR-29A camera successor states,
- deterministic CR-29B projection remains the rendering path,
- no gameplay/world owner mutation.

Automated verification:

GitHub Actions run `34053144140` on commit `a09b046b5e2c5b1be73ce85743a8526f3415a99e` passed frozen regression + CR-28 whole-system gate + CR-29A/B/C tests: **PASS / 0 BLOCKER**.

Accepted real-browser evidence on 2026-09-06:

- iPhone Safari initial world view remained visible with 3 Buildings / 3 Persons,
- user drag/pan visibly changed the world offset,
- pinch zoom visibly produced a substantially enlarged world view,
- subsequent zoom-out visibly produced a substantially reduced world view,
- grid, Buildings and Persons remained coherent and visible across camera changes,
- no observable gameplay/world-state mutation occurred from camera operation.

Browser input verification: **PASS / 0 BLOCKER**.

## 4. Frozen CR-28 boundary carried forward

`gameplay/world owners -> CR-28A immutable projection -> CR-28B deterministic rendering -> CR-28C browser-visible Canvas`

CR-29 presentation extension:

`CR-28 render commands -> CR-29A immutable camera state -> CR-29B deterministic screen projection -> CR-29C controlled input updates camera only -> Canvas`

CR-29 must not become gameplay authority.

## 5. CR-29 hard global non-scope

CR-29 introduces no:

- Save/Load/Continue ownership,
- Gameplay HUD,
- Build menu,
- Inspector,
- gameplay selection or orders,
- new pathfinding/movement/traffic,
- BuildingStock/Workforce/Logistics ownership changes,
- new production/construction/simulation semantics,
- mandatory new assets.

## 6. Current next step

All three CR-29 substeps have reached **PASS / 0 BLOCKER**.

The next allowed action is now the **CR-29 Completion / Regression / Freeze Gate** against frozen CR-28.

Do not mark CR-29 FROZEN and do not authorize a successor CR until that whole-system gate reaches **PASS / 0 BLOCKER**.

---

**Updated:** 2026-09-06 after acceptance of real iPhone Safari drag/pan + pinch zoom evidence for **CR-29C – Controlled Pan & Zoom Integration**: **PASS / 0 BLOCKER**.
