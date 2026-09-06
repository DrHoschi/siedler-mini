# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-28 whole-system gate pending  
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

Completed decomposition:

- **CR-28A – Game-State Render Projection Contract** — **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.
- **CR-28B – Deterministic World Canvas Rendering** — **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.
- **CR-28C – Live Runtime -> Render Integration** — **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Next allowed step: **CR-28 Completion / Regression / Freeze Gate**.

## 3. CR-28 implementation result

CR-28A:

- `src/render/game-state-render-projection.js`
- `src/dev/cr-28a-self-test.node.js`

CR-28B:

- `src/render/world-canvas-rendering.js`
- `src/dev/cr-28b-self-test.node.js`

CR-28C:

- `src/render/live-runtime-render-integration.js`
- `src/dev/cr-28c-self-test.node.js`
- `src/main.js` now composes current Map/Building/Person owners and renders them through CR-28A/B
- `index.html` exposes the CR-28C browser-visible miniworld gate

Accepted A/B/C properties:

- source owners remain authoritative and unchanged by rendering,
- projection and render-command outputs are immutable,
- deterministic ordering by stable source identity,
- Map/Buildings/Persons coverage,
- world ground/grid plus simple Building/Person prototype representation,
- same projection/options -> same ordered render commands and Canvas calls,
- current owner state -> new projection -> visible next render,
- no Canvas-driven gameplay mutation,
- obsolete CR-16A browser composition removed from `main.js`,
- no new gameplay semantics or CR-28 non-scope ownership.

GitHub Actions run `34039684167` at commit `1daccb6ff0302014cfc0b72c95fbf0852c762ec9` completed existing CR regression + CR-28A + CR-28B + CR-28C successfully: **PASS / 0 BLOCKER**.

## 4. CR-28 architectural boundary

CR-28 is visibility integration, not a new gameplay system. Existing gameplay owners remain authoritative. Renderer/UI only consume projected data and never become gameplay owners or mutate frozen source state.

Hard non-scope across CR-28 remains:

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

**CR-28 – Visible World Runtime Integration Foundation Completion / Regression / Freeze Gate**.

The gate must jointly prove A+B+C, preserve the read-only renderer boundary, regress the frozen baseline and confirm the browser-visible miniworld. Only **PASS / 0 BLOCKER** may authorize a whole-system frozen marker.

No CR-29 implementation is authorized before the CR-28 whole-system gate.

## 6. Branch / gate policy

- Active whole-system branch: `feature/cr-28-visible-world-runtime-integration-foundation`.
- It was created directly from `frozen/cr-27-game-facing-logistics-integration-foundation` at commit `c821784264c846d00f15f018011eb13f817d13b5`.
- A/B/C were implemented sequentially on this one CR-28 branch.
- Frozen CR-27 markers remain immutable.
- CR-28 becomes FROZEN only after its final whole-system gate passes PASS / 0 BLOCKER.

---

**Updated:** 2026-09-06 after **CR-28C – Live Runtime -> Render Integration** passed full GitHub CI with **PASS / 0 BLOCKER**. Next allowed step: **CR-28 Completion / Regression / Freeze Gate**.
