# CR-25C – Production -> BuildingStock Contract

**Status:** IMPLEMENTED / NOT FROZEN  
**System block:** CR-25 – BuildingStock / Production Foundation  
**Predecessor baseline:** CR-25B – Deterministic BuildingStock Mutation — PASS / FROZEN / 0 BLOCKER

## Purpose

CR-25C introduces only the minimal deterministic Production -> BuildingStock boundary on top of frozen CR-25A/B.

A production definition belongs to one stable Building and declares local input and output quantities. Execution consumes the required local BuildingStock inputs and adds the produced outputs only when every required input is available.

## Contract

A production value contains:

- `kind: production-building-stock`
- stable `buildingId` of kind `building:`
- non-empty deterministic `inputs[]`
- non-empty deterministic `outputs[]`
- each entry contains one stable `resourceTypeId` of kind `resource-type:` and one positive safe-integer `quantity`
- duplicate ResourceTypes within inputs or within outputs are rejected
- entries are normalized to deterministic ResourceType order

## Execution boundary

`execute(production, stocks)`:

- accepts local CR-25A BuildingStock values for the same Building,
- validates every required input before applying any mutation,
- rejects the whole production attempt when any required input quantity is insufficient,
- consumes inputs through the frozen CR-25B remove mutation,
- adds outputs through the frozen CR-25B add mutation,
- creates a zero-quantity CR-25A stock entry first when an output ResourceType did not previously exist,
- supports a ResourceType appearing as both input and output deterministically,
- returns a new immutable ResourceType-sorted stock list,
- never mutates the supplied stock values or array.

## Explicit exclusions

CR-25C adds no:

- production duration, ticks, timers or automatic repetition,
- active/running/paused production state,
- worker/profession assignment,
- storage capacity or slots,
- transport generation/execution,
- construction material consumption,
- SaveGame ownership,
- rendering/animation/UI/Inspector/balancing.

## Verification state

CR-25C is implemented but not frozen. Its dedicated Self-Test covers deterministic definition, input consumption/output addition, insufficient-input rejection, immutability, same-ResourceType input/output handling, invalid contracts/stock sets and scope leakage.

The next allowed action is the focused CR-25C Verification / Freeze Gate against frozen CR-25B. Only after PASS / 0 BLOCKER may CR-25C receive its immutable frozen marker. After that, the whole CR-25 system-block completion/regression/freeze gate is still required before a new CR begins.
