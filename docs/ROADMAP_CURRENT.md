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

## 2. Authorized next system block

**CR-28 – Visible World Runtime Integration Foundation**

Question answered by CR-28:

> How are already-frozen gameplay owners projected deterministically into a visible, read-only game world?

Authorized decomposition:

- **CR-28A – Game-State Render Projection Contract** — immutable/read-only renderer-neutral projection for at least Map, Buildings and Persons, including position and deliberately exposed visible base state. No drawing or interaction.
- **CR-28B – Deterministic World Canvas Rendering** — deterministic prototype/debug rendering of the CR-28A projection. No gameplay ownership or write-back.
- **CR-28C – Live Runtime -> Render Integration** — current runtime state -> CR-28A projection -> CR-28B renderer -> Canvas update, with a real visible miniworld as browser-gate evidence.

After A+B+C, run the whole CR-28 Completion / Regression / Freeze Gate.

## 3. CR-28 architectural boundary

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

## 4. Current active step

**CR-28A – Game-State Render Projection Contract** is authorized and active.

Required proof:

- pure projection tests,
- immutability of all inputs,
- deterministic output/order for equal source state,
- Map/Buildings/Persons minimum coverage,
- no Canvas dependency,
- no gameplay write-back path.

CR-28B is not yet authorized for implementation.

## 5. Branch / gate policy

- Active whole-system branch: `feature/cr-28-visible-world-runtime-integration-foundation`.
- It was created directly from `frozen/cr-27-game-facing-logistics-integration-foundation` at commit `c821784264c846d00f15f018011eb13f817d13b5`.
- A/B/C normally continue sequentially on this one CR-28 branch.
- Frozen CR-27 markers remain immutable.
- CR-28 becomes FROZEN only after its final whole-system gate passes PASS / 0 BLOCKER.

---

**Updated:** 2026-09-06 after post-CR27 reconciliation and explicit authorization of **CR-28 – Visible World Runtime Integration Foundation**. Current active step: **CR-28A – Game-State Render Projection Contract**.
