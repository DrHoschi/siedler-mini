# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-28 COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-28-visible-world-runtime-integration-foundation`  
**Frozen gameplay baseline before CR-28:** **CR-27 – Game-Facing Logistics Integration Foundation**

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27 predecessor marker:

`frozen/cr-27-game-facing-logistics-integration-foundation`

CR-27 baseline commit:

`c821784264c846d00f15f018011eb13f817d13b5`

The CR-28 frozen marker is created only after final CI verification of the documented freeze HEAD.

## 2. CR-28 completed system block

**CR-28 – Visible World Runtime Integration Foundation**

Question answered:

> How are already-frozen gameplay owners projected deterministically into a visible, read-only game world?

Completed decomposition:

- **CR-28A – Game-State Render Projection Contract** — **COMPLETE / FROZEN / PASS / 0 BLOCKER**.
- **CR-28B – Deterministic World Canvas Rendering** — **COMPLETE / FROZEN / PASS / 0 BLOCKER**.
- **CR-28C – Live Runtime -> Render Integration** — **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

## 3. CR-28 implementation result

CR-28A:

- `src/render/game-state-render-projection.js`
- `src/dev/cr-28a-self-test.node.js`
- renderer-neutral Map/Building/Person projection,
- stable IDs and deterministic ordering,
- deep immutability and no mutable aliases,
- explicit visible fields only.

CR-28B:

- `src/render/world-canvas-rendering.js`
- `src/dev/cr-28b-self-test.node.js`
- deterministic immutable render commands,
- world ground/grid plus simple Building/Person representation,
- explicit deterministic visible Canvas styles,
- same projection/options -> same ordered Canvas result.

CR-28C:

- `src/render/live-runtime-render-integration.js`
- `src/dev/cr-28c-self-test.node.js`
- `src/main.js` composes current Map/Building/Person owners and renders through CR-28A/B,
- current owner state is snapshotted read-only,
- owner changes become visible only on a new projection/render pass,
- obsolete CR-16A browser test-shell composition removed.

Whole-system gate:

- `src/dev/cr-28-freeze-gate.node.js`
- `docs/CR-28_COMPLETION_REGRESSION_FREEZE_GATE.md`

GitHub Actions run `34046869483` on commit `990920805b92e1faf645d7c057abd83092eee4b4` completed frozen regression + the CR-28 whole-system A+B+C gate successfully: **PASS / 0 BLOCKER**.

Real iPhone Safari evidence on 2026-09-06 confirmed the required visible miniworld: green ground, visible grid, three orange Buildings and three light Persons. The prior black-Canvas blocker is CLOSED.

## 4. Frozen architectural boundary

CR-28 is visibility integration, not a gameplay ownership layer. Frozen invariants:

- gameplay/source owners remain authoritative,
- renderer/UI consumes projected state only,
- no renderer write-back path,
- projection and render-command outputs remain immutable,
- Map/Buildings/Persons are deterministic and identity-stable,
- frozen CR-27 ownership remains unchanged,
- no Save/Load/Continue ownership,
- no Gameplay HUD,
- no Build menu,
- no Inspector,
- no touch controls,
- no new camera mechanics,
- no mandatory new assets,
- no new pathfinding/movement/traffic,
- no BuildingStock/Workforce/Logistics ownership changes,
- no new production/construction/simulation semantics.

## 5. Next development state

CR-28 is complete and frozen. **No CR-29 implementation is automatically authorized by the freeze itself.** The next system block must be selected explicitly from the current implementation roadmap and started from the frozen CR-28 marker once that marker exists.

## 6. Branch / gate policy

- CR-28 was implemented on one whole-system branch: `feature/cr-28-visible-world-runtime-integration-foundation`.
- It was created directly from frozen CR-27 at `c821784264c846d00f15f018011eb13f817d13b5`.
- Frozen CR-27 markers remain immutable.
- CR-28 A/B/C + browser repair + whole-system gate are complete.
- Final freeze marker is attached to the final documented branch HEAD only after final CI success.

---

**Updated:** 2026-09-06 after successful **CR-28 Completion / Regression / Freeze Gate**: **PASS / 0 BLOCKER**.
