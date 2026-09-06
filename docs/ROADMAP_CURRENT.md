# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-28C browser visual repair verification pending  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-28-visible-world-runtime-integration-foundation`  
**Frozen gameplay baseline:** **CR-27 – Game-Facing Logistics Integration Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Whole-system frozen marker:

`frozen/cr-27-game-facing-logistics-integration-foundation`

Baseline commit:

`c821784264c846d00f15f018011eb13f817d13b5`

## 2. Active system block

**CR-28 – Visible World Runtime Integration Foundation**

Question answered by CR-28:

> How are already-frozen gameplay owners projected deterministically into a visible, read-only game world?

Current decomposition:

- **CR-28A – Game-State Render Projection Contract** — **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.
- **CR-28B – Deterministic World Canvas Rendering** — automated contract/regression **PASS / 0 BLOCKER**; explicit deterministic visible Canvas role styles added during CR-28C browser repair.
- **CR-28C – Live Runtime -> Render Integration** — **BROWSER_VISUAL_REPAIR_PENDING** after real iPhone evidence showed a black Canvas despite correct entity counts.

The whole CR-28 Completion / Regression / Freeze Gate is on hold until real browser re-verification succeeds.

## 3. CR-28 implementation and repair result

CR-28A:

- `src/render/game-state-render-projection.js`
- `src/dev/cr-28a-self-test.node.js`

CR-28B:

- `src/render/world-canvas-rendering.js`
- `src/dev/cr-28b-self-test.node.js`
- deterministic render commands now include explicit visible role styles for world ground, grid, Buildings and Persons
- Canvas execution applies those explicit styles rather than relying on default black Canvas state

CR-28C:

- `src/render/live-runtime-render-integration.js`
- `src/dev/cr-28c-self-test.node.js`
- `src/main.js` composes current Map/Building/Person owners and renders through CR-28A/B
- `index.html` exposes the browser miniworld and now cache-busts the repaired browser entry revision

Automated integration had passed before the repair, but the required visible-world evidence failed on real iPhone Safari: the Canvas was black while the page reported `3 Buildings / 3 Persons sichtbar`. This is therefore treated as a visual gate blocker, not ignored as a cosmetic issue.

## 4. CR-28 architectural boundary

CR-28 remains visibility integration, not a new gameplay system. Existing gameplay owners remain authoritative. Renderer/UI only consume projected data and never become gameplay owners or mutate frozen source state.

Hard non-scope remains:

- Save/Load/Continue,
- Gameplay HUD,
- Build menu,
- Inspector,
- touch controls,
- new camera mechanics,
- mandatory new assets,
- new pathfinding/movement/traffic,
- changes to BuildingStock/Workforce/Logistics ownership,
- new production/construction/simulation semantics.

## 5. Current next step

**CR-28C browser visual re-verification after deployment of the deterministic style repair.**

The real browser must visibly show:

- world/ground area,
- grid,
- distinguishable Buildings,
- distinguishable Persons.

A PASS label or entity count alone does not satisfy this gate.

Only after successful real-browser evidence may CR-28C return to **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER** and the whole **CR-28 Completion / Regression / Freeze Gate** resume.

## 6. Branch / gate policy

- Active whole-system branch: `feature/cr-28-visible-world-runtime-integration-foundation`.
- It was created directly from `frozen/cr-27-game-facing-logistics-integration-foundation` at commit `c821784264c846d00f15f018011eb13f817d13b5`.
- The CR-28C repair remains on this same whole-CR branch.
- Frozen CR-27 markers remain immutable.
- CR-28 cannot become FROZEN while browser visual verification is pending.
- No CR-29 implementation is authorized yet.

---

**Updated:** 2026-09-06 after iPhone browser evidence exposed the black-Canvas visibility blocker. Deterministic Canvas-style repair applied; browser re-verification is the next allowed step.
