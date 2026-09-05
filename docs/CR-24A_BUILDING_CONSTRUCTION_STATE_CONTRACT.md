# CR-24A – Building Construction State Contract

**Status:** IMPLEMENTED / NOT FROZEN  
**System block:** CR-24 – Construction Foundation  
**Predecessor baseline:** CR-23 – Person / Resident / Housing Foundation — FROZEN

## Purpose

CR-24A introduces only the construction-specific state contract for a Building. It is deliberately independent from the frozen CR-22 Building existential lifecycle.

## Contract

A construction-state value contains exactly:

- `kind: building-construction-state`
- stable `buildingId` of kind `building:`
- `state`: one of `PENDING`, `IN_PROGRESS`, `COMPLETED`

Default state is `PENDING`.

The contract value is immutable and deterministic.

## Architectural boundary

CR-22B remains unchanged:

- Building lifecycle: `EXISTS -> RETIRED`

CR-24A adds a separate axis:

- Construction state: `PENDING | IN_PROGRESS | COMPLETED`

Therefore a Building may simultaneously be `EXISTS` in the existential lifecycle and `PENDING`, `IN_PROGRESS`, or `COMPLETED` in Construction.

CR-24A does not define transitions between construction states. It only defines valid state values. Controlled transitions/progress belong to a later CR-24 sub-block.

## Explicit exclusions

CR-24A adds no:

- automatic transitions,
- progress percentage,
- detailed construction phases,
- material requirements or consumption,
- builders / workforce / profession,
- production or BuildingStock,
- transport integration,
- usability/activation policy,
- demolition/destruction,
- rendering/animation/UI.

## Acceptance checks

- stable `building:` ID required,
- only `PENDING`, `IN_PROGRESS`, `COMPLETED` accepted,
- construction contract remains independent from CR-22 lifecycle contract,
- immutable/deterministic values,
- scope exclusions remain absent,
- CR-23/CR-22 frozen regressions remain green.
