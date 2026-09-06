# CR-28A – Game-State Render Projection Contract

**Parent system block:** CR-28 – Visible World Runtime Integration Foundation  
**Status:** ACTIVE / PREPARED  
**Branch:** `feature/cr-28-visible-world-runtime-integration-foundation`  
**Baseline:** `frozen/cr-27-game-facing-logistics-integration-foundation` @ `c821784264c846d00f15f018011eb13f817d13b5`

## 1. Purpose

CR-28A defines the first read-only boundary from existing gameplay truth into visible-world data.

It answers only:

> What deterministic, immutable, renderer-neutral representation may be derived from already-owned game state for later rendering?

CR-28A does not render anything itself.

## 2. Minimum source scope

The projection must initially be able to represent:

- Map / world structure needed for later basic world/grid display,
- Buildings with stable identity, position and deliberately exposed visible base state,
- Persons with stable identity, position and deliberately exposed visible base state.

Existing source owners remain authoritative. CR-28A may read them but must not mutate, replace or duplicate their ownership.

## 3. Projection contract

The output must be renderer-neutral and suitable for deterministic consumption by a later renderer.

Each projected entry must contain only data deliberately needed for visual representation, such as:

- stable source identity,
- projection/entity kind,
- position or equivalent world placement,
- minimal visible base state explicitly derived from existing owners.

The exact data shape may be refined during implementation, but it must not expose mutable gameplay objects by reference.

## 4. Required invariants

CR-28A must guarantee:

1. **Read-only source access** — no source gameplay state is changed by projection.
2. **Immutable projection result** — consumers cannot use returned projection data to mutate gameplay truth.
3. **Determinism** — equal source state produces equal projection content and stable ordering.
4. **Renderer neutrality** — no Canvas API, DOM drawing primitive or renderer-owned object belongs in the projection contract.
5. **No gameplay ownership transfer** — Render/UI remains a consumer only.
6. **Stable identity preservation** — projected entities retain traceable stable IDs from their authoritative sources.
7. **Explicit visible-state selection** — projection does not simply leak whole gameplay records.

## 5. Scope

Allowed in CR-28A:

- projection data types/contracts,
- pure projector functions,
- deterministic normalization/order,
- safe copying/freezing as needed to enforce the contract,
- direct unit/self-tests for projection behavior,
- test fixtures composed from already-existing gameplay state contracts.

## 6. Non-scope

Forbidden in CR-28A:

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

## 7. Test requirements

CR-28A must include direct proof for at least:

- Map projection exists and is deterministic,
- Building projection exists and preserves stable ID/position,
- Person projection exists and preserves stable ID/position,
- source input objects remain unchanged after projection,
- projection outputs do not expose mutable aliases back into source gameplay state,
- repeated projection from equal state yields deeply equal ordered output,
- changes in deliberately projected source fields produce the corresponding projection change,
- irrelevant/unexposed source fields do not accidentally become part of renderer ownership.

## 8. Completion boundary

CR-28A is complete only when the projection contract and its direct tests pass with no blocker and no Canvas/render implementation has been introduced.

Completion of CR-28A does **not** freeze CR-28 as a whole. CR-28B and CR-28C remain later same-branch steps, followed by one whole CR-28 Completion / Regression / Freeze Gate.
