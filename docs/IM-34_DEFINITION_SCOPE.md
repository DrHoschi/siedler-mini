# IM-34 Definition / Scope

**IM-34 - Automatic HQ-Intake-to-Production-Input Reconnection Trigger: DEFINED / NOT IMPLEMENTED.**

**Definition baseline / frozen product head:** `beded8e3c31d1b872f58a9e3e1312933d62175c5`.

**Prior frozen capability:** IM-33 - HQ-Intake Production-Input Demand Reconnection.

## Reconciliation result

Frozen IM-32 closes the source-bound delivery path from produced output to HQ storage intake. Frozen IM-33 can then materialize HQ stock into a matchable ResourceState representation and reconnect already open IM-23 production-input demands to the existing logistics path.

The remaining gap is the Runtime trigger boundary between those two frozen capabilities. After a successful IM-32 HQ intake, the Runtime still needs a controlled way to invoke the existing IM-33 reconnection path for the accepted HQ stock and its resource type. Without that trigger, the chain is functionally present but still requires an explicit caller to reconnect HQ inventory to waiting production inputs.

IM-34 therefore defines only the automatic Runtime trigger:

`successful IM-32 HQ intake -> IM-33 HQ-stock materialization / open input-demand reconnection -> existing logistics dispatch toward production buildings`.

## Binding question

When a produced resource is successfully delivered into the valid HQ through the frozen IM-32 intake path, how does the active Runtime deterministically request IM-33 reconnection for the same HQ, ResourceType and accepted quantity boundary, without adding a second stock, logistics, production, SaveGame or warehouse-policy authority?

## Capability boundary

IM-34 must connect an authoritative IM-32 `INTAKEN` result to the existing IM-33 `reconnectHqIntakeToProductionInputs` path.

- IM-32 remains the only authority for validating source-bound output delivery and crediting accepted HQ BuildingStock.
- IM-33 remains the only authority for materializing HQ stock into a matchable ResourceState representation and reconnecting open IM-23 production-input demands.
- IM-34 owns only the trigger/wiring decision after successful HQ intake. It must not duplicate IM-32 settlement or IM-33 matching logic.
- Only a successful IM-32 intake with accepted HQ stock may trigger reconnection. Failed, rejected, contradictory, non-HQ, wrong-type or already-idempotent no-op evidence must not create new reservations, jobs, claims or stock.
- Reconnection must preserve the exact `hqBuildingId` and `resourceTypeId` from the accepted HQ intake result. It must not silently substitute a different HQ, resource type, source or demand.
- If no open compatible IM-23 production-input demands exist, the trigger must be safe and non-blocking: HQ stock remains available, and no demand, claim, reservation or job is invented outside the existing IM-33 behavior.
- If matching open demands exist, the existing ResourceMatching, ResourceAssignment, TransportJobService and BuildingStockTransportReservation contracts remain authoritative.

## Expected minimal implementation scope

The later Gate 2 implementation should be limited to the smallest wiring needed to prove the trigger boundary.

Candidate files:

1. `src/runtime/active-runtime-production-supply-orchestration.js`
2. `src/dev/im-34-self-test.js`
3. `src/dev/im-34-self-test.node.js`

Possible only if the browser/runtime surface needs explicit exposure:

4. `src/main.js`

Optional only if this branch intentionally includes the separate script convenience follow-up:

5. `package.json` with `test:im34`

No SaveGame file is authorized unless Gate 2 demonstrates a concrete reconstruction gap. At this definition stage, existing authoritative BuildingStock, ResourceState, ResourceClaims, ResourceDemands, TransportJobs and reservations are expected to remain sufficient.

## Required later verification evidence

A separately authorized Gate 2 implementation and verification must prove at minimum:

1. successful IM-32 `INTAKEN` HQ delivery triggers exactly one IM-33 reconnection request for the same HQ and ResourceType;
2. IM-32 `ALREADY_INTAKEN` idempotency does not duplicate IM-33 resources, claims, reservations, jobs or demand binding;
3. failed, rejected, wrong-target, non-HQ or contradictory intake evidence does not trigger reconnection;
4. open compatible IM-23 production-input demands become connected through the existing logistics contracts;
5. absent compatible demands do not create artificial demand or hidden warehouse policy;
6. repeated trigger calls remain duplicate-safe and preserve existing IM-33 idempotency;
7. partial HQ availability connects only the real available amount through existing matching/assignment behavior;
8. the trigger does not create pathfinding, movement, production settlement, new scheduler authority, new SaveGame authority or UI behavior;
9. frozen IM-32 and IM-33 focused regressions still pass; and
10. repository verification, syntax checks and exact-scope diff checks pass.

## Explicit non-scope

No new production rule, recipe, building, resource type, HQ selection strategy, warehouse policy, priority system, queue, pathfinding, movement, UI, renderer, Inspector, SaveGame schema change, offline production, scheduler redesign, ResourceMatching redesign, ResourceAssignment redesign, transport execution redesign, or integration to legacy `main` is authorized by this definition.

This documentation records only IM-34 Definition / Scope against frozen IM-33 product head `beded8e3c31d1b872f58a9e3e1312933d62175c5`. It does not authorize implementation, product-code changes, freeze, integration, or moving the IM-33 frozen product head.
