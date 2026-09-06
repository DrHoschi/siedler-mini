# CR-28 – Visible World Runtime Integration Foundation

## Completion / Regression / Freeze Gate

**Result:** PASS / 0 BLOCKER  
**Date:** 2026-09-06  
**Whole-CR branch:** `feature/cr-28-visible-world-runtime-integration-foundation`  
**Frozen predecessor:** `frozen/cr-27-game-facing-logistics-integration-foundation` @ `c821784264c846d00f15f018011eb13f817d13b5`

## Scope completed

### CR-28A – Game-State Render Projection Contract

PASS / 0 BLOCKER.

- renderer-neutral read-only projection for Map, Buildings and Persons,
- stable identities and deterministic ordering,
- explicit visible fields only,
- deeply immutable and alias-free projection output,
- no gameplay write-back.

### CR-28B – Deterministic World Canvas Rendering

PASS / 0 BLOCKER.

- consumes CR-28A projection only,
- deterministic immutable render commands,
- deterministic ground/grid/Building/Person representation,
- explicit deterministic visible Canvas styles,
- same projection/options -> same ordered Canvas command/call/style sequence,
- no gameplay ownership or mutation.

### CR-28C – Live Runtime -> Render Integration

PASS / 0 BLOCKER.

- current Map/Building/Person owners are snapshotted read-only,
- current owners -> CR-28A projection -> CR-28B renderer -> Canvas,
- obsolete CR-16A browser test-shell composition removed from `src/main.js`,
- current owner changes become visible only through a new projection/render pass,
- renderer remains non-authoritative and write-free.

## Browser evidence

Real iPhone Safari verification on 2026-09-06 confirmed the actual visible prototype miniworld after the browser-style repair:

- visible green world/ground area,
- visible grid,
- three distinguishable orange Buildings,
- three distinguishable light Persons,
- browser status: `CR-28C LIVE RUNTIME -> RENDER INTEGRATION: PASS / 0 BLOCKER – 3 Buildings / 3 Persons sichtbar`.

The earlier black-Canvas blocker caused by implicit default-black Canvas styles is CLOSED.

## Automated whole-system gate

`src/dev/cr-28-freeze-gate.node.js` executes the CR-28A, CR-28B and CR-28C direct gates together.

CI also runs the existing frozen regression before the CR-28 whole-system gate:

`npm run ci && node src/dev/cr-24c-freeze-gate.node.js && node src/dev/cr-28-freeze-gate.node.js`

GitHub Actions run `34046869483` on commit `990920805b92e1faf645d7c057abd83092eee4b4` completed the `Clean Runtime + CR Regression` job successfully. The step `Run frozen regression + CR-28 whole-system freeze gate` completed with conclusion `success`.

## Frozen ownership / non-scope verification

The gate accepts the following CR-28 boundary as frozen:

- existing gameplay/source owners remain authoritative,
- renderer/UI consumes projected data only,
- no renderer write-back path exists,
- frozen CR-27 gameplay ownership remains unchanged,
- no Save/Load/Continue ownership,
- no Gameplay HUD,
- no Build menu,
- no Inspector,
- no touch controls,
- no new camera mechanics,
- no mandatory new assets,
- no new pathfinding/movement/traffic semantics,
- no BuildingStock/Workforce/Logistics ownership changes,
- no new production/construction/simulation semantics.

## Freeze decision

**CR-28 – Visible World Runtime Integration Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER.**

A whole-system frozen marker may be created only at the final documented branch HEAD after final CI verification of the freeze documentation state.
