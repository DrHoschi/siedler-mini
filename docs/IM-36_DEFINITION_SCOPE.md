# IM-36 Definition / Reconciliation Scope

Status: DEFINED / NOT IMPLEMENTED

Definition baseline: frozen IM-35 product head `fe575c84e9bf72510e3ae474958c1c0ccb573fd2` with marker `frozen/im-35-production-input-return-delivery-re-evaluation-continuity`.

## Capability name

IM-36 - Settled Production Output Source-Bound HQ Delivery Demand Trigger

## Reconciliation result

Frozen IM-32 establishes exactly-once HQ intake for a source-bound produced output after successful logistics delivery to the designated HQ. Frozen IM-33 materializes HQ stock as a logistics-matchable representation and reconnects open IM-23 production input demands to that HQ stock through existing ResourceDemand, ResourceMatching, ResourceAssignment, claims, TransportJob and BuildingStock reservation contracts. Frozen IM-34 triggers that reconnection automatically after successful IM-32 HQ intake. Frozen IM-35 connects the completed HQ-to-production return delivery back into the existing IM-29 production re-evaluation boundary.

The remaining gap is the other side of the production loop. After a production cycle settles and IM-28 / IM-27 expose the produced output as a concrete logistics-addressable resource at its producing building, the product line still relies on tests or external/manual orchestration to create the source-bound HQ intake demand and logistics handoff candidate. The system therefore does not yet own the automatic transition from settled produced output to source-bound HQ delivery demand preparation.

IM-36 therefore defines only this continuity boundary:

`IM-22 settled production result -> IM-28/IM-27 produced resource materialization -> source-bound HQ intake demand preparation -> existing logistics can transport the exact produced output to the designated HQ -> frozen IM-32 intake can settle it`

## Binding question

How does a freshly settled and materialized production output become an authoritative, source-bound HQ delivery demand / logistics handoff candidate without creating a second production settlement, resource materialization, matching, transport execution, warehouse policy, SaveGame, scheduler or UI authority?

## Capability boundary

- IM-22 remains the only runtime production settlement authority.
- IM-28 / IM-27 remain the only produced-output materialization authority.
- Existing ResourceDemand, ResourceMatching, ResourceAssignment, ResourceClaims, TransportJob and BuildingStockTransportReservation contracts remain the only demand, matching, claim, job and reservation authorities.
- IM-32 remains the only source-bound output-to-HQ delivery intake authority after successful logistics delivery.
- IM-36 may define or implement a narrow trigger that observes an authoritative settled-output/materialization result and prepares an exact source-bound HQ intake demand and/or existing-logistics handoff candidate.
- The trigger must bind the concrete produced resource, source building, resource type, amount, target HQ and reservation/job evidence. It must not silently substitute another resource, building, owner, type or amount.
- Production output must not become HQ stock at trigger time. HQ availability may begin only after existing logistics delivery and frozen IM-32 intake settlement.
- Repeated publication, repeated trigger evaluation, retry, reload or continuation must not create duplicate HQ intake demands, duplicate reservations, duplicate jobs or duplicate HQ credit.
- Partial output may create only demand/reservation evidence for the real available amount. Any remainder stays governed by existing ResourceState, claims and BuildingStock contracts.
- Missing valid HQ, missing produced resource, missing source stock, wrong resource type, contradictory materialization evidence or already-consumed output must fail closed.

## Likely implementation surface

Expected product files, if Gate 2 is authorized:

- `src/runtime/active-runtime-production-output-availability-orchestration.js`
- `src/runtime/active-runtime-production-supply-orchestration.js`
- possibly a new narrow domain integration for settled-output-to-HQ-demand preparation
- possibly `src/main.js` if the active browser/runtime surface needs a narrow wiring call after IM-28 publication

Expected test files:

- `src/dev/im-36-self-test.js`
- `src/dev/im-36-self-test.node.js`

No `package.json` script, workflow, Pages, UI or SaveGame schema change is required for the product head unless a later Gate 2 reconciliation proves a concrete gap and authorizes it separately.

## Required Gate 2 evidence

A separately authorized implementation / verification must prove at minimum:

1. an IM-22-settled production output materialized by IM-28 / IM-27 can trigger exactly one source-bound HQ delivery demand / handoff candidate;
2. the demand/handoff stays bound to the exact produced resource, source building, resource type and amount;
3. no HQ stock is credited before existing logistics delivery and frozen IM-32 intake;
4. repeated trigger evaluation, repeated publication, retry or continuation does not create duplicate demand, claim, job, reservation or HQ credit;
5. partial output creates only real-available transfer evidence and does not over-reserve source BuildingStock;
6. missing valid HQ, missing produced resource, missing source stock, wrong type, wrong owner, already-consumed output and contradictory materialization evidence fail closed;
7. the existing IM-32, IM-33, IM-34, IM-35 and IM-29 focused regressions remain green;
8. the implementation adds no production settlement, output materialization, transport execution, pathfinding, carrier movement, SaveGame, scheduler, UI, warehouse policy, ResourceMatching or ResourceAssignment authority.

## Explicit non-scope

No new HQ selection strategy beyond using an existing valid designated HQ; no general warehouse policy; no priority, queue, stock balancing or distribution strategy; no new ResourceMatching or ResourceAssignment behavior; no pathfinding, movement, carrier, route or transport execution implementation; no production settlement or output materialization change; no SaveGame schema or Continue lifecycle change unless later proven and separately authorized; no recipe, building, resource, UI, renderer, Inspector, browser Pages, package-script or CI workflow change in this definition step.

## Gate result

This document authorizes only IM-36 Definition / Reconciliation scope recording against frozen IM-35 product head `fe575c84e9bf72510e3ae474958c1c0ccb573fd2`. It does not authorize product implementation, test implementation, branch publication beyond this documentation branch, freeze, integration, or IM-37 work.
