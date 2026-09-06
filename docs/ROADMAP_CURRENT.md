# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-28 Completion / Regression / Freeze Gate authorized  
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
- **CR-28B – Deterministic World Canvas Rendering** — **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.
- **CR-28C – Live Runtime -> Render Integration** — **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

The whole **CR-28 Completion / Regression / Freeze Gate** is now the next allowed step.

## 3. CR-28 implementation and verification result

CR-28A:

- `src/render/game-state-render-projection.js`
- `src/dev/cr-28a-self-test.node.js`

CR-28B:

- `src/render/world-canvas-rendering.js`
- `src/dev/cr-28b-self-test.node.js`
- deterministic render commands include explicit visible role styles for world ground, grid, Buildings and Persons
- Canvas execution applies those explicit styles rather than relying on default black Canvas state

CR-28C:

- `src/render/live-runtime-render-integration.js`
- `src/dev/cr-28c-self-test.node.js`
- `src/main.js` composes current Map/Building/Person owners and renders through CR-28A/B
- `index.html` exposes the browser miniworld and cache-busts the repaired browser entry revision

Automated CR regression and active CR-28 tests passed after the browser repair. GitHub Pages deployment for branch HEAD `717be1c37f8c24ac86533b8ca49123a80062809d` completed successfully.

Real iPhone Safari evidence on 2026-09-06 then confirmed the actual visible result: green world/ground area, visible grid, three orange Buildings and three light Persons. The page status reported `CR-28C LIVE RUNTIME -> RENDER INTEGRATION: PASS / 0 BLOCKER – 3 Buildings / 3 Persons sichtbar`.

The black-Canvas browser blocker is CLOSED.

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

**CR-28 Completion / Regression / Freeze Gate.**

The final gate must verify CR-28A + CR-28B + CR-28C together against frozen CR-27 and require:

- complete existing CR regression PASS,
- CR-28A projection determinism/immutability PASS,
- CR-28B render-command/style determinism PASS,
- CR-28C live integration PASS,
- no gameplay-owner mutation or renderer write-back,
- frozen CR-27 ownership invariants preserved,
- hard CR-28 non-scope preserved,
- real-browser miniworld evidence accepted,
- **PASS / 0 BLOCKER** overall.

Only then may CR-28 be marked **COMPLETE / FROZEN** and a new whole-system frozen marker be created.

## 6. Branch / gate policy

- Active whole-system branch: `feature/cr-28-visible-world-runtime-integration-foundation`.
- It was created directly from `frozen/cr-27-game-facing-logistics-integration-foundation` at commit `c821784264c846d00f15f018011eb13f817d13b5`.
- CR-28A/B/C and the browser repair remain on this same whole-CR branch.
- Frozen CR-27 markers remain immutable.
- No CR-29 implementation is authorized until the CR-28 final gate passes and CR-28 is frozen.

---

**Updated:** 2026-09-06 after successful real iPhone Safari visual verification. CR-28C is COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER; whole CR-28 Completion / Regression / Freeze Gate is next.
