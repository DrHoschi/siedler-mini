# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-29B COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER  
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

Question:

> How does the player view the already-visible world through a controlled, deterministic camera/view boundary without changing gameplay truth?

Whole-CR branch:

`feature/cr-29-camera-world-view-foundation`

The branch was created directly from the frozen CR-28 marker at `1ca2997a3933b312737dda5a220f1026d149bdf1`.

## 3. CR-29 decomposition and status

### CR-29A – World View / Camera State Contract

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implementation:

- `src/render/world-view-camera-state.js`
- `src/dev/cr-29a-self-test.node.js`

Contract:

- viewport width/height,
- world/view offset X/Y,
- zoom/scale,
- finite numeric validation,
- positive viewport dimensions and zoom,
- deterministic immutable state,
- no gameplay/world ownership or mutation,
- no input/gesture behavior.

### CR-29B – Deterministic World-to-Screen Projection

Status: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implementation:

- `src/render/world-to-screen-projection.js`
- `src/render/camera-world-rendering.js`
- `src/dev/cr-29b-self-test.node.js`
- browser path in `src/main.js` now uses CR-29A camera state + CR-29B deterministic projection before Canvas execution.

Contract:

- screen position = world render coordinate × zoom + camera offset,
- render sizes/radii scale by zoom,
- stable command order and source identity remain unchanged,
- source CR-28 commands remain immutable/unmodified,
- screen-space output is immutable,
- same world + same camera -> same screen result,
- camera-only changes alter presentation only,
- no player input yet.

GitHub Actions run `34052011986` on commit `3c8aa07bb523a61c0a75f22a3f3d465ae1b04a7b` passed frozen regression + CR-28 whole-system gate + CR-29A/B: **PASS / 0 BLOCKER**.

### CR-29C – Controlled Pan & Zoom Integration

Status: **AUTHORIZED / NEXT**.

May now add controlled user manipulation of CR-29A view state through the deterministic CR-29B projection. Presentation may change; gameplay/world owners must not.

Then execute **CR-29 Completion / Regression / Freeze Gate** against frozen CR-28 before CR-29 can be FROZEN.

## 4. Frozen CR-28 boundary carried forward

The following remains authoritative and immutable while CR-29 is developed:

`gameplay/world owners -> CR-28A immutable projection -> CR-28B deterministic rendering -> CR-28C browser-visible Canvas`

CR-29 extends only the presentation path:

`CR-28 render commands -> CR-29A immutable camera state -> CR-29B deterministic screen-space projection -> Canvas`

CR-29 must not become a gameplay authority.

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

**CR-29C – Controlled Pan & Zoom Integration** is now the only authorized implementation step.

CR-29C may manipulate only presentation camera/view state. Whole-CR-29 remains not frozen until its final Completion / Regression / Freeze Gate reaches **PASS / 0 BLOCKER**.

---

**Updated:** 2026-09-06 after **CR-29B – Deterministic World-to-Screen Projection** verification: **PASS / 0 BLOCKER**.
