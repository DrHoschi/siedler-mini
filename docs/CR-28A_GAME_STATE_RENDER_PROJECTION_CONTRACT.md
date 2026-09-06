# CR-28A – Game-State Render Projection Contract

**Parent system block:** CR-28 – Visible World Runtime Integration Foundation  
**Status:** COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER  
**Branch:** `feature/cr-28-visible-world-runtime-integration-foundation`  
**Baseline:** `frozen/cr-27-game-facing-logistics-integration-foundation` @ `c821784264c846d00f15f018011eb13f817d13b5`

## 1. Purpose

CR-28A defines the first read-only boundary from existing gameplay truth into visible-world data.

It answers only:

> What deterministic, immutable, renderer-neutral representation may be derived from already-owned game state for later rendering?

CR-28A does not render anything itself.

## 2. Implemented projection boundary

Implemented in `src/render/game-state-render-projection.js`:

- `projectMap(mapSnapshot)`
- `projectBuildings(buildingSnapshot)`
- `projectPersons(personSnapshot)`
- `projectGameState({ map, buildings, persons })`

The result is renderer-neutral and deeply frozen. Source records are read only and deliberately reduced to explicit visible fields.

### Map projection

Projects:

- stable map ID,
- width / height,
- cell size,
- origin,
- deterministically ordered cells,
- per-cell stable ID, grid position, world position and tile ID.

### Building projection

Projects only:

- stable building ID,
- `kind: building`,
- definition ID when present,
- world position,
- deliberately exposed visible lifecycle/base state when present.

### Person projection

Projects only:

- stable person/unit ID,
- `kind: person`,
- world position,
- deliberately exposed visible base/existence state when present.

No complete gameplay record, mutable gameplay object, Canvas object or DOM object is exposed.

## 3. Required invariants

CR-28A guarantees:

1. **Read-only source access** — no source gameplay state is changed by projection.
2. **Immutable projection result** — returned projection data is deeply frozen.
3. **No mutable aliases** — projection data is newly constructed and cannot mutate gameplay truth.
4. **Determinism** — equal source state yields deeply equal projection output.
5. **Stable ordering** — cells, buildings and persons are ordered by stable ID.
6. **Renderer neutrality** — no Canvas API, DOM drawing primitive or renderer-owned object is present.
7. **No gameplay ownership transfer** — Render/UI remains a consumer only.
8. **Stable identity preservation** — projected entities retain traceable source IDs.
9. **Explicit visible-state selection** — unrelated gameplay fields are omitted.

## 4. Direct test proof

Implemented in `src/dev/cr-28a-self-test.node.js`.

The direct test proves:

- Map projection exists,
- Map cells are deterministically ordered,
- Building projection preserves stable ID / definition / position,
- Person projection preserves stable ID / position,
- equal state yields deeply equal ordered projection,
- source inputs remain unchanged after projection,
- projection output is deeply frozen,
- mutation attempts through projection data fail,
- projection output has no mutable alias back into source state,
- deliberately projected position changes appear in the projection,
- irrelevant/unexposed gameplay-field changes do not alter projection output,
- unrelated building/person gameplay fields are not leaked.

## 5. Verification result

GitHub Actions run `34036947256` executed the existing CR regression plus the active CR-28A projection test.

Result:

**PASS / 0 BLOCKER**

The step `Run CR regression + active CR-28A projection test` completed successfully on 2026-09-06.

No Canvas rendering, runtime loop, UI control, gameplay write-back or owner change was introduced.

## 6. Non-scope preserved

CR-28A introduced none of the following:

- Canvas rendering,
- DOM rendering,
- animation loops,
- camera pan/zoom/comfort behavior,
- input/touch controls,
- HUD,
- Build menu,
- Inspector,
- Save/Load/Continue,
- new assets as a requirement,
- new pathfinding, movement or traffic logic,
- changes to BuildingStock, Workforce, Logistics, Production or Construction semantics,
- any renderer/UI write-back into gameplay owners.

## 7. Completion boundary

CR-28A is **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

This completes the A-step only. CR-28 as a whole is not frozen. The next same-branch step may be **CR-28B – Deterministic World Canvas Rendering**, followed later by CR-28C and the final whole-CR-28 Completion / Regression / Freeze Gate.
