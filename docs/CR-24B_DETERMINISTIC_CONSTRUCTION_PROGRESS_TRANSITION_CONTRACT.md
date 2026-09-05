# CR-24B – Deterministic Construction Progress / Transition Contract

**Status:** IMPLEMENTED / NOT FROZEN  
**System block:** CR-24 – Construction Foundation  
**Predecessor:** CR-24A – Building Construction State Contract — PASS / FROZEN / 0 BLOCKER

## Purpose

CR-24B defines only valid numeric Construction progress and deterministic forward Construction transitions on top of the frozen CR-24A state vocabulary.

## Contract

A CR-24B value contains:

- `kind: building-construction-progress-transition`
- stable `buildingId` of kind `building:`
- `progress` in the closed interval `0.0 .. 1.0`
- derived CR-24A `state`

The state mapping is exact:

- `progress = 0` -> `PENDING`
- `0 < progress < 1` -> `IN_PROGRESS`
- `progress = 1` -> `COMPLETED`

## Transition rules

- Progress may stay equal or increase, but never decrease.
- `PENDING -> IN_PROGRESS` is allowed.
- `IN_PROGRESS -> COMPLETED` is allowed.
- Direct `PENDING -> COMPLETED` is rejected.
- `COMPLETED` is terminal; the same completed value may be reproduced deterministically, but no transition away from it is allowed.
- `buildingId` never changes across progress updates.
- Every result is immutable and deterministic.

## Architectural boundary

CR-24B decides only whether a requested progress value / state transition is valid. It does not decide why progress occurs.

CR-24B adds no:

- construction material demand or consumption,
- hammering/action simulation,
- builder/workforce/profession assignment,
- work-time or elapsed-time progression,
- detailed named build phases,
- production,
- BuildingStock/storage,
- transport integration,
- usability/activation policy,
- demolition/destruction,
- rendering/animation/UI.

## Acceptance checks

- progress strictly constrained to `0.0 .. 1.0`,
- exact deterministic state mapping,
- no backward progress,
- no `PENDING -> COMPLETED` skip,
- `COMPLETED` terminal,
- stable `buildingId`,
- immutable/deterministic values,
- no cause/material/builder/time/production/transport leakage,
- CR-24A and frozen predecessor regressions remain green.
