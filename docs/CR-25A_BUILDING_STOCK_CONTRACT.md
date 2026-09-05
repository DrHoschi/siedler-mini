# CR-25A – BuildingStock Contract

**Status:** IMPLEMENTED / NOT FROZEN  
**System block:** CR-25 – BuildingStock / Production Foundation  
**Predecessor baseline:** CR-24 – Construction Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER

## Purpose

CR-25A introduces only the minimal building-scoped local stock data contract required by the BuildingStock / Production Foundation.

It answers only:

> Which quantity of one resource type is locally associated with one Building?

## Contract

A BuildingStock value contains exactly:

- `kind: building-stock`
- stable `buildingId` of kind `building:`
- stable `resourceTypeId` of kind `resource-type:`
- `quantity`: non-negative safe integer

Default quantity is `0`.

The contract value is immutable and deterministic.

One contract value represents one Building + one ResourceType stock entry. Aggregation/storage ownership beyond this value is not introduced by CR-25A.

## Architectural boundary

CR-25A builds on, but does not modify:

- CR-22 Building identity/lifecycle/registration ownership,
- CR-23 Person/Home/Housing ownership,
- CR-24 Construction state/progress/completion ownership,
- existing `resource-type:` stable resource definition identity.

CR-25A introduces only descriptive local stock state. It does not provide stock mutation behavior.

## Explicit exclusions

CR-25A adds no:

- add/deposit behavior,
- remove/withdraw behavior,
- reservation or consumption behavior,
- storage capacity, slots or maximum quantity,
- automatic stock aggregation/store,
- production recipes,
- production input/output execution,
- production duration/ticks,
- workers/workforce/professions,
- transport generation/execution,
- demand generation,
- construction material consumption,
- rendering/animation/UI/Inspector/balancing.

Controlled stock mutation belongs to CR-25B. Minimal Production -> BuildingStock integration belongs to CR-25C after CR-25B.

## Verification target

CR-25A must verify:

- stable `building:` ID requirement,
- stable `resource-type:` ID requirement,
- zero quantity is valid,
- positive safe integer quantity is valid,
- negative, fractional and unsafe quantities are rejected,
- exact immutable/deterministic contract shape,
- no mutation/capacity/production/workforce/transport scope leakage,
- frozen predecessor contracts remain unchanged.

## Freeze state

CR-25A is currently **IMPLEMENTED / NOT FROZEN**. It may only be marked PASS/FROZEN after its appropriate verification/freeze evidence succeeds with 0 blocker.
