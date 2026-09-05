# CR-25B – Deterministic BuildingStock Mutation

**Status:** IMPLEMENTED / NOT FROZEN  
**System block:** CR-25 – BuildingStock / Production Foundation  
**Predecessor baseline:** CR-25A – BuildingStock Contract — PASS / FROZEN / 0 BLOCKER

## Purpose

CR-25B adds only controlled deterministic quantity mutation on top of the frozen CR-25A BuildingStock value contract.

## Contract

CR-25B provides two operations:

- `add(current, amount)`
- `remove(current, amount)`

Each operation validates the supplied CR-25A value and returns a new immutable `building-stock` value with the same stable `buildingId` and `resourceTypeId`.

Mutation amount must be a positive safe integer.

### Addition

- increases `quantity` by `amount`,
- rejects Safe-Integer overflow,
- never mutates the input value.

### Removal

- decreases `quantity` by `amount`,
- may result in exactly `0`,
- rejects over-withdrawal,
- therefore can never create negative stock,
- never mutates the input value.

## Frozen predecessor boundary

CR-25A remains unchanged and continues to own the descriptive value shape:

- `kind: building-stock`
- stable `buildingId`
- stable `resourceTypeId`
- non-negative safe-integer `quantity`

CR-25B only defines how a valid value may deterministically become another valid value.

## Explicit exclusions

CR-25B adds no:

- storage capacity or slots,
- production recipes, inputs/outputs or production execution,
- production timing,
- workforce/profession assignment,
- transport demand/generation/execution,
- construction material integration,
- resource reservation policy,
- SaveGame ownership,
- rendering/animation/UI/Inspector/balancing.

## Verification target

Before CR-25B may be frozen, its focused verification/freeze gate must confirm:

- frozen CR-25A predecessor regression,
- deterministic add/remove behavior,
- stable Building/ResourceType identity preservation,
- zero remains a valid resulting quantity,
- negative stock is impossible,
- over-withdrawal is rejected,
- invalid mutation amounts and overflow are rejected,
- immutable/deterministic results,
- no production/capacity/workforce/transport scope leakage.

Only after **PASS / 0 BLOCKER** may CR-25B receive an immutable frozen marker and release CR-25C.
