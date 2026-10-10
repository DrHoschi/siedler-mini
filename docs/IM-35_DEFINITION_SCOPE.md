# IM-35 Definition / Reconciliation Scope

Status: DEFINED / NOT IMPLEMENTED

Definition baseline: frozen IM-34 product head `2aff5711704b263a115405e7295b015f97250351` with marker `frozen/im-34-hq-intake-production-input-auto-reconnection-trigger`.

## Capability name

IM-35 - Production Input Return Delivery Re-Evaluation Continuity

## Reconciliation result

Frozen IM-32 establishes exactly-once HQ intake for source-bound produced output after successful delivery to the designated HQ. Frozen IM-33 materializes HQ stock as a logistics-matchable resource representation and reconnects open IM-23 production input demands to that HQ stock through the existing logistics contracts. Frozen IM-34 triggers that IM-33 reconnection automatically after a successful IM-32 HQ intake.

The remaining gap is not resource matching, HQ intake, or HQ-to-production dispatch. Those are already owned by the frozen chain. The remaining gap is the completed return-delivery edge: once the IM-34-triggered HQ-to-production transport actually delivers input stock back to the production building, that authoritative building-stock delivery must flow into the existing IM-29 production re-evaluation boundary so the blocked production building can become READY through the frozen IM-25 / IM-26 / IM-31 chain.

IM-35 therefore closes only this continuity boundary:

`IM-34-triggered HQ stock reconnection -> existing logistics transport back to the production building -> delivered BuildingStock publication -> IM-29 DELIVERED_BUILDING_STOCK re-evaluation request -> frozen IM-26/IM-31 production progression eligibility`

## Binding question

How does a production input delivery that originated from IM-34's automatic HQ intake reconnection become an authoritative production re-evaluation trigger for the receiving production building, without creating a second delivery, matching, scheduler, production settlement, SaveGame, or UI authority?

## Capability boundary

- The existing logistics path remains the only authority for transport execution and delivery.
- The existing delivered-building-stock publication remains the only authority for applying delivered input quantity to the target production building's BuildingStock.
- IM-29 remains the only production re-evaluation request/flush authority after delivered building stock.
- IM-26 remains the duplicate-safe production-cycle handoff authority.
- IM-31 remains the production-cycle time/progression authority.
- IM-35 may connect or verify the IM-34 return-delivery result to the existing IM-29 `DELIVERED_BUILDING_STOCK` request path.
- IM-35 must not credit production readiness on dispatch, match, reservation, claim, or transport-job creation alone. Readiness may change only after real delivered BuildingStock publication at the production building.
- Repeated delivery callbacks, duplicate publication attempts, repeated IM-29 requests, retries, or continuation must not create parallel cycle registrations or duplicate production settlement.
- Partial delivery may make the building READY only if the authoritative delivered quantity actually satisfies the recipe inputs; otherwise the building remains BLOCKED_INPUT and may retain partial demand/reservation state according to the frozen demand/logistics contracts.
- Missing recipe, missing workforce, invalid target building, wrong resource type, or contradictory delivery/stock evidence must fail closed.

## Likely implementation surface

Expected product files, if Gate 2 is authorized:

- `src/runtime/active-runtime-production-supply-orchestration.js`
- `src/runtime/active-runtime-production-re-evaluation-orchestration.js`
- possibly `src/main.js` if the active browser/runtime surface needs a narrow wiring call for the already existing runtime orchestrations

Expected test files:

- `src/dev/im-35-self-test.js`
- `src/dev/im-35-self-test.node.js`

No `package.json` script is required for the product head unless explicitly authorized as a separate script/docs addendum.

## Required Gate 2 evidence

A separately authorized implementation / verification must prove at minimum:

1. an IM-34-triggered HQ-stock reconnection can result in a real HQ-to-production transport reservation/job through existing logistics;
2. only successful delivered BuildingStock publication to the production building requests IM-29 re-evaluation;
3. dispatch, matching, reservation, claim, and TransportJob creation alone do not trigger production readiness or cycle registration;
4. after full required input delivery, IM-29 evaluates the receiving building and hands off exactly one eligible cycle through frozen IM-26/IM-31;
5. after partial insufficient delivery, IM-29 either keeps the building blocked or registers nothing;
6. duplicate re-evaluation requests and repeated delivered-publication evidence do not create parallel active cycle registrations;
7. wrong target building, wrong resource type, missing recipe, missing workforce, and contradictory delivery/stock evidence fail closed;
8. the existing IM-32, IM-33, IM-34, and IM-29 focused regressions remain green; and
9. IM-35 adds no production settlement, output materialization, SaveGame, scheduler, route/pathfinding, UI, warehouse policy, ResourceMatching, or ResourceAssignment authority.

## Explicit non-scope

No new HQ selection strategy; no general warehouse policy; no new ResourceMatching or ResourceAssignment behavior; no pathfinding, movement, carrier, or route implementation; no SaveGame schema or Continue lifecycle change; no production settlement or output materialization change; no recipe, building, resource, UI, renderer, Inspector, browser Pages, package-script, or CI workflow change in this definition step.

## Gate result

This document authorizes only IM-35 Definition / Reconciliation scope recording. It does not authorize product implementation, test implementation, branch publication beyond this documentation branch, freeze, integration, or IM-36 work.
