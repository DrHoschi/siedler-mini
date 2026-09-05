# CR-24A – Building Construction State Contract

**Status:** PASS / FROZEN / 0 BLOCKER  
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

CR-24A does not define transitions between construction states. It only defines valid state values. Controlled transitions/progress belong to CR-24B.

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

## Freeze evidence

CR-24A passed its dedicated completion/regression/freeze gate with **PASS / 0 BLOCKER**.

Verified together:

- frozen CR-23/CR-22 predecessor regression,
- stable `building:` ID requirement,
- exactly `PENDING`, `IN_PROGRESS`, `COMPLETED`,
- strict separation from CR-22 `EXISTS -> RETIRED`,
- immutable/deterministic values,
- no transition/progress/material/builder/production/transport scope leakage,
- browser/device preview: PASS / 0 BLOCKER,
- GitHub CI `Run CR-24A completion/freeze gate + CR-23 frozen regression`: SUCCESS.

## Frozen boundary

CR-24A is immutable unless explicitly reopened by a separate corrective change. CR-24B must build on this contract without changing its state vocabulary or introducing Construction semantics into the CR-22 Building lifecycle.
