# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-28 active  
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

Authorized decomposition:

- **CR-28A – Game-State Render Projection Contract** — **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**. Immutable/read-only renderer-neutral projection for Map, Buildings and Persons with deterministic ordering, stable identity and direct immutability/determinism proof.
- **CR-28B – Deterministic World Canvas Rendering** — **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**. Deterministic world-ground/grid/building/person render commands and Canvas execution from CR-28A projection only. No gameplay ownership/write-back and no live runtime integration.
- **CR-28C – Live Runtime -> Render Integration** — next allowed same-branch step. Current runtime state -> CR-28A projection -> CR-28B renderer -> Canvas update, with a real visible miniworld as browser-gate evidence.

After A+B+C, run the whole CR-28 Completion / Regression / Freeze Gate.

## 3. CR-28A/B result

CR-28A implementation:

- `src/render/game-state-render-projection.js`
- `src/dev/cr-28a-self-test.node.js`

CR-28B implementation:

- `src/render/world-canvas-rendering.js`
- `src/dev/cr-28b-self-test.node.js`

Accepted A/B properties:

- source state remains unchanged,
- projection and render-command outputs are immutable,
- deterministic ordering by stable source identity,
- Map/Buildings/Persons coverage,
- world ground/grid plus simple Building/Person prototype representation,
- same projection/options -> same ordered render commands,
- same command stream -> same Canvas call sequence,
- no Canvas-driven gameplay mutation,
- no `main.js` or live runtime composition change through CR-28B.

GitHub Actions run `34037847864` completed existing CR regression + CR-28A + CR-28B successfully: **PASS / 0 BLOCKER**.

## 4. CR-28 architectural boundary

CR-28 is visibility integration, not a new gameplay system. Existing gameplay owners remain authoritative. Renderer/UI may only consume projected data and must never become a gameplay owner or mutate frozen source state.

Hard non-scope across CR-28:

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

**CR-28C – Live Runtime -> Render Integration** is the next allowed implementation step on the same whole-CR branch.

CR-28C may connect current gameplay/runtime state -> CR-28A projection -> CR-28B deterministic rendering -> actual Canvas update. The completion evidence must include a real browser-visible miniworld while preserving the read-only renderer boundary.

## 6. Branch / gate policy

- Active whole-system branch: `feature/cr-28-visible-world-runtime-integration-foundation`.
- It was created directly from `frozen/cr-27-game-facing-logistics-integration-foundation` at commit `c821784264c846d00f15f018011eb13f817d13b5`.
- A/B/C continue sequentially on this one CR-28 branch.
- Frozen CR-27 markers remain immutable.
- CR-28 becomes FROZEN only after CR-28C and its final whole-system gate pass PASS / 0 BLOCKER.

---

**Updated:** 2026-09-06 after **CR-28B – Deterministic World Canvas Rendering** passed existing regression + CR-28A + direct CR-28B test with **PASS / 0 BLOCKER**. Next allowed step: **CR-28C – Live Runtime -> Render Integration**.
