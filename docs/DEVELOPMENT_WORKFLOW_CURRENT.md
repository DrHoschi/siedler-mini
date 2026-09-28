# Neue Siedler – Current Development Workflow

## IM-29 definition record — 2026-09-28

**IM-29 – Active Runtime Production Re-evaluation Orchestration: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** `5d538c75e8003b3a807be38f040906d55ddc1299`.

### Binding question

How is production deterministically re-evaluated after an authoritative production-relevant state change inside the Active Runtime Composition so frozen IM-25 can decide whether a concrete production cycle is admissible and only that admitted cycle can be handed to frozen IM-26, without making Scheduler ticks themselves Production Admission and without introducing an uncontrolled production loop?

### Trigger / re-evaluation contract

IM-29 owns only re-evaluation orchestration. A trigger may arise only from an already completed authoritative state change that can actually change the production decision.

The frozen chain currently proves at least these trigger boundaries:

- IM-24: successful material delivery changes the production building's BuildingStock. IM-24 itself remains `productionTriggered:false`.
- IM-28: successful production settlement publishes the new BuildingStock plus settlement fence/receipt and then materializes output. Only the fully published post-settlement state may be the basis for successor re-evaluation.

A Scheduler tick by itself is not an Admission trigger. Rendering, UI calls and repeated reads of unchanged state must not create a new production cycle.

### Relationship to frozen IM-24 / IM-25 / IM-26 / IM-28

The authority chain remains:

**IM-24 changes supply/BuildingStock → IM-29 causes re-evaluation → IM-25 decides Admission and cycle identity → IM-26 prevents parallel duplicate handoff and registers exactly that admitted cycle → IM-22 executes it one-shot → IM-18F/IM-20F settle and evidence the effect → IM-28/IM-27 expose the output → IM-29 may re-evaluate only against the resulting authoritative state.**

IM-29 may neither create IM-25's cycle identity nor replace IM-26 registration. It does not produce or settle anything itself.

### Successor-cycle boundary

After a successfully completed cycle IM-29 must not simply start a next cycle. The new authoritative state must be evaluated again through frozen IM-25.

- BLOCKED_INPUT → no successor handoff.
- READY → IM-25 alone derives the next deterministic cycle identity from existing settlement history.
- Only ADMITTED may be handed to frozen IM-26.
- IM-26 remains responsible for preventing parallel registration of the same buildingId + cycleId.

A successor is therefore a new Admission from new authoritative state, not continuation of the old cycle.

### Exactly-once / Continue boundary

IM-29 introduces no persistent re-evaluation or processed-trigger ledger.

Exactly-once remains layered:

**IM-25 = deterministic cycle identity → IM-26 = single active handoff/registration → IM-20F = settlement fence/receipt → IM-27 = output materialization.**

After Runtime reconstruction / Continue only restored authoritative state may be re-evaluated. Already settled cycles must not be admitted again under the same cycle identity because their fence/receipt history already exists; any newly admissible cycle must again be determined by IM-25.

This definition does not claim a real-browser Save → Reload → Continue proof for IM-29 and defines no SaveGame schema change.

### Required later evidence

A later implementation must prove at minimum: delivered missing inputs → re-evaluation → IM-25 Admission → IM-26 registration; successful settlement state → re-evaluation and, only while still READY, a deterministic new successor cycle; BLOCKED_INPUT causes no handoff; unchanged state causes no parallel duplicate registration; Scheduler ticks are not Admission authority; settlement/receipt/output-materialization remain at their frozen authorities; reconstructed/restored-equivalent state neither replays an old cycle nor creates a parallel duplicate handoff.

### Explicit NON-SCOPE

No production duration, cooldown, takt/cycle time, time-based production rate, every-X-seconds production, Scheduler-tick-based Admission, new Recipe/Workforce/BuildingStock authority, new demand strategy, output distribution or target selection, minimum-stock or production-priority policy, global logistics optimization, new transport/routing mechanics, trade/market, new resources/recipes/buildings, Player UI, Inspector expansion or SaveGame rearchitecture.

This definition record authorizes no Implementation Scope Reconciliation, no development branch and no implementation.

## IM-28 completion / evidence / freeze — 2026-09-28

**IM-28 – Active Runtime Production Output Availability Orchestration: COMPLETE / FROZEN / PASS / 0 FUNCTIONAL BLOCKER.**

**Frozen functional/product head:** `3e068eb0868f5ab50893b57acb99fa0f2ccc238e`.

### Frozen capability

IM-28 closes only the defined Active Runtime Production Settlement → frozen IM-27 Resource Availability Materialization orchestration boundary. After frozen IM-22 has authoritatively published a successful production settlement, the same active Runtime Composition hands the existing settlement evidence to frozen IM-27 so the post-settlement output becomes available through the existing ResourceState and therefore discoverable by existing ResourceMatching.

IM-20F settlement fence + production effect receipt remain the authoritative production-effect evidence. Frozen IM-27 remains the materialization exactly-once boundary. IM-28 introduces no persistent processed-settlement ledger, second ResourceState, stock ledger, Production authority, demand/claim/assignment/transport authority or SaveGame authority.

### Frozen implementation scope

Exactly five files differ from the IM-28 definition/documentation head `cc9aba21637b21e0d7d61f292fee4de089f6d59b`:

1. NEW `src/runtime/active-runtime-production-output-availability-orchestration.js`
2. NEW `src/dev/im-28-self-test.js`
3. NEW `src/dev/im-28-self-test.node.js`
4. MODIFIED `src/main.js`
5. MODIFIED `.github/workflows/ci.yml`

No frozen IM-22, IM-26, IM-27, ResourceState, ResourceClaims, ResourceMatching, ResourceDemands, BuildingStock/settlement contract, Transport or SaveGame implementation file was changed.

### Verification / evidence

Exact-head verification was performed against `3e068eb0868f5ab50893b57acb99fa0f2ccc238e`.

- Definition/documentation head: `cc9aba21637b21e0d7d61f292fee4de089f6d59b`.
- Branch comparison: 7 commits ahead / 0 behind; merge base exactly the definition/documentation head; only the five authorized files changed.
- CI Baseline **#5872**, run **36400085837**, exact head `3e068eb0868f5ab50893b57acb99fa0f2ccc238e`: **SUCCESS**.
- Job **Clean Runtime + CR/IM Regression**: **SUCCESS**.
- Clean Runtime syntax gate: **PASS / 0 Blocker**.
- Frozen predecessor regression through IM-27: **PASS**.
- IM-28 self-test: **PASS / blockerCount 0**.
- Verified IM-28 cases: the active publish seam materializes a real IM-22 settlement through frozen IM-27; direct real IM-22 settlement materializes output into the active ResourceState; existing ResourceMatching discovers the materialized output; repeated same-settlement reconciliation does not duplicate output; BLOCKED_INPUT materializes nothing; ALREADY_SETTLED creates no new quantity; settlement/BuildingStock/receipt authorities remain unchanged by IM-28; reconstructed/restored-equivalent already represented output is not rematerialized; IM-28 owns no production, demand, transport or SaveGame authority.
- The reconstructed/restored-equivalent self-test is Runtime reconstruction evidence only; it is not claimed as a separate real-browser Save → Reload → Continue product test.

### Separate Pages evidence

Deploy Authoritative Development Testbuild to Pages **#209**, run **36400085818**, exact head `3e068eb0868f5ab50893b57acb99fa0f2ccc238e`: **FAILURE**.

This is recorded as **KNOWN DEPLOYMENT/PAGES FAILURE / NON-FUNCTIONAL / NON-BLOCKING FOR IM-28 FREEZE**. The successful exact-head CI and regression evidence above is the functional freeze evidence. No successful Pages deployment or browser/device test is claimed for IM-28 by this record.

### Freeze result

**PASS / 0 FUNCTIONAL BLOCKER / 0 SCOPE BLOCKER.**

IM-28 is therefore **COMPLETE / FROZEN** at functional/product head `3e068eb0868f5ab50893b57acb99fa0f2ccc238e`. This freeze authorizes no successor capability, no successor identifier and no implementation beyond the frozen IM-28 scope.

## IM-28 definition record — 2026-09-28

**IM-28 – Active Runtime Production Output Availability Orchestration: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** `cffa22ec738f78aa6e21547d58ac512a87016f3d` (frozen post-IM-27 state).

### Binding question

How is output successfully settled by the frozen IM-22 / IM-18F production chain handed to the frozen IM-27 materialization boundary inside the same Active Runtime Composition so that the output becomes available exactly once to existing ResourceMatching, without introducing a second Production, Stock, Resource, Logistics or SaveGame authority?

### Binding contract

- IM-28 owns only active orchestration between a successful authoritative Production Settlement and frozen IM-27.
- An IM-28 handoff may start only from an already successful, authoritatively published Production Settlement. Authoritative evidence remains the resulting BuildingStock together with `productionSettlementIds` and `productionEffectReceipts`.
- IM-28 must not produce, settle, create or alter a production settlement fence or effect receipt.
- For a successfully settled effect, IM-28 hands the existing Production Effect Receipt to frozen IM-27. Frozen IM-27 remains solely responsible for validation and ResourceState materialization.
- Materialization must evaluate the post-settlement BuildingStock. A pre-settlement stock state must not be used.
- The existing ResourceState instance in the Active Runtime Composition remains the Resource authority. IM-28 must not create a second ResourceState or parallel quantity ledger.
- After successful materialization, the same active Runtime state must expose that output to the existing ResourceMatching / demand / logistics boundaries.
- IM-28 itself creates no ResourceDemand, match, claim, assignment or transport job.

### Exactly-once / Continue boundary

- Existing IM-20F settlement fence + effect receipt remain authoritative production-effect evidence.
- Frozen IM-27 remains the materialization exactly-once boundary. IM-28 introduces no persistent processed-settlement ledger.
- Re-offering the same settled effect inside one Runtime must not create additional available ResourceState quantity; frozen IM-27 must recognize an already represented effect.
- Save→Continue or Runtime reconstruction must not make an already represented production effect appear again as additional ResourceState quantity.
- If restored authoritative state contains a valid production settlement fence + receipt but lacks the corresponding IM-27 representation, active orchestration may offer that same authoritative effect to frozen IM-27 again; IM-27 decides materialization or fail-closed from restored authoritative state.
- IM-28 defines no SaveGame schema change. If later scope reconciliation proves that existing persistence cannot preserve the required state, that is a separate evidenced boundary and must not be silently absorbed into IM-28.

### Required later evidence

A later implementation must prove at minimum:

1. A real frozen IM-22 `SETTLED` result inside Active Runtime leads to frozen IM-27 materialization using the resulting post-settlement authoritative state.
2. Existing ResourceMatching can discover the materialized output afterwards without a new logistics authority.
3. Repeated handling of the same settled effect creates no duplicate available ResourceState quantity.
4. `BLOCKED_INPUT` and `ALREADY_SETTLED` do not create unauthorized new output quantity.
5. BuildingStock, production settlement fences and production effect receipts remain authoritative and are not rewritten by IM-28.
6. Multiple settled production effects remain distinct and correctly bound to their producer/resource outputs.
7. Reconstructed/restored authoritative state does not duplicate an already represented production effect.
8. IM-28 creates no production cycle, demand, claim, assignment, transport dispatch, second stock/resource authority or SaveGame authority.

### Explicit NON-SCOPE

No automatic successor production, production duration, cooldown, takt time, periodic or endless production, new demand strategy, output target selection/distribution, minimum-stock policy, production priority, global logistics optimization, new transport/routing mechanics, trade/market, new resources/recipes/buildings, Player UI, Inspector expansion or SaveGame rearchitecture.

No implementation scope reconciliation, implementation branch or implementation is authorized by this definition record.

## IM-27 completion / evidence / freeze — 2026-09-28

**IM-27 – Production Output Resource Availability Integration: COMPLETE / FROZEN / PASS / 0 FUNCTIONAL BLOCKER.**

**Frozen functional/product head:** `83d90501c8a22113b72b0eb20d3b47e5a9d223ea`.

### Frozen capability

IM-27 closes only the defined Production Output → existing ResourceState availability boundary. Successfully settled production output, already evidenced by the existing production settlement fence plus production effect receipt, can be represented exactly once through the existing ResourceState so the frozen ResourceDemand / ResourceMatching / ResourceAssignment / BuildingStock-reservation / Transport chain can discover that real producer-owned stock.

BuildingStock remains the authoritative building-local quantity truth. ResourceState remains the existing logistics-addressable representation and is not promoted into a second stock authority. IM-27 creates no consumer demand, production cycle, transport dispatch, consumption, SaveGame authority or production history.

### Frozen implementation scope

Exactly four files differ from the IM-27 definition baseline `05b59ed32eee15bc33cbe1ed6168ee9369f1a354`:

1. NEW `src/domain/production-output-resource-availability-integration.js`
2. NEW `src/dev/im-27-self-test.js`
3. NEW `src/dev/im-27-self-test.node.js`
4. MODIFIED `.github/workflows/ci.yml`

No `src/main.js`, SaveGame, BuildingStock, ResourceState, ResourceMatching, ResourceClaims, ResourceDemands, ResourceAssignment, Transport, IM-22, IM-23, IM-24, IM-25 or IM-26 implementation file was changed.

### Verification / evidence

Exact-head verification was performed against `83d90501c8a22113b72b0eb20d3b47e5a9d223ea`.

- Definition baseline: `05b59ed32eee15bc33cbe1ed6168ee9369f1a354`.
- Branch comparison: 5 commits ahead / 0 behind; merge base exactly the definition baseline; only the four authorized files changed.
- CI Baseline **#5861**, run **36382954070**, exact head `83d90501c8a22113b72b0eb20d3b47e5a9d223ea`: **SUCCESS**.
- Job **Clean Runtime + CR/IM Regression**: **SUCCESS**.
- Clean Runtime syntax gate: **PASS / 0 Blocker**.
- Frozen predecessor regression through IM-26: **PASS**.
- IM-27 self-test: **PASS / blockerCount 0**.
- Verified IM-27 cases: settled output materializes once; missing settlement fence materializes nothing; ResourceState representation cannot exceed authoritative BuildingStock; multiple output resource types remain separated; an existing demand discovers produced stock through unchanged ResourceMatching; restored-equivalent already represented production output is not rematerialized; IM-27 owns no demand, transport, production or SaveGame authority.

### Separate Pages evidence

Deploy Authoritative Development Testbuild to Pages **#197**, run **36382954013**, exact head `83d90501c8a22113b72b0eb20d3b47e5a9d223ea`: **FAILURE**.

This is recorded as **KNOWN DEPLOYMENT/PAGES FAILURE / NON-FUNCTIONAL / NON-BLOCKING FOR IM-27 FREEZE**. The successful exact-head product CI and IM-27 regression provide the functional freeze evidence. No browser/Pages success is claimed by this freeze record.

### Freeze boundary

IM-27 is frozen at `83d90501c8a22113b72b0eb20d3b47e5a9d223ea`. The existing definition NON-SCOPE remains binding: no automatic successor production, duration/cooldown/takt/periodic loop, new demand strategy, output distribution strategy, minimum-stock policy, production priority, global logistics optimization, new transport/routing authority, trade/market, new resources/recipes/buildings, Player UI, Inspector expansion or SaveGame rearchitecture.

No successor capability, successor ID, implementation branch or implementation is authorized by this freeze.

## IM-27 definition record — 2026-09-28

**IM-27 – Production Output Resource Availability Integration: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** `42dd9cb46c099ee0607b7babdf5cdd95a56ade76` (frozen post-IM-26 state).

### Binding question

How is output successfully produced by the frozen production chain in an authoritative production-building BuildingStock integrated exactly once into the existing ResourceState availability boundary so that existing ResourceDemands / ResourceMatching / ResourceAssignment / transport logistics can use that real stock, without introducing a second stock or logistics authority?

### Binding contract

- BuildingStock remains the authoritative quantity truth for building-local stock.
- ResourceState may represent produced stock only as the already-existing logistics-addressable / matchable resource boundary; it must not become an independent second stock truth.
- Integration may start only from successfully settled production output already evidenced by the existing production settlement fence + effect receipt. IM-25 admission, an IM-26 registration, or an unexecuted IM-22 cycle must create no available resource.
- Produced output must remain bound to the producing `buildingId` and the existing `resourceTypeId`.
- Logistics-visible produced quantity must never exceed the corresponding authoritative produced / still-available BuildingStock quantity.
- Repeated evaluation of the same settled production effect or active-Runtime reconstruction must not materialize the same production effect as additional ResourceState quantity.
- Existing IM-20F settlement fence + effect receipt remain the exactly-once production-effect evidence. IM-27 must not replace or reinterpret them as a second production history.
- Existing ResourceMatching, ResourceClaims, ResourceDemands, ResourceAssignment, BuildingStock transport reservation and Transport authorities are reused rather than replaced.
- Later reservation/delivery remains constrained by the actual authoritative BuildingStock through the existing reservation/settlement boundaries.
- IM-27 creates no new consumer demand. Demand admission remains owned by the respective existing consumer integration.
- IM-27 does not start production, admit a production cycle, schedule production, dispatch transport or consume output automatically.

### Continue / exactly-once boundary

- Save→Continue must not cause already materialized production output to appear a second time as additional available ResourceState quantity.
- Restored authoritative production fences/receipts, BuildingStocks and existing ResourceState must together be sufficient to recognize an already represented production effect or fail closed.
- IM-27 must introduce no second quantity ledger beside the existing BuildingStock / ResourceState boundaries and no new production-history authority.

### Required later evidence

A later implementation must prove at minimum:

1. Successfully settled production output becomes available to existing ResourceMatching exactly once.
2. Repeated integration of the same settled production effect creates no duplicate available quantity.
3. Unsettled / merely admitted / merely registered production creates no ResourceState output.
4. Multiple output resources / resource types remain correctly separated and bound to the producing building.
5. An existing consumer ResourceDemand can discover produced stock through the existing ResourceMatching and BuildingStock-reservation boundary without a new logistics authority.
6. Reconstructed / restored authoritative state does not rematerialize already represented production output.
7. Logistics-visible quantity cannot exceed the corresponding authoritative available BuildingStock.
8. IM-27 itself creates no demand, transport dispatch, production cycle or second stock authority.

### Explicit NON-SCOPE

No automatic successor production, production duration, cooldown, takt time, periodic or endless production cycle, new demand strategy, output-distribution strategy or target selection, minimum-stock policy, production priority, global logistics optimization, new transport/routing mechanics, trade/market, new resources/recipes/buildings, Player UI, Inspector expansion or SaveGame rearchitecture.

No implementation branch or implementation is authorized by this definition record.

## IM-26 completion / evidence / freeze — 2026-09-28

**IM-26 – Active Runtime Production Cycle Execution Orchestration: COMPLETE / FROZEN / PASS / 0 FUNCTIONAL BLOCKER.**

**Frozen functional/product head:** `8399ffc3f90701b5fc49ca0ed89c8f7d08e8645c`.

**Definition/documentation baseline:** `d5369776d5679c5b850efd973aca329b008ea808`.

### Frozen scope and authority result

- IM-26 owns only transient active-Runtime orchestration from frozen IM-25 cycle admission to frozen IM-22 one-shot execution.
- Frozen IM-18E remains the sole production-readiness authority; only an IM-25 `ADMITTED` result is handed to IM-22.
- IM-26 uses exactly the `buildingId + cycleId` supplied by IM-25 and does not create or alter production-cycle identity.
- The same admitted `buildingId + cycleId` is handed to at most one active IM-22 registration in one active Runtime. The duplicate-registration marker is transient coordination only and is neither persisted nor treated as production/settlement evidence.
- Frozen IM-22 retains Scheduler registration identity, one-shot unregister semantics, execution-time readiness evaluation and production execution orchestration.
- Frozen IM-18F remains input/output settlement authority; frozen IM-20F settlement fences + effect receipts remain authoritative exactly-once evidence.
- `BLOCKED_INPUT` creates no IM-22 registration. Scheduler ticks do not admit production cycles.
- After settlement, only a fresh IM-25 evaluation of resulting authoritative history can identify a distinct successor cycle.
- IM-26 itself performs no BuildingStock settlement, creates no settlement fence/effect receipt, and introduces no second Scheduler, Production or SaveGame authority.
- Runtime reconstruction evidence verifies that an unsettled restored-equivalent authoritative state derives the same deterministic cycle identity and creates exactly one new transient registration. This is not recorded as a separate browser Save→Continue product test and introduces no SaveGame schema change.

### Authorized and verified implementation scope

The complete functional diff against `d5369776d5679c5b850efd973aca329b008ea808` is limited to exactly five files:

1. new `src/runtime/active-runtime-production-cycle-execution-orchestration.js`;
2. new `src/dev/im-26-self-test.js`;
3. new `src/dev/im-26-self-test.node.js`;
4. modified `src/main.js` only to bind/expose the IM-26 orchestration to the existing active Runtime Composition seam;
5. modified `.github/workflows/ci.yml` only to add the IM-26 self-test to the regression chain.

No frozen IM-18 / IM-20 / IM-22 / IM-23 / IM-24 / IM-25 authority file, SaveGame schema/restore implementation or Scheduler implementation was changed.

### Focused syntax correction

The initial implementation head `5e72b1b6c6edbe7ff59d4b2216142ae2cef6a88e` failed CI Baseline #5851 because `src/main.js` contained a literal `\\n` between the existing IM-24 import and the new IM-26 import. The separately authorized focused correction replaced only that literal sequence with a real line break. Corrected functional head: `8399ffc3f90701b5fc49ca0ed89c8f7d08e8645c`. No scope expansion resulted.

### Exact-head verification evidence

Verification was performed against exact corrected functional head `8399ffc3f90701b5fc49ca0ed89c8f7d08e8645c`.

- Git comparison against definition/documentation baseline `d5369776d5679c5b850efd973aca329b008ea808`: 6 commits ahead, 0 behind, merge-base exactly the authorized baseline, with only the five authorized files changed.
- **CI Baseline #5852**, run `36376209861`, completed **SUCCESS** on exact SHA `8399ffc3f90701b5fc49ca0ed89c8f7d08e8645c`.
- Job **Clean Runtime + CR/IM Regression** completed **SUCCESS**, including syntax validation and the IM-26 self-test in the regression command.
- IM-26 self-test covers one IM-22 registration from READY admission, duplicate-handoff prevention, no registration for BLOCKED_INPUT, existing IM-22 settlement/fence/receipt behavior, distinct successor admission after settled history becomes READY again, reconstructed-runtime reuse of the same unsettled deterministic cycle identity, non-mutation during handoff, and absence of IM-26 settlement/SaveGame ownership.
- **Deploy Authoritative Development Testbuild to Pages #187**, run `36376209878`, completed **FAILURE** on the same exact SHA. This remains recorded as **KNOWN DEPLOYMENT/PAGES FAILURE / NON-FUNCTIONAL / NON-BLOCKING FOR IM-26 FREEZE**; functional Exact-Head CI/regression is successful.

### Frozen boundary

**IM-25 determines which concrete production cycle may exist next. IM-26 hands that exact admitted cycle to at most one active IM-22 registration in the current Runtime. IM-22 executes the one-shot cycle. IM-18F settles its input/output effect. IM-20F protects and reconciles the applied effect through settlement fence + effect receipt.**

IM-26 is therefore **COMPLETE / FROZEN / PASS / 0 FUNCTIONAL BLOCKER** at functional head `8399ffc3f90701b5fc49ca0ed89c8f7d08e8645c`.

No successor ID, successor capability or IM-27+ definition is authorized by this freeze record.

## IM-26 definition record — 2026-09-27

**IM-26 – Active Runtime Production Cycle Execution Orchestration: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** `e7e44f931069961d6359130784ff0a02e3f09132` (frozen post-IM-25 state).

### Binding question

How is a concrete production cycle deterministically admitted by frozen IM-25 handed off exactly once inside the active Runtime to the existing frozen IM-22 one-shot execution boundary, without treating Scheduler ticks as production admission, without parallel duplicate registration of the same cycle, and without introducing a second Production / Settlement / SaveGame authority?

### Binding contract

- IM-26 owns only the active-Runtime orchestration between frozen IM-25 admission and frozen IM-22 one-shot execution.
- The starting point is an existing authoritative active Runtime Composition with an operational production building, valid frozen workforce/recipe binding, current BuildingStocks, and existing production settlement fences/effect receipts.
- Frozen IM-18E remains the sole production-readiness authority.
- Only `IM-25 status: ADMITTED` may be handed to IM-22. `NOT_ADMITTED` / `BLOCKED_INPUT` installs no IM-22 production-cycle registration.
- IM-26 must use exactly the `buildingId` and `cycleId` admitted by IM-25. It must not create, alter or replace cycle identity.
- For the same `buildingId + cycleId`, at most one active IM-22 registration may exist in one active Runtime. Repeated orchestration evaluation of unchanged authoritative state must not create a parallel duplicate registration.
- IM-26 must not replace IM-22. Scheduler identity, one-shot unregister semantics, execution-time readiness evaluation, settlement invocation and effect-receipt publication remain owned by frozen IM-22 and its existing authorities.
- A Scheduler tick is never production admission. It may only execute an already admitted and registered concrete cycle.
- After successful IM-22 settlement, the old cycle is completed by its existing settlement fence + effect receipt. Only a fresh IM-25 evaluation of the resulting authoritative state may admit a successor cycle.
- If an admitted IM-22 one-shot evaluates to `BLOCKED_INPUT` when it actually executes, that registration remains consumed according to frozen IM-22 semantics and must not self-reactivate after later material supply.
- IM-26 performs no input/output settlement and no direct BuildingStock mutation.

### Duplicate-registration / exactly-once boundary

- **IM-25:** determines which concrete production cycle may exist next.
- **IM-26:** controls whether that exact admitted `buildingId + cycleId` has already been handed to / is actively registered with IM-22 in the current Runtime.
- **IM-22:** executes that concrete one-shot registration.
- **IM-18F:** settles its input/output effect.
- **IM-20F:** keeps settlement fence + effect receipt as authoritative evidence of an already-applied effect.
- Any IM-26 runtime registration marker is transient runtime coordination only. It is not production evidence and must not replace a settlement fence or effect receipt.

### Continue behavior

- Existing SaveGame production history remains authoritative through restored production settlement fences/effect receipts. IM-26 introduces no persisted Scheduler-registration or active-production-cycle authority.
- After Continue, orchestration is reconstructed from restored authoritative state rather than replaying an old runtime registration.
- An already-settled cycle is not registered again; IM-25 derives the next admissible identity from restored production history.
- A restored `READY` state whose deterministic IM-25 cycle is not settled may hand that same cycle identity to IM-22 exactly once in the reconstructed active Runtime.
- A restored `BLOCKED_INPUT` state installs no production-cycle registration.
- Inconsistent production fence/receipt history remains fail-closed under the existing frozen exactly-once boundaries.
- No SaveGame schema change or second recovery authority is introduced.

### Required later evidence

A later implementation must prove at minimum:

1. A real active-Runtime `READY` production building is admitted by IM-25 and handed to exactly one IM-22 registration.
2. Repeated handoff evaluation before execution creates no duplicate registration for the same `buildingId + cycleId`.
3. `BLOCKED_INPUT` creates no IM-22 registration.
4. Successful IM-22 settlement creates the existing fence/receipt evidence and the settled cycle is not registered again.
5. Fresh IM-25 evaluation after settlement admits a distinct successor cycle.
6. Continue from the same not-yet-settled restored `READY` state yields the same deterministic cycle identity and exactly one reconstructed runtime registration.
7. Continue with an already-settled cycle does not replay that cycle's production effect.
8. IM-26 itself does not mutate BuildingStocks or settlement evidence and does not create a second Scheduler/Production/SaveGame authority.

### Explicit NON-SCOPE

No production duration, cooldown, takt time, periodic production, automatic endless production loop, Scheduler tick as cycle admission, output distribution, multi-building production chain, minimum-stock strategy, production priorities, global logistics optimization, new workforce-assignment authority, new transport mechanics, new recipes/resources/buildings, Player UI, Inspector expansion or SaveGame rearchitecture.

No implementation branch or implementation is authorized by this definition record.

## IM-25 completion / evidence / freeze — 2026-09-27

**IM-25 – Deterministic Production Cycle Admission: COMPLETE / FROZEN / PASS / 0 FUNCTIONAL BLOCKER.**

**Frozen functional/product head:** `e9fe375e854924ddb3f41ebc74d5fbd3fd155879`.

**Definition/documentation baseline:** `f6244c6185f2d7d6f96a3415df0404cbea0f7170`.

### Frozen scope and authority result

- IM-25 owns only deterministic admission and identity of the next concrete production cycle. It does not execute or settle production.
- Frozen IM-18E remains the sole `READY` / `BLOCKED_INPUT` authority. `BLOCKED_INPUT` admits no cycle.
- A `READY` state derives a stable deterministic `cycleId` from the concrete building and its already authoritative completed production history; wall-clock time, render frames, device speed and randomness are not identity inputs.
- Repeated evaluation of unchanged authoritative state returns the same next cycle identity and creates no parallel cycle.
- Existing IM-22 settlement IDs, IM-20F production settlement fences and production effect receipts remain the exactly-once evidence. IM-25 reads that history but does not mutate or reinterpret it.
- Successful prior settlement advances the deterministic next-cycle identity. Inconsistent fence/receipt history rejects fail-closed.
- Admission mutates neither BuildingStocks nor production settlement fences nor production effect receipts and owns no Scheduler registration.
- IM-22 remains the separately invoked one-shot production execution authority; IM-18F remains input/output settlement authority; IM-20F remains exactly-once/recovery authority.
- No SaveGame schema or restore/rebinding authority was added or changed.

### Authorized and verified implementation scope

The complete functional diff against `f6244c6185f2d7d6f96a3415df0404cbea0f7170` is limited to exactly four files:

1. new `src/domain/deterministic-production-cycle-admission.js`;
2. new `src/dev/im-25-self-test.js`;
3. new `src/dev/im-25-self-test.node.js`;
4. modified `.github/workflows/ci.yml` only to add the IM-25 self-test to the frozen regression chain.

No frozen IM-18 / IM-20 / IM-22 / IM-23 / IM-24 implementation file, `src/main.js`, SaveGame schema, Runtime production execution or Scheduler authority was changed.

### Exact-head verification evidence

Verification was performed against exact functional head `e9fe375e854924ddb3f41ebc74d5fbd3fd155879`.

- Git comparison against definition/documentation baseline `f6244c6185f2d7d6f96a3415df0404cbea0f7170`: 4 commits ahead, 0 behind, merge-base exactly the authorized baseline, with only the four authorized files changed.
- **CI Baseline #5842**, run `36345465340`, completed **SUCCESS** on exact SHA `e9fe375e854924ddb3f41ebc74d5fbd3fd155879`.
- Job **Clean Runtime + CR/IM Regression** completed **SUCCESS**.
- IM-25 self-test completed **PASS / blockerCount 0** and covers stable first-cycle admission without mutation, no admission for `BLOCKED_INPUT`, deterministic advancement after settled production, fail-closed inconsistent fence/receipt history, and isolation of foreign-building production history.
- Restored-equivalent authoritative production state yields the same next-cycle decision; IM-25 introduces no separately persisted next-cycle counter or SaveGame authority.
- **Deploy Authoritative Development Testbuild to Pages #176**, run `36345465339`, completed **FAILURE** on the same exact SHA. This is recorded as **KNOWN DEPLOYMENT/PAGES FAILURE / NON-FUNCTIONAL / NON-BLOCKING FOR IM-25 FREEZE**. Functional Exact-Head CI remains green and IM-25 introduces no player-facing UI/runtime activation requiring Pages evidence for its contract.

### Frozen boundary

**IM-25 determines which concrete production cycle may exist next. IM-22 executes that separately admitted cycle once. IM-18F settles its input/output effect. IM-20F protects and reconciles the applied effect through settlement fence + effect receipt.**

Explicit NON-SCOPE remains unchanged: production duration/cooldown/takt time, periodic Scheduler production, automatic endless production loops, output distribution, multi-building production chains, minimum-stock strategy, production priorities, global logistics optimization, new workforce/transport authority, new recipes/resources/buildings, Player UI, Inspector expansion and SaveGame rearchitecture.

This freeze authorizes no successor ID, no successor capability and no IM-26 definition or implementation.

## IM-25 definition record — 2026-09-27

**IM-25 – Deterministic Production Cycle Admission: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** `a550b9902546b8d3c6f5c86a9e82df9d4aefa7d0` (frozen post-IM-24 state).

### Binding question

How is exactly the next concrete production cycle deterministically admitted and identified for a still-operational production building after no prior cycle or an already completed cycle, without treating Scheduler ticks as production cycles and without bypassing the frozen IM-22 / IM-20F exactly-once boundaries?

### Binding contract

- IM-25 owns only admission and identity of a concrete next production cycle. It does not produce or settle anything itself.
- Admission starts from existing authoritative state: operational building, valid frozen IM-18 workforce/recipe binding, current BuildingStocks, and existing production settlement fences/effect receipts.
- Frozen IM-18E remains the sole authority for `READY` versus `BLOCKED_INPUT`.
- Only `READY` may admit a new production cycle. `BLOCKED_INPUT` admits no cycle; missing-input supply remains owned by frozen IM-23 / IM-24.
- Every admitted cycle receives a stable deterministic `cycleId` bound to the concrete building and its authoritative production history. Cycle identity must not derive from wall-clock time, render frames, device speed or randomness.
- Repeated evaluation of the same authoritative starting state must not create multiple parallel cycle identities.
- Existing IM-22 production settlement fences and production effect receipts remain authoritative evidence of already-applied production effects. IM-25 must not alter, remove or reinterpret those fences or receipts.
- An admitted cycle is only authorization to invoke the existing frozen IM-22 `installOneShotProductionCycle(...)` boundary with that exact identity. IM-22 remains execution/settlement orchestration authority.
- After successful IM-22 settlement, a new cycle may only be derived from the resulting new authoritative state and must be distinct from the settled predecessor cycle.
- A `BLOCKED_INPUT` IM-22 attempt must not later self-activate through the same one-shot Scheduler registration. After supply and renewed `READY` evaluation, controlled admission is required again.
- Save -> Continue must not derive an additional or different cycle identity from the same restored production state. The restored authoritative production history must lead to the same admission decision.
- IM-25 introduces no second Production, Scheduler, Settlement, BuildingStock or SaveGame authority.

### Exactly-once boundary

- **IM-25:** determines which concrete production cycle may exist next.
- **IM-22:** executes that specifically admitted cycle once.
- **IM-18F:** settles that cycle's input/output effect.
- **IM-20F:** protects and reconciles already-applied effects through settlement fence + effect receipt.
- A `cycleId` by itself is neither production evidence nor a settlement fence.

### Required later evidence

A later implementation must prove at minimum:

1. First `READY` authoritative state admits exactly one stable next cycle.
2. Repeated admission against the same unchanged authoritative state does not create a second cycle identity.
3. `BLOCKED_INPUT` admits no cycle.
4. After successful frozen IM-22 settlement, exactly one new cycle distinct from its predecessor can be admitted from the resulting state.
5. Save -> Continue preserves the same next-cycle admission decision for the same restored production history.
6. Admission does not mutate BuildingStocks, production settlement fences or production effect receipts.

### Explicit NON-SCOPE

No production duration, cooldown, takt time, periodic Scheduler production, automatic endless production loop, output distribution, multi-building production chain, minimum-stock strategy, production priorities, global logistics optimization, new workforce-assignment authority, new transport mechanics, new recipes/resources/buildings, Player UI, Inspector expansion or SaveGame rearchitecture.

No implementation branch or implementation is authorized by this definition record.

## IM-24 completion / evidence / freeze — 2026-09-27

**IM-24 – Active Runtime Production Supply Orchestration: COMPLETE / FROZEN / PASS / 0 FUNCTIONAL BLOCKER.**

**Frozen functional/product head:** `88250a2ed54b99d836858ef77f90a107df93fc83`.

**Definition/documentation baseline:** `e70e738a6a6480d1414cdd098b40b1b97b1e91e1`.

### Frozen scope and authority result

- IM-24 connects the already-frozen IM-18 production-readiness, IM-23 production-input supply and existing Resource/BuildingStock/Transport/Delivery authorities through the active Runtime Composition.
- `OperationalProductionExecution.evaluate()` remains the sole production-readiness authority. A real `BLOCKED_INPUT + missingInputs` state may activate/reuse the existing IM-23 supply path; IM-24 does not introduce a second readiness or recipe calculation.
- Existing IM-23 demand identity, duplicate suppression, ResourceDemand/Claim/Matching/Assignment and BuildingStock transport-reservation semantics remain authoritative and are reused rather than reimplemented.
- Existing delivered-transport and BuildingStock settlement authorities remain authoritative. Successful delivery is published back into the same active Runtime Composition with the resulting target BuildingStock and released existing reservation/workforce state.
- After authoritative input delivery, IM-18E is reevaluated from the updated Runtime state. Reaching `READY` remains readiness only and does not execute production.
- IM-22 remains the separately admitted one-shot production execution authority. IM-24 does not automatically create/install an IM-22 cycle and owns no production scheduler or production settlement authority.
- Existing IM-20 Save/Continue schema and recovery authorities remain unchanged. IM-24 introduces no parallel continuity ledger or SaveGame rearchitecture.
- The authorized implementation diff remains limited to `.github/workflows/ci.yml`, `src/dev/im-24-self-test.js`, `src/dev/im-24-self-test.node.js`, `src/diagnostics/baseline-miniworld-scenario.js`, `src/main.js`, and `src/runtime/active-runtime-production-supply-orchestration.js`.

### Correction and verification evidence

Exact-head verification was performed against `88250a2ed54b99d836858ef77f90a107df93fc83`.

- Git comparison against authorized implementation baseline `e70e738a6a6480d1414cdd098b40b1b97b1e91e1`: 12 commits ahead, 0 behind, merge-base exactly the authorized baseline.
- The first verification head `21832bdf3789caf0ceebc3b619d4c557b203060b` exposed the IM-24 fixture blocker `unknown resource reference id: building:00000003`. The correction registered the existing Storehouse as the stable World reference anchor required by the frozen ResourceState reference contract; no frozen Resource authority was changed.
- The next verification head `b59545be5b5c58e531846b9f8a18c0798c8e4849` exposed the fixture blocker `construction transition cannot skip PENDING -> COMPLETED`. The correction changed only the IM-24 fixture to the frozen legal sequence `PENDING (0) -> IN_PROGRESS (0.5) -> COMPLETED (1)`; no frozen Construction authority was changed.
- Final IM-24 self-test result at the frozen head is **PASS / blockerCount 0**: blocked Runtime production connects once to IM-23, existing delivery settlement publishes stock and renewed readiness without production, composition rebinding reuses existing open supply, and IM-24 owns neither a production cycle nor scheduler.
- Exact-head **CI Baseline #5834**, GitHub Actions run `36344134767`, completed **SUCCESS** for exactly `88250a2ed54b99d836858ef77f90a107df93fc83`.
- Job **Clean Runtime + CR/IM Regression** completed **SUCCESS**, including the IM-24 self-test and frozen predecessor regression.
- Exact-head **Deploy Authoritative Development Testbuild to Pages #167**, GitHub Actions run `36344134766`, completed **SUCCESS** for the same frozen functional/product head.
- **0 functional blocker** remains for the authorized IM-24 scope.

### Freeze decision

IM-24 is therefore frozen at functional/product head `88250a2ed54b99d836858ef77f90a107df93fc83` with **PASS / 0 FUNCTIONAL BLOCKER**.

The frozen boundary remains: **IM-18 evaluates production readiness; IM-23 supplies missing input through existing logistics; IM-24 connects that supply path to the active Runtime Composition and preserves its continuity; IM-22 still produces only after separate admission of a concrete production cycle.**

No successor block, successor ID or additional capability is authorized by this freeze record.

## IM-24 definition record — 2026-09-27

**IM-24 – Active Runtime Production Supply Orchestration: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** frozen Post-IM-23 state `7c2e166f05ca9b862ec26413f93af678e907f8ce`.

### Reconciliation result

IM-18 already owns operational production recipe/readiness and authoritative production settlement, IM-22 owns the explicitly admitted one-shot Runtime/Scheduler production execution seam, and IM-23 owns the controlled bridge from `BLOCKED_INPUT + missingInputs` into existing Resource/BuildingStock/Transport logistics. The next proven system gap is not another Production, Logistics or SaveGame authority: these frozen capabilities are not yet orchestrated as one active-runtime production-supply continuity path. IM-23 currently remains a Domain integration, while active runtime composition and Continue recovery do not yet connect a real operational Production Building through `BLOCKED_INPUT` → supply logistics → delivered target BuildingStock → renewed IM-18E readiness evaluation.

### Binding IM-24 contract

- IM-24 orchestrates only existing frozen authorities. It must not introduce a second Production, Resource, BuildingStock, Logistics, Transport, Workforce, Scheduler or SaveGame authority.
- The starting point is a real operational Production Building in the active Runtime Composition with its existing IM-18 Workforce assignment, Production Recipe and authoritative BuildingStocks.
- IM-18E remains the sole production-readiness authority. Only a real `BLOCKED_INPUT + missingInputs` result may activate the existing IM-23 production-input path.
- IM-23 remains the Production Input Demand / Existing Logistics integration authority. IM-24 must not duplicate its demand identity, duplicate-suppression, bound-supply or matching semantics.
- Existing ResourceDemand/Claim/Matching/Assignment, BuildingStock transport reservation, Workforce, Transport, Delivery and settlement authorities remain unchanged and authoritative for their existing boundaries.
- Successful delivery must be reflected back into the same authoritative Runtime Composition through the existing target BuildingStock and associated existing Demand/Claim/Reservation/Transport state.
- After authoritative input delivery, IM-18E may be evaluated again from the updated Runtime state. The resulting state may be `READY` or remain `BLOCKED_INPUT`.
- `READY` is a readiness state only. IM-24 must not execute `InputConsumptionOutputSettlement`, admit a production settlement, or automatically create/install a replacement IM-22 production cycle.
- IM-22 remains the only Runtime execution seam for a separately identified and explicitly admitted production cycle.
- Runtime/Scheduler participation must be state/event-bound and idempotent. A Scheduler tick is neither new demand quantity nor production-cycle authorization.
- Repeated Runtime evaluation must reuse already-open/reserved IM-23 supply and must not duplicate demand, claims, BuildingStock reservations, Transport jobs or delivered effects.
- Existing IM-20 Save/Continue state already persists Production Recipes, BuildingStocks, ResourceDemands/Claims, BuildingStock transport reservations, Workforce/Transport state and production settlement fences. IM-24 must not introduce a new SaveGame schema or parallel continuity ledger.
- After Continue, existing open/reserved/in-flight production supply must be reused under the frozen recovery authorities. Restored state must not be interpreted as a new supply need and must not duplicate already-authoritative logistics or production effects.
- Existing IM-20 Transport recovery remains the recovery authority for persisted Transport execution. IM-24 may consume the restored/rebound state but must not replace that recovery contract.

### Required verification

A later implementation must prove at minimum:

- a real operational Production Building in active Runtime Composition can evaluate through IM-18E to `BLOCKED_INPUT`;
- that exact blocked state activates/reuses the existing IM-23 Production Input Demand path without parallel demand quantity;
- available supply proceeds through the existing Resource/Claim, BuildingStock reservation, Workforce/Transport and Delivery authorities;
- no available supply leaves the existing Production Input Demand waiting without fabricated stock or effects;
- successful authoritative delivery is published back into the same active Runtime Composition with updated target BuildingStock and existing logistics state;
- renewed IM-18E evaluation after sufficient delivery can produce `READY` from the updated authoritative state;
- reaching `READY` does not execute production, create a production settlement or automatically install/create an IM-22 cycle;
- repeated Runtime/Scheduler evaluation does not duplicate Demand/Claim/Reservation/Transport state;
- Save → Continue with an already-open, reserved or in-flight Production Input supply preserves/reuses that state without duplicate supply admission or production settlement;
- existing IM-20 exactly-once/recovery, IM-22 one-shot production and IM-23 demand/logistics boundaries remain unchanged.

### Explicit NON-SCOPE

IM-24 does **not** introduce automatic or recurring production cycles, production duration, cooldown, automatic IM-22 cycle creation, output distribution between Buildings, multi-Building production chains, warehouse/minimum-stock strategy, global logistics optimization, automatic Workforce reassignment, new Transport/routing/movement authority, new Resources/Buildings/Recipes, Gold/Housing/Population changes, new Player UI, Inspector expansion, SaveGame rearchitecture or legacy-main gameplay authority.

IM-24 is definition-only at this point. No implementation, implementation authorization or development branch is authorized by this record.

## IM-23 completion / evidence / freeze — 2026-09-27

**IM-23 – Production Input Demand / Existing Logistics Integration: COMPLETE / FROZEN / PASS / 0 FUNCTIONAL BLOCKER.**

**Frozen functional/product head:** `7df081dfbe03bdf55cd6ad9ae63a8504d21bb473`.

**Definition/documentation baseline:** `e09e1fe668ddc6ae535ef10a21cf21cb151f2116`.

### Frozen scope and authority result

- IM-23 implements only the defined bridge from an authoritative IM-18E `BLOCKED_INPUT + missingInputs` result into a controlled Production Input Demand and the already-existing Resource/BuildingStock/Transport logistics authorities.
- The implementation introduces `src/domain/production-input-existing-logistics-integration.js`; it does not modify the frozen IM-18/IM-20/IM-22, ResourceDemand/Claim/Matching/Assignment, BuildingStock, Workforce or Transport authorities.
- Missing production-input quantity is derived from the IM-18E result. IM-23 introduces no second recipe/readiness calculation and no parallel quantity ledger.
- An existing `OPEN`, `PARTIAL` or `RESERVED` IM-23 Production Input Demand for the same Building/resource need is reused. Existing ResourceDemand progress/Claims remain authoritative for reserved, fulfilled and remaining quantities.
- Existing ResourceMatching/ResourceAssignment, BuildingStock transport reservation and TransportJob authorities are reused. Construction-specific demand/logistics semantics remain unchanged and are not reinterpreted as production authority.
- No available matching resource leaves the Production Input Demand waiting without fabricating resources, stock, claims, reservations or transport jobs.
- IM-23 does not own production settlement, scheduler execution or runtime production admission. Successful supply/delivery does not authorize or create a replacement IM-22 production cycle.
- No runtime/main integration, automatic production loop, production duration/cooldown, recurring cycle, new logistics authority, SaveGame rearchitecture, Player UI or Inspector expansion is part of the frozen IM-23 scope.

### Verification evidence

Exact-head verification was performed against `7df081dfbe03bdf55cd6ad9ae63a8504d21bb473`.

- Git comparison against authorized implementation baseline `e09e1fe668ddc6ae535ef10a21cf21cb151f2116`: 5 commits ahead, 0 behind, merge-base exactly the authorized baseline.
- Effective implementation diff: only `.github/workflows/ci.yml`, `src/domain/production-input-existing-logistics-integration.js`, `src/dev/im-23-self-test.js`, and `src/dev/im-23-self-test.node.js`.
- IM-23 self-test verifies controlled demand admission, reuse without duplicate demand quantity, ACTIVE Claims as authoritative bound supply, CONSUMED Claims as fulfilled supply, waiting without available resource, reuse of BuildingStock reservation/TransportJob authorities, and absence of IM-23-owned production/runtime/settlement behavior.
- Exact-head **CI Baseline #5818**, GitHub Actions run `36340006995`, completed **SUCCESS** for exactly `7df081dfbe03bdf55cd6ad9ae63a8504d21bb473`.
- Job **Clean Runtime + CR/IM Regression** completed **SUCCESS**, including the IM-23 self-test and frozen predecessor regression.
- **0 functional blocker** remains for the authorized IM-23 scope.

### Separate deployment limitation

Exact-head **Deploy Authoritative Development Testbuild to Pages #149**, GitHub Actions run `36340006977`, completed **FAILURE** for exactly `7df081dfbe03bdf55cd6ad9ae63a8504d21bb473`.

This is recorded as **KNOWN DEPLOYMENT/PAGES FAILURE / NON-FUNCTIONAL / NON-BLOCKING FOR IM-23 FREEZE**. IM-23 adds no Player-facing runtime/main integration requiring browser/device evidence, and the exact-head functional CI/regression is successful. This Pages result is not reclassified as functional PASS and is not hidden by the freeze.

### Freeze decision

IM-23 is therefore frozen at functional/product head `7df081dfbe03bdf55cd6ad9ae63a8504d21bb473` with **PASS / 0 FUNCTIONAL BLOCKER**. The frozen boundary remains: **IM-23 supplies production input through existing logistics; IM-22 remains the separately admitted production execution authority.**

No successor block, successor ID or additional capability is authorized by this freeze record.

## IM-23 definition record — 2026-09-27

**IM-23 – Production Input Demand / Existing Logistics Integration: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** frozen Post-IM-22 state `c94400265be2c40f0576ecd2c616649e5e30cf85`.

### Reconciliation result

IM-22 closes the controlled Runtime/Scheduler execution seam for one already admissible IM-18 production cycle. The next proven system gap occurs when existing IM-18 production readiness returns `BLOCKED_INPUT`: the repository already contains general ResourceDemand/Matching/Assignment authorities plus BuildingStock transport reservation, Workforce-aware transport dispatch and delivered BuildingStock settlement, but there is no authoritative production-input bridge from the concrete missing recipe inputs into those existing logistics authorities. The existing construction-demand integration remains construction-specific and must not be reinterpreted as production authority.

### Binding IM-23 contract

- IM-23 closes only: existing IM-18 Production Recipe/readiness → `BLOCKED_INPUT + missingInputs` → controlled Production Input Demand → existing Resource/BuildingStock/Transport logistics → authoritative delivery into the target BuildingStock.
- Existing IM-18 production recipe and `OperationalProductionExecution.evaluate()` remain the sole authorities for required recipe inputs and `missingInputs`. IM-23 must not create a second recipe/readiness calculation.
- A Production Input Demand may be admitted only from a valid `BLOCKED_INPUT` result for an already operational production Building with its existing assigned Workforce and integrated recipe prerequisites.
- Production-input demand identity must be stable and deterministic for the concrete Building/resource/open-supply need. It must not derive from wall-clock time, render frames, device speed or nondeterministic randomness.
- Repeated Scheduler/runtime evaluation must not create parallel duplicate demands for the same still-open supply need. An existing `OPEN`, `PARTIAL` or `RESERVED` demand/claim/reservation state must be accounted for before admitting additional unmet quantity.
- The remaining production-input requirement is derived from the authoritative recipe/readiness result and existing target BuildingStock while accounting for supply already authoritatively bound to that open need. A later implementation-scope reconciliation must identify the exact existing Demand/Claim/Reservation source used for that bound quantity; IM-23 must not introduce a parallel quantity ledger.
- Existing `ResourceDemands` remains demand authority. Existing `ResourceMatching` and `ResourceAssignment` remain matching/claim authorities.
- Existing BuildingStock transport reservation/service remains stock-reservation authority. Existing Workforce/Transport contracts remain dispatch/movement authorities. Existing delivered-transport BuildingStock settlement remains the authoritative delivery seam.
- Construction-specific demand/logistics contracts remain frozen as construction authority. IM-23 may reuse their underlying general logistics authorities but must not relabel or bypass construction-specific semantics.
- If no matching available resource exists, the production-input need remains legitimately waiting/open. IM-23 must not manufacture resources, fabricate source BuildingStock, bypass reservations or make production READY without delivered input.
- Successful logistics settlement must place the delivered input in the target BuildingStock and close/release the corresponding existing Demand/Claim/Reservation/Transport state according to their frozen authorities.
- Successful input delivery does **not** authorize or execute another production settlement. A later production attempt remains a separately admitted IM-22-compliant production cycle.
- No second Production, ResourceDemand, BuildingStock, Logistics, Transport, Workforce or Scheduler authority is introduced.

### Required verification

A later implementation must prove at minimum:

- a valid IM-18 `BLOCKED_INPUT` state can project its concrete missing recipe resource/quantity into exactly one controlled Production Input Demand;
- repeated evaluation of the same still-open need does not create duplicate demand quantity;
- existing bound/reserved supply is accounted for before any additional demand quantity is admitted;
- available matching supply uses the existing Resource matching/claim, BuildingStock reservation and Transport authorities rather than a new logistics path;
- no available supply leaves the demand waiting without fabricating resources or mutating production stock;
- authoritative delivered-transport settlement adds the delivered resource to the target BuildingStock and preserves existing reservation/release invariants;
- after delivery IM-23 does not execute production or create a replacement IM-22 cycle;
- existing IM-20 Save/Continue and exactly-once/recovery boundaries are not weakened;
- construction-specific demand/logistics semantics remain unchanged.

### Explicit NON-SCOPE

IM-23 does **not** introduce automatic or recurring production cycles, production duration, cooldown, automatic retry after delivery, output distribution between Buildings, multi-Building production chains, automatic Workforce reassignment, new Transport/routing/movement authority, new Resources/Buildings/Recipes, production priorities, global logistics optimization, warehouse minimum-stock strategy, trade/market behavior, Gold/Housing/Population changes, new Player UI, SaveGame rearchitecture, Inspector expansion or legacy-main gameplay authority.

IM-23 is definition-only at this point. No implementation, implementation authorization or development branch is authorized by this record.

## IM-22 completion / evidence / freeze record — 2026-09-27

- **IM-22 – Runtime Economy Execution Integration: COMPLETE / FROZEN / PASS / 0 FUNCTIONAL BLOCKER.**
- Frozen functional/product head: `d7a4bd5453532c73347f1d772952511bc0f8e4a6`.
- Authorized definition/documentation baseline: `32ffa9ade9211575e71018d1aa3971ebf2ad92c7`.
- The implementation remains linear from that baseline: 5 commits ahead / 0 behind, merge base exactly `32ffa9ade9211575e71018d1aa3971ebf2ad92c7`.
- Exact implementation scope is limited to `src/runtime/runtime-economy-execution-integration.js`, the minimal `src/main.js` composition seam, `src/dev/im-22-self-test.js`, `src/dev/im-22-self-test.node.js`, and the CI invocation in `.github/workflows/ci.yml`.
- The existing Runtime/Scheduler remains authoritative. IM-22 registers exactly one explicit production cycle in the existing `economy` phase; a scheduler fixed step is not a production-duration or recurring-production authority.
- Each admitted cycle uses a stable deterministic settlement identity `production-settlement:im22:<buildingId>:<cycleId>`; no wall-clock, render-frame, device-speed or random identity is introduced.
- The one-shot registration unregisters on its first execution. `BLOCKED_INPUT` performs no mutation and cannot self-activate on later scheduler ticks. An already fenced settlement returns `ALREADY_SETTLED` without a second mutation.
- Existing IM-18 readiness and settlement authorities remain intact: `OperationalProductionExecution.evaluate()` owns READY/BLOCKED_INPUT and `InputConsumptionOutputSettlement.settleOnce()` owns authoritative input/output settlement.
- Successful settlement returns updated `buildingStocks`, `productionSettlementIds` and the matching `productionEffectReceipts` together through the existing active-runtime-composition publication seam. No parallel economy store or UI-owned production truth exists.
- The IM-22 self-test proves READY settlement exactly once, repeated scheduler-step no-op after completion, BLOCKED_INPUT no mutation/no later self-activation, duplicate settlement-fence rejection, and receipt/fence identity for the same logical production effect.
- **Exact-head CI evidence:** CI Baseline run **#5809 / run 36336355889** for exact head `d7a4bd5453532c73347f1d772952511bc0f8e4a6` completed **SUCCESS**; job `Clean Runtime + CR/IM Regression` completed successfully including the IM-22 self-test.
- **Separate deployment evidence:** Pages run **#139 / run 36336355955** for the same exact head completed **FAILURE**. This is recorded as a **KNOWN DEPLOYMENT/PAGES FAILURE / NON-FUNCTIONAL / NON-BLOCKING FOR IM-22 FREEZE**. It is not represented as successful deployment evidence and does not override the successful Exact-Head CI/regression result.
- User-supplied GitHub Actions screenshot evidence on 2026-09-27 independently shows CI Baseline #5809 green and the Pages #139 run red, consistent with the repository evidence above.
- No automatic Workforce assignment, ResourceDemand/Claim generation, input procurement, transport dispatch, production timing/cooldown, recurring production cycles, multi-building production chain, new Player UI, SaveGame rearchitecture or second Runtime/Scheduler/Economy authority was introduced.
- **IM-22 Completion / Evidence / Freeze Gate: PASS / 0 FUNCTIONAL BLOCKER / FROZEN.**
- This freeze authorizes no successor capability and no further product change.

## IM-22 definition record — 2026-09-27

**IM-22 – Runtime Economy Execution Integration: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** frozen Post-IM-21 product/runtime state. The frozen product/runtime baseline remains IM-21F product/test head `d635eeab42b62238c9b77184dfa5b599cbe6029e`; IM-21G introduced no product, CSS, Runtime, gameplay, SaveGame or authority change.

### Reconciliation result

The frozen IM-18 chain already owns operational Building admission, Workforce eligibility/assignment, existing production-recipe integration, production readiness and authoritative input-consumption/output settlement. The existing Runtime Scheduler already owns an `economy` phase, but the active runtime composition does not install a general economy-production system. The first missing gameplay connection is therefore the controlled Runtime/Scheduler execution seam between an already admissible IM-18 production state and one real authoritative production settlement.

### Binding IM-22 contract

- IM-22 introduces the minimal Runtime/Scheduler integration for exactly one already admissible IM-18 production cycle.
- The existing Runtime and Scheduler remain sole runtime/scheduling authorities. IM-22 registers/uses only the existing `economy` phase and creates no second scheduler or economy clock.
- The Scheduler tick is an execution boundary, **not** a production-duration definition and **not** permission to produce once per fixed step.
- IM-22 consumes existing authoritative prerequisites only: an operational Building, an existing `ASSIGNED` Workforce relationship, an existing production BuildingStock recipe and current authoritative BuildingStocks.
- Existing `OperationalProductionExecution.evaluate()` remains the readiness authority. `BLOCKED_INPUT` causes **NO MUTATION**. `READY` may admit exactly one identified production cycle.
- Existing `InputConsumptionOutputSettlement.settleOnce()` remains the authoritative input-consumption/output-settlement seam. IM-22 must not duplicate or bypass it.
- Every admitted production cycle requires a stable deterministic `settlementId`. The ID must identify the concrete production cycle and must not derive from wall-clock time, render frames, device speed or nondeterministic randomness.
- Repeated Scheduler steps must not reapply the same cycle. An already recorded production settlement ID means no second BuildingStock mutation for that cycle.
- BuildingStock mutation and its production-settlement fence remain one logical effect. IM-22 must preserve the frozen IM-20F exactly-once/recovery boundary and must not create a replay path that can duplicate production.
- After successful settlement, the resulting BuildingStocks and production settlement/effect evidence are returned to the existing authoritative runtime composition. No parallel Runtime-Economy store or UI-owned production truth is introduced.
- Missing operational admission, Workforce assignment, recipe or required input stock fails closed. IM-22 does not manufacture, repair or auto-create those prerequisites.
- IM-22 closes only the first proven runtime-economy gap: existing IM-18 Production authority → running Runtime Scheduler → one authoritative exactly-once production effect.

### Required verification

A later implementation must prove at minimum:

- an eligible `READY` production state can be executed through the existing Scheduler `economy` phase;
- exactly one admitted cycle consumes the frozen recipe inputs and adds its outputs through IM-18F;
- the same cycle/settlement ID cannot mutate BuildingStocks twice across repeated Scheduler steps;
- `BLOCKED_INPUT` produces no BuildingStock or settlement-fence mutation;
- missing/invalid prerequisites fail closed rather than creating replacement authority;
- authoritative runtime composition receives the settled BuildingStocks and production settlement/effect evidence;
- existing Save/Continue and IM-20F exactly-once/recovery semantics are not weakened;
- no transport, automatic demand, automatic Workforce assignment or production-timing capability is introduced.

### Explicit non-scope

No automatic Workforce assignment; no ResourceDemand/Claim generation; no automatic input procurement; no BuildingStock transport reservation; no Carrier/Transport dispatch; no output distribution between Buildings; no production duration, cooldown or recurring production-cycle generation; no multi-Building production chain; no new Resource, Building or Recipe content; no Gold/Housing/Population mechanic change; no new Player UI; no SaveGame rearchitecture; no Inspector expansion; no second Runtime/Scheduler/Economy authority; and no legacy-main gameplay authority.

### Current gate

**IM-22 – Runtime Economy Execution Integration: DEFINED / NOT IMPLEMENTED.**

This definition authorizes no development branch and no implementation. The next permissible step is exclusively a separate **IM-22 Definition Documentation Verification / Scope Gate** against the frozen Post-IM-21 baseline.


## IM-21G completion / evidence / freeze record — 2026-09-27

- **IM-21G – Device-Matrix Completion: COMPLETE / FROZEN / PASS / 0 FUNCTIONAL BLOCKER.**
- Frozen product/runtime baseline remains IM-21F product/test head `d635eeab42b62238c9b77184dfa5b599cbe6029e`. IM-21G introduced no product, CSS, Runtime, gameplay, SaveGame or authority change.
- Authorized IM-21G definition/documentation head: `2f6f2275a33c0532c83047b50148b316525b6b8b`.
- The Definition Documentation Verification / Scope Gate passed: the IM-21G definition is identical in `docs/DEVELOPMENT_WORKFLOW_CURRENT.md` and `docs/ROADMAP_CURRENT.md`; the definition delta from frozen IM-21F documentation head `350cac77ee150fe69bed7179e2d57f0ef71a6f9f` is exactly two documentation-only commits, 2 ahead / 0 behind, with merge base exactly `350cac77ee150fe69bed7179e2d57f0ef71a6f9f`, and only those two documents changed.
- Matrix execution used the devices currently available as the binding development reference matrix. The whole frozen IM-21A–F Player flow was exercised coherently: Start/New Game → HUD/world → Selection/Context → Build Catalog/Placement → Work Area → Settlement Overview → System Menu/Help/Save → real browser reload → Continue, together with ordinary world interaction and reachability of the primary Player controls.
- **iPhone portrait: PASS / 0 functional blocker.**
- **iPhone landscape: PASS / 0 functional blocker.**
- **iPad portrait: PASS / 0 functional blocker.**
- **iPad landscape: PASS / 0 functional blocker.**
- Real-device evidence confirms New Game, HUD/world operation, Selection/Context, Build/Placement, Work Area, Settlement Overview, System Menu/Help, Save and real reload → Continue remain operable on the available iPhone/iPad reference matrix.
- The observed iPhone issues are presentation/visual-polish follow-ups only; no reported issue hid or blocked the tested Player flow. They are non-blocking for IM-21G and are not corrected inside this freeze.
- Fullscreen remains the already-defined optional presentation capability. Its current unavailability/restriction on the tested iPhone/iPad Safari environment is a **KNOWN PLATFORM/PRESENTATION LIMITATION / NON-BLOCKING** and does not weaken ordinary Player operability.
- Desktop/MacBook real-device testing was not available during this gate and is **NOT CLAIMED AS TESTED**. Android devices, other tablets, desktop operating systems, browsers and wider hardware combinations are likewise not claimed as tested.
- For the present development stage, those unavailable platform combinations are explicitly **DEFERRED CROSS-DEVICE / CROSS-BROWSER REGRESSION**, not a discovered product blocker. The available iPhone/iPad reference matrix is sufficient to close IM-21G so development can return to the game; broader platform testing is to be revisited when the game is functionally and visually mature enough for wider/external testing.
- This completion decision does not assert that iPad is technically identical to Desktop/Wide and does not manufacture Desktop PASS evidence. It records the deliberate scope decision that physical coverage of every platform is not a prerequisite for the current development freeze.
- No matrix correction was required; therefore no IM-21G CSS/product fix scope was opened and no frozen IM-21A–F authority was changed.
- Historical background-image/wood-frame work and other visual polishing remain outside IM-21G.
- **IM-21G Completion / Evidence / Freeze Gate: PASS / 0 FUNCTIONAL BLOCKER / FROZEN.** No successor block or further product change is authorized by this freeze.

## IM-21G definition record — 2026-09-27

**IM-21G – Device-Matrix Completion: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** frozen IM-21F. Verified IM-21F product/test head: `d635eeab42b62238c9b77184dfa5b599cbe6029e`; IM-21F completion/evidence/freeze documentation head: `350cac77ee150fe69bed7179e2d57f0ef71a6f9f`.

### Reconciliation result

IM-21A–F already establish iPhone/smartphone as the binding minimum/reference platform and provide substantial real-device evidence in portrait and landscape. IM-21B, IM-21C and IM-21E explicitly carry iPhone portrait + landscape evidence; IM-21F adds real Start/System-Menu, Save → real reload → Continue and first-tap New Game evidence. IM-21C additionally contains real iPad landscape PASS evidence.

The remaining capability gap is therefore not a new Player feature or new gameplay authority. It is completion of one coherent device/view matrix for the now-frozen IM-21A–F Player stack, especially the still-open iPad/tablet portrait coverage and Desktop/Wide coverage.

### Binding IM-21G contract

- IM-21G is a **device-matrix / responsive regression completion block**, not a new UI feature block.
- The frozen IM-21A–F Player behavior and all underlying Runtime, Selection, Placement/Construction, Work Area, Economy and SaveGame authorities remain unchanged.
- The matrix verifies the existing Player flow as one integrated stack: Shell/HUD → Selection/Context → Build Catalog/Placement → Work Area → Settlement Overview → System Menu → Save/Reload/Continue.
- Verification covers visibility, reachability/operability, responsive presentation, primary-working-surface arbitration and hidden-surface pointer/touch isolation.
- iPhone/smartphone remains the minimum/reference layout. Existing portrait and landscape evidence is reusable but the final matrix must perform a coherent whole-stack regression against the frozen IM-21F line.
- iPad/tablet requires coherent matrix completion. Existing IM-21C iPad-landscape evidence is reusable; tablet portrait remains an explicit open evidence case.
- Desktop/Wide requires a coherent wide-layout regression. A separate artificial Desktop “portrait” class is not required.
- Device-specific browser capabilities that are already explicitly optional by frozen contract, especially fullscreen restrictions on iOS/Safari, remain non-blocking unless they make the ordinary Player flow unusable.
- If matrix execution reveals a genuine device/responsive blocker, any correction requires a separate minimal IM-21G presentation/responsive fix scope and subsequent exact-head regression. The matrix does not authorize broad CSS cleanup or opportunistic redesign.
- No previously frozen gameplay/domain contract may be weakened merely to satisfy a viewport.

### Minimum completion matrix

| Target class | Portrait | Landscape / Wide |
| --- | --- | --- |
| iPhone / smartphone | whole-stack regression; substantial prior evidence exists | whole-stack regression; substantial prior evidence exists |
| iPad / tablet | **open matrix evidence** | whole-stack regression; IM-21C partial evidence exists |
| Desktop / Wide | not a separate required portrait class | **open matrix evidence** |

### Verification requirements

IM-21G completion must prove at minimum:

- the frozen IM-21A–F Player stack remains reachable and operable across the required matrix;
- HUD and primary controls remain visible/reachable without requiring browser zoom;
- Context, Build Catalog/Placement, Work Area, Settlement Overview and System Menu remain mutually deterministic as primary working surfaces;
- hidden Player surfaces do not intercept pointer/touch input;
- world pan/zoom and existing touch/pointer ownership remain intact where not owned by an active Player control;
- Save → real reload → Continue remains operable in the matrix cases where browser persistence is exercised;
- no matrix correction introduces a second gameplay, Runtime, Selection, Placement, Work Area, Economy or SaveGame authority;
- any device-specific limitation is recorded explicitly as PASS, BLOCKER or known non-blocking platform limitation rather than silently normalized.

### Explicit non-scope

No new gameplay capability; no new Building/content; no SaveGame schema/restore change; no new Runtime/Selection/Camera/Placement/Construction/Work-Area/Economy authority; no general visual redesign; no broad CSS cleanup; no historical background-image/wood-frame integration; no cosmetic polishing merely because a larger viewport permits it; and no successor block beyond IM-21G.

### Current gate

**IM-21G Reconciliation / Definition: PASS / EXISTING DEVICE EVIDENCE RECONCILED / MATRIX GAP IDENTIFIED / DEFINED / NOT IMPLEMENTED.**

This documentation authorizes no matrix execution, no CSS/product change and no successor beyond IM-21G. The next permissible step is exclusively a separate **IM-21G Definition Documentation Verification / Scope Gate** against frozen IM-21F.


## IM-21F completion / evidence / freeze record — 2026-09-27

- **IM-21F – System Menu / Save / Help / Guidance Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER.**
- Frozen predecessor: IM-21E. Verified IM-21E product/test head: `e1d7455de4bd1f3f291e36080fbd4a7efd146e49`; IM-21E completion/evidence/freeze documentation head: `2dc58f7015b39b8be0589c4baa1d0259ed9b474f`.
- Authorized IM-21F definition/documentation baseline: `6d41d903fec8b80ce05c4cb0a0819cd627c5be69`.
- Verified IM-21F product/test head: `d635eeab42b62238c9b77184dfa5b599cbe6029e`.
- The verified implementation is exactly **17 commits ahead / 0 behind** the authorized IM-21F definition baseline, with merge base exactly `6d41d903fec8b80ce05c4cb0a0819cd627c5be69`. The complete implementation scope is limited to `.github/workflows/ci.yml`, `index.html`, `src/dev/im-21a-self-test.node.js`, new `src/dev/im-21f-self-test.js`, new `src/dev/im-21f-self-test.node.js`, `src/main.js`, new `src/runtime/player-new-game-lifecycle.js`, `src/savegame/post-im13-browser-save-continue-lifecycle.js`, `src/ui/app.css`, and new `src/ui/player-system-menu-integration.js`.
- IM-21F provides one responsive Player-facing Start/System-Menu family. Pause/Resume delegates only to the existing Runtime authority; Save and Continue delegate only to the existing frozen browser Save/Continue lifecycle. No second Runtime, Pause, SaveGame, restore or gameplay authority was introduced.
- Persisted-save availability is fail-closed through the existing browser storage adapter and existing restore preparation/validation path. The storage key remains `neue-siedler.savegame.im20e.v2`; IM-21F introduces no new SaveGame schema, slot system or storage-clearing behavior.
- New Game is owned by the minimal `PlayerNewGameLifecycle`. It creates/publishes a fresh authoritative baseline composition and uses the existing Runtime to start it. Its final verified admission contract permits the legitimate startable states `READY` and `PAUSED`, rejects non-startable states, and does **not** delete or mutate an existing persisted save.
- Help/Guidance remains presentation-only and mutation-free. Fullscreen remains an optional presentation capability with safe fallback; platform restriction or unavailability, including iOS/Safari behavior, is explicitly non-blocking.
- System-Menu presentation owns no gameplay truth. Context, Build/Placement, Work Area and Settlement Overview are handled through their existing optional arbitration boundaries; hidden menu surfaces are touch/pointer isolated.
- During real-device verification, the first blocker was **persisted Continue remaining unavailable after a real reload**. Diagnosis identified that IM-21F installation incorrectly required later Player-surface integrations before creating the Start/System Menu, so `availability()` could fail to run after reload. The minimal fix at `cb9487d9d6bd70e5e618d7abbdea7bb461de4ce4` reduced installation prerequisites to the actual Runtime/New-Game/Save lifecycle and menu-surface dependencies; later Player integrations remain optional arbitration hooks. No Storage, SaveGame or Runtime authority changed.
- Real iPhone verification after that fix confirms **Save → real browser reload → Continue becomes available → Continue restores the saved world state: PASS**.
- A second real-device blocker was **New Game requiring a second tap from an existing/paused session**. Diagnosis identified the New-Game lifecycle's former `READY`-only admission as incompatible with the legitimate `PAUSED` state used by the System Menu. The final fix at `d635eeab42b62238c9b77184dfa5b599cbe6029e` permits `READY` or `PAUSED`, while preserving the existing Runtime as sole state authority and preserving the existing save. The IM-21F self-test now covers `PAUSED → New Game → RUNNING`, camera/selection reset and unchanged persisted storage.
- Real iPhone verification against the final TESTBUILD confirms **New Game starts on the first tap: PASS**. Earlier real-device checks also confirmed Start screen visibility/operability, Pause/System Menu opening, Resume, Save and Help behavior. Fullscreen unavailability/restriction on iPhone/Safari is non-blocking by contract.
- Exact-head CI evidence for final head `d635eeab42b62238c9b77184dfa5b599cbe6029e`: the user-confirmed Exact-Head CI run completed fully green before the final TESTBUILD/device verification. The connected GitHub combined-status endpoint exposes no status-context records for this manually/push-triggered Actions run, so no run number is invented here.
- The IM-21A regression-test compatibility adjustments are test-only reconciliation for the intentionally changed IM-21F initial READY state and Player-facing pause delegation location; they do not alter frozen IM-21A product authority.
- Visual reuse of the historical background image / wooden frame is **not** part of this functional freeze and remains a possible later presentation follow-up. No legacy-main menu authority is promoted.
- Explicitly not introduced: new SaveGame schema/restore semantics, multi-slot or cloud save, autosave, new scheduler/pause authority, gameplay settings, tutorial/quest progression, Inspector/system-graph expansion, legacy-main menu authority, or IM-21G device-matrix completion.
- **IM-21F Completion / Evidence / Freeze Gate: PASS / 0 BLOCKER / FROZEN.** No further IM-21F product change is authorized by this freeze.

This completion record supersedes the earlier IM-21F `DEFINED / NOT IMPLEMENTED` status text below; the definition record remains as the historical binding contract.


## IM-21F definition record — 2026-09-26

**IM-21F – System Menu / Save / Help / Guidance Integration: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** frozen IM-21E. Verified IM-21E product/test head: `e1d7455de4bd1f3f291e36080fbd4a7efd146e49`; IM-21E completion/evidence/freeze documentation head: `2dc58f7015b39b8be0589c4baa1d0259ed9b474f`.

### Reconciliation result

The modular runtime already owns the system authorities IM-21F needs to expose. Runtime pause/resume is authoritative through the existing Runtime state machine. Browser Save → Reload → Continue is authoritative through the frozen IM-20 lifecycle, including completed-step capture, V2 validation/restore, derived-state rebinding, atomic runtime activation/scheduler installation and exactly-once recovery reconciliation. The temporary `Test-Speichern` / `Test-Weiter` controls remain verification-only access and are not Player UX.

The repository also contains the historical legacy `ui/ui-start.js`, `ui/ui-state.js` and `ui/css/ui-start.css` menu family with Start, Continue, Reset, Fullscreen and pause-panel behavior. Those files are behavioral/reference material only and must not be promoted into modular authority or reused as a second runtime/save system.

IM-21F therefore does **not** create new Pause, SaveGame or Continue semantics. It integrates the frozen authorities into one responsive Player-facing Start/System-Menu family and adds the missing Help/Guidance and deliberate fullscreen/standalone presentation entry.

### Binding IM-21F contract

- Start screen and in-game Pause/System Menu form one coherent Player menu family, while exposing only actions valid for the current runtime/save state.
- Pause/Resume delegates exclusively to the existing modular Runtime authority. Player UI owns no second paused/running truth.
- Save delegates exclusively to the frozen browser Save lifecycle and its completed-step capture boundary. IM-21F introduces no second SaveGame owner or schema.
- Continue delegates exclusively to the frozen validation → restore → rebind → recovery → atomic activation lifecycle. The menu must not bypass, partially reproduce or weaken that path.
- Technical IM-20/IM-21D verification controls are not the final Player surface and may be replaced/hidden by the regular menu access without changing their underlying authority.
- Continue availability must be derived from legitimate persisted-save capability/state and must fail closed when no valid continuation is available. UI must not invent a successful save or continuation state.
- New Game/start behavior must enter the current modular runtime through an existing legitimate reset/start boundary. Legacy `localStorage.clear()` behavior is not authority and must not be copied as a generic reset mechanism. If the current modular line lacks a sufficient New Game/reset boundary, that is an implementation-scope prerequisite to reconcile rather than permission to invent one in presentation code.
- Help/Guidance is Player-facing explanatory/navigation presentation only in V1. It owns no gameplay mutation authority and does not expand into quests, tutorial progression or Inspector/system diagnostics.
- Fullscreen/standalone entry is a presentation capability only. Failure or platform restriction, especially on iOS/Safari, must degrade safely; fullscreen must never be required for gameplay.
- The System Menu is an exclusive Player working surface. It must arbitrate deterministically against Context, Build Catalog/Placement, Work Area and Settlement Overview; hidden menu surfaces must not intercept pointer/touch input.
- Save/Continue feedback must reflect actual lifecycle results and failure states rather than optimistic UI state.
- iPhone remains the minimum/reference layout; no hover, right-click, keyboard or browser zoom may be required.

### Identified IM-21F capability gap

The missing capability is primarily Player UX/integration, not a new system authority:

1. one responsive Start + Pause/System-Menu family;
2. regular Player access to the existing Pause/Resume and Save/Continue authorities;
3. state-derived action availability and lifecycle feedback;
4. compact Help/Guidance presentation;
5. deliberate fullscreen/standalone entry with safe fallback;
6. deterministic arbitration with the already frozen IM-21 working surfaces.

A later Implementation Scope Reconciliation must determine whether the current modular runtime exposes a sufficient controlled New Game/reset and persisted-save-availability boundary. Any missing boundary must be added minimally at its proper owner; legacy-main behavior must not be promoted to authority.

### Verification requirements for later implementation

Later IM-21F implementation must prove at minimum:

- Start and Pause/System states use the same coherent menu family without creating a second runtime state;
- Pause and Resume pass only through the existing Runtime authority;
- Save passes only through the frozen completed-step browser lifecycle;
- real page reload → Continue passes through the complete frozen restore/rebind/recovery/activation chain;
- no-save/invalid-save and lifecycle failure states fail closed and are represented truthfully;
- New Game/reset does not use legacy broad storage clearing or bypass modular ownership;
- Help/Guidance is presentation-only and mutation-free;
- fullscreen/standalone entry degrades safely where unsupported;
- menu arbitration against Context, Build/Placement, Work Area and Settlement Overview is deterministic;
- hidden menu UI does not intercept world input;
- no legacy-main menu, SaveGame or Pause system becomes modular authority;
- real-device verification covers at least iPhone portrait + landscape; the complete device matrix remains IM-21G.

### Explicit non-scope

No new SaveGame schema or restore semantics; no multi-slot Save UI; no autosave/cloud save; no new scheduler/pause authority; no gameplay-settings system; no tutorial/quest progression; no Inspector/system-graph expansion; no legacy-main menu authority; no IM-21G device-matrix completion.

### Current gate

**IM-21F Reconciliation / Definition: PASS / EXISTING SYSTEM AUTHORITIES IDENTIFIED / PLAYER-UX GAP IDENTIFIED / DEFINED / NOT IMPLEMENTED.**

This documentation authorizes no IM-21F implementation and no IM-21G work. The next permissible step is exclusively a separate **IM-21F Definition Documentation Verification / Scope Gate** against frozen IM-21E.

## IM-21E completion / evidence / freeze record — 2026-09-26

- **IM-21E – Economy / Settlement Overview: COMPLETE / FROZEN / PASS / 0 BLOCKER.**
- Frozen predecessor: IM-21D. Verified IM-21D product/test head: `f2c33f3e59c8551b003a57c818109ad91ba3999c`; IM-21D completion/evidence/freeze documentation head: `3a749f040cac29de7b594de7a01042df6c970bf6`.
- Verified IM-21E product/test head: `e1d7455de4bd1f3f291e36080fbd4a7efd146e49`.
- The verified implementation is exactly 5 commits ahead / 0 behind the authorized IM-21E documentation baseline `82fc323a540a6ce3c8b740867723906717dc063a`, with that exact merge base. Scope is limited to `index.html`, new `src/ui/player-economy-settlement-overview-integration.js`, `src/ui/app.css`, new `src/dev/im-21e-self-test.node.js`, and `.github/workflows/ci.yml`.
- The responsive Player settlement overview reuses the existing authoritative Population/Housing/Gold read model. Population, Housing occupancy/capacity/available slots/status and non-physical Gold remain read-only; no Population, Housing, Gold or Economy mutation authority was introduced and no second settlement truth is persisted.
- Working-surface arbitration reuses the frozen IM-21C external-surface boundary. Active Placement and active Work Area fail closed against opening the overview; Selection/Context is cleared through the existing presentation boundary; hidden overview UI is touch/pointer isolated. Closing the overview restores normal world interaction.
- Exact-head evidence for `e1d7455d…`: **CI Baseline #5770 SUCCESS**, including `Run IM-21E verification + frozen predecessor regression` SUCCESS; **Deploy Authoritative Development Testbuild to Pages #125 SUCCESS**; **pages build and deployment #7598 SUCCESS**.
- Real iPhone/iOS Safari evidence verifies the settlement overview in **portrait and landscape**. Both orientations show the same authoritative state: Population 3, Housing 3/3 / FULL (`Belegt`), available slots 0 and Gold 3. Portrait uses the compact 2×2 presentation; landscape uses the four-column presentation.
- Real-device interaction verification additionally confirms opening/closing the overview, restored world operability after closing, and deterministic arbitration against Build/Placement and Work Area.
- Save/Continue semantics remain the frozen existing lifecycle: the overview reads the current runtime projection when opened and owns no persisted presentation truth. No SaveGame contract was changed.
- Known future UX follow-up: iOS Safari browser chrome consumes substantial landscape space; a later Start/System-Menu UX may provide a deliberate fullscreen/standalone entry path. This is outside IM-21E and is non-blocking for this freeze.
- Explicitly not introduced: Production, Resource, Workforce or Transport redesign; new Gold mechanics; Building Stock redesign; Inspector/system graph expansion; new SaveGame semantics; IM-21F System Menu / Save / Help / Guidance; IM-21G device-matrix completion; or legacy-main Economy/UI authority.
- **IM-21E Completion / Evidence / Freeze Gate: PASS / 0 BLOCKER / FROZEN.** No further IM-21E product change is authorized by this freeze.

This completion record supersedes the earlier IM-21E `DEFINED / NOT IMPLEMENTED` status text below; the definition record remains as the historical binding contract.

## IM-21E definition record — 2026-09-26

**IM-21E – Economy / Settlement Overview: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** frozen IM-21D. Verified IM-21D product/test head: `f2c33f3e59c8551b003a57c818109ad91ba3999c`; IM-21D completion/evidence/freeze documentation head: `3a749f040cac29de7b594de7a01042df6c970bf6`.

### Reconciliation result

The modular runtime already provides a controlled Player read-model foundation for the core settlement overview. In particular, `player-population-housing-gold-projection.js` projects existing authoritative Population, Housing and Gold state without owning mutation authority, and `main.js` already derives and renders that projection from the active runtime composition and rebuilds it after Continue.

IM-21E therefore does **not** create a new economy simulation or a second settlement truth. It integrates the existing read model into a responsive Player-facing Economy / Settlement Overview.

### Binding IM-21E contract

- **Population** is read-only and comes from the existing authoritative population projection.
- **Housing** is read-only and exposes the existing aggregate occupancy/capacity, available slots and existing `AVAILABLE` / `FULL` / `NO_HOUSING` status semantics.
- **Gold** is read-only and reflects the current non-physical Gold state owned by the existing `GoldEconomyOwner`.
- The Player overview owns no Population, Housing, Gold or Economy mutation authority and must not invent missing values.
- Existing invariants remain binding, including Population/Housing occupancy consistency and aggregate Housing capacity consistency.
- The existing technical `Siedlung · Bevölkerung … · Wohnen …/… · Gold …` projection is a reusable read-model/output foundation, not the final responsive Player UX.
- IM-21E may replace/integrate that technical presentation with a compact Player-facing settlement overview while the world remains the primary gameplay surface.
- Any expanded overview is a Player working surface and must arbitrate deterministically against Context, Build Catalog / Placement and Work Area. Hidden overview UI must not intercept pointer/touch input.
- After Save → Reload → Continue, the overview must be rebuilt from the restored authoritative runtime state rather than persisting a second UI truth.
- iPhone remains the minimum/reference layout; the overview must require no hover, right-click, keyboard or browser zoom.

### Existing broader economy data boundary

The runtime also contains Resources, Workforce requirements/assignments, Building Stocks, Transport state, Production state and related economy evidence. Reconciliation did **not** identify an equivalent consolidated Player Overview contract for those areas.

IM-21E must therefore not silently expand into a new Economy/Inspector system merely because those lower-level data structures exist. Population/Housing/Gold is the defined V1 overview boundary. Any broader Player economy aggregation requires a later separately reconciled contract.

### Verification requirements for later implementation

Later IM-21E implementation must prove at minimum:

- displayed Population derives from the existing authoritative Population projection;
- displayed Housing occupancy/capacity/available slots and status derive from existing Housing state;
- Population and Housing occupancy remain consistent under the existing invariant;
- displayed Gold equals the current authoritative `GoldEconomyOwner` state and remains non-physical;
- opening/closing the overview is presentation-only and mutation-free;
- overview working-surface arbitration against Context, Build/Placement and Work Area is deterministic;
- hidden overview UI does not intercept world input;
- Save → Reload → Continue rebuilds the overview from restored authoritative state;
- no Player UI path gains Population, Housing, Gold or Economy mutation authority;
- real-device verification covers at least iPhone portrait + landscape; the complete device matrix remains IM-21G.

### Explicit non-scope

No new Production, Resource, Workforce, Transport or Gold mechanics; no new Economy mutation; no Building Stock redesign; no new Building content; no Inspector/system graph expansion; no new SaveGame semantics; no IM-21F System Menu / Save / Help / Guidance; no IM-21G device-matrix completion; and no legacy-main Economy/UI promoted to authority.

### Current gate

**IM-21E Reconciliation / Definition: PASS / EXISTING PLAYER READ MODEL IDENTIFIED / DEFINED / NOT IMPLEMENTED.**

This documentation authorizes no IM-21E implementation and no IM-21F work. The next permissible step is exclusively a separate **IM-21E Definition Documentation Verification / Scope Gate** against frozen IM-21D.

## IM-21D completion / evidence / freeze record — 2026-09-26

- **IM-21D – Work Area Player UX Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER.**
- Frozen predecessor baseline: IM-21C @ `00212904f5019d966cac76623d9e487e1f0dc0d0`.
- Verified product/test head: `f2c33f3e59c8551b003a57c818109ad91ba3999c`.
- The complete IM-21D line is ahead-only / 0 behind against frozen IM-21C. The implementation adds the modular Building-bound Work Area authority, Player projection/editing surface, deterministic Context/Build/Placement arbitration, required regression coverage, and only the separately reconciled corrections/verification access needed to prove the contract.
- Work Area authority is keyed by stable `buildingId`; unsupported Buildings fail closed; transient drag/editor state remains presentation-only; Confirm commits through the modular authority and Cancel/reject remains mutation-free. No legacy-main Work Area or production system was promoted to authority.
- The real runtime `MapStructure`/bounds mismatch discovered during device verification was corrected at the existing IM-21D UI boundary by projecting `active.map.dimensions()` into `BuildingWorkAreaAuthority`; no MapStructure, runtime-composition or Work Area authority contract was weakened.
- Exact-head implementation verification for `f2c33f3e…`: **CI Baseline #5761 SUCCESS; Deploy Authoritative Development Testbuild to Pages #116 SUCCESS; pages build and deployment #7589 SUCCESS**. Scope verification for the final verification-access increment is exactly `index.html` plus `src/main.js`, reusing the frozen IM-20 Save/Continue lifecycle without new SaveGame semantics.
- Real iPhone/iOS Safari evidence confirms eligible WOODCUTTER Work Area action visibility, entry, visible valid-area projection, touch dragging, Confirm, same-session reselection persistence, and the required **Work Area → Save → real page reload → Continue → reselect → same authoritative Work Area position** lifecycle. The restored save also retained the user's additionally placed building, providing supplementary Save/Continue regression evidence.
- The temporary `Test-Speichern` / `Test-Weiter` controls are explicitly **VERIFICATION ONLY** technical access to the existing IM-20 lifecycle. They are not the final Player Save/System Menu and do not authorize IM-21F.
- Known responsive presentation refinement: on narrow iPhone layouts the separate Work Area confirmation panel can visually compete with the existing context panel. This is non-blocking for the verified IM-21D functional contract and may be reconsidered in later responsive/System-Menu UX work.
- Explicitly not introduced: IM-21E Economy / Settlement Overview, IM-21F System Menu / Save / Help / Guidance, IM-21G device-matrix completion, production/workforce/resource redesign, new Selection/Camera authority, multi-slot Save UI, or legacy-main authority.
- **IM-21D Completion / Evidence / Freeze Gate: PASS / 0 BLOCKER / FROZEN.** No further IM-21D product change is authorized by this freeze.

This completion record supersedes the earlier IM-21D `DEFINED / NOT IMPLEMENTED` status text below; the definition record remains as the historical binding contract.

## IM-21D definition record — 2026-09-24

**IM-21D – Work Area Player UX Integration: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** frozen IM-21C @ `00212904f5019d966cac76623d9e487e1f0dc0d0`.

### Reconciliation result

The frozen modular line through IM-21C provides responsive Player shell/HUD, Selection/Context and Build/Placement integration, but no current authoritative modular Work Area gameplay contract was identified that IM-21D could merely expose through Player UX.

The repository contains historical legacy-main Work Area implementation and data. Those legacy mechanisms are reference material only. IM-21D must not promote legacy `GameWorkArea`, `core/game.workarea.js`, `cb:workarea:set`, legacy Building UI/data or related production modules into authority for the modular runtime.

Therefore IM-21D is not defined as a UI-only port. A controlled modular Work Area contract is a prerequisite capability boundary.

### Binding IM-21D contract

- Work Area is Building-bound and addressed through stable `buildingId`.
- A Building may expose Work Area editing only when a legitimate current modular Building/capability source declares that capability. Work Area support must not be inferred from legacy data.
- From the existing IM-21B Building Context, an eligible selected Building may enter an exclusive Player-facing Work Area working mode.
- The world remains the primary editing surface. The current authoritative Work Area is projected visibly and may be edited through touch/pointer controls appropriate to the defined modular contract.
- Player UX owns no second persistent Work Area truth. Editor/drag/handle state is transient presentation state only.
- Entry, edit, explicit confirmation and cancellation are controlled. Cancel is mutation-free. A changed Work Area becomes authoritative only through the modular Work Area mutation boundary.
- Persisted Work Area state must survive Save → Reload → Continue with the same semantic state. Transient editor state is not persisted.
- Work Area editing is an exclusive primary working surface under the IM-21 smartphone rule and must arbitrate deterministically against Context, Build Catalog and Placement.
- While Work Area editing owns the relevant gesture, normal Selection/Placement must not also consume it. Camera pan/zoom remains available where the gesture is not owned by a Work Area control.
- Hidden Work Area UI must not intercept touches.
- iPhone remains the minimum/reference layout; no hover, right-click, keyboard or browser zoom may be required.

### Identified modular Work Area contract gap

Before IM-21D UX implementation can be authorized, the modular line requires a controlled Work Area contract covering at minimum:

1. **Eligibility / capability** — whether a current Building supports a Work Area.
2. **Current-area projection** — stable read-only projection keyed by `buildingId`.
3. **Validity / bounds** — authoritative rules for allowed Work Area geometry/location; UI must not invent validity.
4. **Controlled mutation** — one authoritative commit boundary for accepted Work Area changes, with explicit mutation-free cancel/reject behavior.
5. **SaveGame / restore** — authoritative Work Area state participates in Save → Reload → Continue without persisting transient editor state.

A later Implementation Scope Reconciliation must locate existing reusable modular owners, if any, and determine the smallest missing contract implementation. The gap must not be silently filled by importing legacy-main authority.

### Verification requirements for later implementation

Later IM-21D implementation must prove at minimum:

- unsupported Buildings fail closed and expose no invented Work Area capability;
- eligible Building identity remains stable through `buildingId`;
- entering/leaving the Work Area surface is presentation-only until explicit authoritative commit;
- cancel/reject is mutation-free;
- accepted changes pass only through the modular Work Area authority;
- Context ↔ Build Catalog ↔ Placement ↔ Work Area arbitration is deterministic;
- UI controls do not leak WORLD Selection/Placement input;
- camera pan/zoom remains usable outside Work Area-owned gestures;
- Save → Reload → Continue restores the authoritative Work Area but not transient editing state;
- no legacy-main Work Area/production system becomes modular gameplay authority;
- real-device verification covers at least iPhone portrait + landscape; the complete device matrix remains IM-21G.

### Explicit non-scope

No production-system rewrite; no Worker/Workforce assignment change; no resource-distribution or production-output redesign; no new Building type/content; no demolition/upgrades; no new Selection or Camera authority; no IM-21E Economy / Settlement Overview; no IM-21F System Menu / Save / Help / Guidance; no IM-21G device-matrix completion; no Inspector expansion; and no legacy-main Work Area system promoted to authority.

### Current gate

**IM-21D Reconciliation / Definition: PASS / CAPABILITY GAP IDENTIFIED / DEFINED / NOT IMPLEMENTED.**

This documentation authorizes no Work Area implementation, no legacy migration and no new gameplay mutation. The next permissible step is exclusively a separate **IM-21D Definition Documentation Verification / Scope Gate** against frozen IM-21C @ `00212904f5019d966cac76623d9e487e1f0dc0d0`.


## IM-21C completion / freeze record — 2026-09-23

- IM-21 Whole-Block remains **IN PROGRESS** on `feature/im-21-responsive-player-game-ui-integration`.
- Frozen predecessor: **IM-21B – Selection / Context Panel Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `9abe93a9ca521f04940b75a71987f6e95064a45b`, marker `frozen/im-21b-selection-context-panel-integration`.
- **IM-21C – Build Catalog / Placement Player UX Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER.**
- Verified product/test head: `1982640fbf0ef94d84f92d09deaa4894a5977d08`.
- Freeze marker: `frozen/im-21c-build-catalog-placement-player-ux-integration`.
- Final implementation scope from the verified IM-21C documentation baseline `4f901ba0b9980419d2cbc686bfcec77e9299e65e`: the 9 authorized IM-21C implementation files plus only the separately reconciled/authorized predecessor-regression corrections in `src/dev/im-21a-self-test.node.js` and `src/dev/im-21b-self-test.node.js`. No other product path was added to scope.
- Delivered Player behavior: `Bauen` opens the responsive V1 Build Catalog; the catalog projects exactly the seven frozen S2D-05 V1 Building identities; only the currently supported `HQ` and `WOODCUTTER` definitions are placement-enabled, while unsupported V1 entries remain visible but fail closed. `STOREHOUSE` remains an IM-16F baseline definition and is not promoted into the V1 catalog.
- Existing frozen authority remains unchanged: Catalog selection enters the existing IM-16F/IM-16B Placement path; target validity remains IM-16A, preview remains IM-16C, explicit Confirm/Cancel remains IM-16E, authoritative registration/commit remains IM-16D, and successful construction continues into the existing IM-17 chain.
- Working-surface/input behavior is deterministic: Context ↔ Build Catalog ↔ Placement Controls do not compete as simultaneous primary Player work surfaces; active Placement suppresses normal Selection/Context; hidden Catalog/Placement surfaces do not intercept touches; existing WORLD pan/pinch/zoom semantics remain available.
- Exact-head automated evidence for `1982640f…`: **CI Baseline #5733 SUCCESS**, **Development Testbuild #88 SUCCESS**, **Pages #7561 SUCCESS**. The clean CR/IM regression includes IM-21A PASS, IM-21B PASS and IM-21C self-test PASS with `v1CatalogEntries: 7`, `supportedPlacementDefinitions: [HQ, WOODCUTTER]`, unsupported entries fail-closed, frozen IM-16F baseline preserved, legacy Storehouse not promoted, single-primary-working-surface wiring confirmed and no new gameplay authority.
- The separately authorized predecessor-test corrections remove only obsolete concrete successor-couplings introduced by legitimate IM-21C presentation/build-identity changes. They do not relax the surviving IM-21A or IM-21B gameplay/presentation contracts.
- Real-device evidence on TESTBUILD #88: **iPhone portrait PASS + iPhone landscape PASS** for `Bauen → Katalog → Gebäude wählen → Placement → Bestätigen/Abbrechen`, Context↔Catalog↔Placement arbitration, pan/zoom and touch behavior. Additional **iPad landscape PASS** evidence shows the complete seven-entry V1 catalog, supported Rathaus/Holzfällerhütte placement entries, unsupported entries fail-closed and successfully placed buildings in the world.
- Explicitly not introduced by IM-21C: IM-21D Work Area Player UX, IM-21E Economy / Settlement Overview, IM-21F System Menu / Save / Help / Guidance, new Building/Placement/Construction authority, SaveGame-schema changes, new Camera/Selection semantics or legacy-main Build authority.
- **Completion / Evidence / Freeze Gate: PASS / 0 BLOCKER. IM-21D remains unauthorized.**

This completion record supersedes the earlier IM-21C `DEFINED / NOT IMPLEMENTED` status text below; the definition record remains as the historical contract that governed implementation.

## IM-21C definition record — 2026-09-23

**IM-21C – Build Catalog / Placement Player UX Integration: DEFINED / NOT IMPLEMENTED.**

**Definition baseline:** frozen IM-21B @ `9abe93a9ca521f04940b75a71987f6e95064a45b`, marker `frozen/im-21b-selection-context-panel-integration`.

### Reconciliation result

The complete authoritative Placement/Construction chain already exists and remains authoritative:

`Player building choice → frozen IM-16F selection/activation → IM-16B transient Placement state + WORLD target resolution → IM-16A authoritative Placement evaluation → IM-16C read-only preview → IM-16E explicit Confirm/Cancel → IM-16D authoritative Building registration/commit → existing IM-17 Construction chain`.

IM-21C therefore creates no new Building, Placement or Construction system. It replaces/integrates the current transitional IM-21A/IM-16 Build workspace with a responsive Player-facing Build Catalog / Placement UX over those frozen owners.

### Binding IM-21C contract

- `Bauen` opens a responsive primary Build Catalog working surface.
- Catalog entries may expose only actually supported Building definitions from an existing controlled current definition/catalog source. IM-21C must not invent Building definitions and must not promote the current `IM16F_BASELINE_BUILDING_OPTIONS` test/baseline list into a permanent authoritative game catalog.
- Existing repository legacy Building data/UI is not automatically gameplay authority and must not be reused as such merely to fill a catalog gap.
- Player-facing name, category/identity, construction requirements/costs or availability may be shown only where an existing current authoritative/read-model source actually supplies them. Missing data is not guessed.
- Selecting a Catalog entry activates the existing frozen IM-16F/IM-16B Placement path; the Catalog itself owns no Placement state or validity truth.
- During active Placement the world becomes the primary interaction surface. Existing IM-16C preview continues to project the frozen IM-16A evaluation; IM-21C does not recalculate validity.
- Placement controls expose the selected Building plus explicit **Bestätigen / Abbrechen**. World taps never implicitly commit a Building.
- Confirm continues through frozen IM-16E/IM-16D only and remains guarded by the existing Runtime `RUNNING` requirement. Cancel remains mutation-free.
- COMMITTED/REJECTED Player feedback is derived only from the existing authoritative commit result; UI state must not infer success.
- Successful commit continues into the existing IM-17 Construction chain without a second Construction owner.

### Working-surface / input arbitration

The IM-21 smartphone rule remains binding: world + compact HUD + sparse feedback form the persistent base; only one additional primary working surface may be active.

For IM-21C the relevant sequence is:

`Context Panel ↔ Build Catalog ↔ Placement Controls`.

- Opening Build closes/suppresses Context.
- Starting Placement closes/hides the Catalog and exposes Placement controls.
- Active Placement continues to suppress normal Selection/Context under the frozen IM-21B arbitration.
- Cancel ends Placement and returns in a controlled way to the defined Build entry/catalog state.
- Successful commit ends Placement and returns the world to the primary Player surface.
- Hidden Catalog/Placement surfaces must not intercept touches.
- Existing WORLD pointer/touch ownership, camera pan/pinch/zoom and Selection semantics remain unchanged.
- iPhone is the reference/minimum layout; the full interaction must require no hover, right-click, keyboard or browser zoom.

### Catalog capability boundary

The current UI exposes exactly the transitional IM-16F baseline choices `HQ`, `WOODCUTTER`, `STOREHOUSE`. That list is explicitly a narrow known-definition source, not an authoritative Building registry.

A later Implementation Scope Reconciliation must therefore identify the current legitimate Building-definition/catalog source before implementation. If no adequate current source exists, that is a concrete capability gap to reconcile separately; IM-21C must not silently solve it by making legacy UI/data authoritative.

### Verification requirements for later implementation

Later IM-21C implementation must prove at minimum:

- Build Catalog open/close is presentation-only and mutation-free.
- Only actually supported Building definitions are exposed.
- Catalog selection enters the existing IM-16F/IM-16B Placement path.
- Existing valid/occupied target evaluation and IM-16C preview semantics remain unchanged.
- Confirm commits only through the existing authoritative commit boundary; Cancel remains mutation-free.
- Runtime PAUSED continues to reject construction before authoritative Building mutation.
- Context ↔ Catalog ↔ Placement working-surface arbitration is deterministic.
- Catalog/buttons are UI-owned and leak no WORLD selection/placement input.
- Pan/zoom during Placement remains functional.
- No cost, availability, validity or success state is invented by the UI.
- Successful commit continues into the existing Construction chain.
- Real-device verification covers at least iPhone portrait + landscape. The complete iPhone → iPad → desktop matrix remains IM-21G.

### Explicit non-scope

No new Placement/Building/Construction authority; no new Building type/content; no invented construction costs/prerequisites; no rotation, demolition or Building upgrades; no IM-21D Work Area; no IM-21E Economy/Settlement Overview; no IM-21F System Menu/Save/Help/Guidance; no Inspector expansion; no SaveGame-schema change; no new Camera/Selection semantics; and no legacy-main Build system promoted to authority.

### Current gate

**IM-21C Reconciliation / Definition: PASS / SCOPE DETERMINED / DEFINED / NOT IMPLEMENTED.**

This documentation authorizes no IM-21C implementation. The next permissible step is exclusively a separate **IM-21C Definition Documentation Verification / Scope Gate** against frozen IM-21B. IM-21D remains unauthorized.

## IM-21B completion / freeze record — 2026-09-22

- IM-21 Whole-Block remains **IN PROGRESS** on `feature/im-21-responsive-player-game-ui-integration`.
- Frozen predecessor: **IM-21A – Responsive Game Shell / HUD Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `0962d3ad531ba093c22b1194388c005518a9493f`, marker `frozen/im-21a-responsive-game-shell-hud-integration`.
- **IM-21B – Selection / Context Panel Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER.**
- Verified product/test head: `5d9e77592a435118a5fc9e385a73b8c44ba34cc9`.
- Freeze marker: `frozen/im-21b-selection-context-panel-integration`.
- Final implementation scope from the verified IM-21B documentation baseline `ab7c4cc9609da4dc79452e7d4782eea1a066bf12`: the 9 authorized IM-21B implementation files plus exactly one separately reconciled/authorized predecessor-test correction in `src/dev/im-20g-self-test.js`. No other path is part of the product implementation delta.
- Delivered Player behavior: existing frozen IM-14D remains the sole Building/Person Selection owner; responsive Context Panel provides transient `PEEK → STANDARD → EXPANDED`; Building/Person context consumes existing authoritative/read-only sources only; missing selected objects clear fail-closed; no guessed blocking reason or new gameplay command authority is introduced.
- Selection/Placement arbitration: active Placement clears/hides normal Selection/Context and guards subsequent Selection taps while preserving frozen Placement target/evaluation/commit authority; after Placement becomes inactive no prior Selection is restored automatically.
- Working-surface/input boundary: Context is a real `data-ui-region="context"` Player surface; hidden Context has no touch interception; Build workspace and Context do not compete as simultaneous primary working surfaces; existing camera drag/pinch semantics remain unchanged.
- Exact-head automated evidence for `5d9e775…`: **CI Baseline #5713 SUCCESS**, **Development Testbuild #68 SUCCESS**, **Pages #7541 SUCCESS**. CI completed the frozen predecessor chain through IM-20G, IM-21A regression and IM-21B self-test. IM-21B evidence includes Building and Person projection, stable PEEK/STANDARD/EXPANDED identity, `noGameplayMutation: true`, `noInventedBlockingReason: true`, `placementSelectionArbitrationWired: true` and `hiddenContextHasNoTouchSurface: true`.
- The IM-20G predecessor-test correction removes only the obsolete literal requirement that every successor use the old IM-20G testbuild ID. All frozen IM-20G lifecycle assertions remain intact: Browser Storage, V2 Restore, Derived-State Rebinding, Atomic Runtime Activation, Continue Lifecycle, Exactly-once Recovery Reconciliation and BrowserSaveGameStorageAdapter presence.
- Real iPhone/iOS Safari evidence on the same TESTBUILD #68: portrait and landscape; Hauptquartier/Holzfäller/Lagerhaus and multiple persons select correctly; PEEK/STANDARD/EXPANDED via +/+ and reverse via − remain on the same identity; drag, pan and zoom keep the selected object instead of creating a new accidental Selection; Context remains usable/readable; Placement and Context do not compete.
- Explicitly not introduced by IM-21B: IM-21C Build Catalog / polished Placement Player UX, IM-21D Work Area, IM-21E Economy Overview, IM-21F System Menu / Save / Help / Guidance, new gameplay/domain/SaveGame authority or Inspector capability.
- **Completion / Evidence / Freeze Gate: PASS / 0 BLOCKER. IM-21C remains unauthorized.**

## IM-21A completion / freeze record — 2026-09-21

- IM-20 Whole-Block predecessor: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `58e55466e3c1ccc60342c5bc82747d47e7629db0`, marker `frozen/im-20-authoritative-savegame-continue-integration`.
- IM-21 Whole-Block: **IN PROGRESS** on `feature/im-21-responsive-player-game-ui-integration`.
- **IM-21A – Responsive Game Shell / HUD Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER @ `0962d3ad531ba093c22b1194388c005518a9493f`.**
- Verified product/test head: `791f56254db59aeb502291738ae62d8b2ea9f0c6`.
- Scope delivered: responsive Player shell; compact authoritative read-only Wood / Stone / Gold / Population HUD; world remains primary play surface; iPhone portrait/landscape safe-area handling; existing camera/touch controls preserved; temporary Build workspace; RUNNING/PAUSED Player control.
- PAUSED construction guard evidence: while PAUSED, placement Confirm is rejected before authoritative Building mutation with `RUNTIME_NOT_RUNNING`; Building count remains unchanged; Cancel remains mutation-free; after RUNNING resumes, valid placement Confirm retains the existing successful behavior.
- Real iPhone/iOS Safari evidence: responsive shell/HUD visible; RUNNING `Ⅱ` and PAUSED `▶` states verified; permanent technical bottom diagnostics removed; Build workspace Confirm/Cancel reachable; PAUSED Confirm creates no persistent Building; Cancel works; after Play, placement works again.
- Exact-head automated evidence for `791f5625…`: CI Baseline #5696 SUCCESS, including `pausedConfirmRejectedBeforeAuthoritativeMutation: true` and full CR/IM predecessor regression; Development Testbuild #51 SUCCESS; Pages #7524 SUCCESS.
- Known transition UI: current Build workspace is functional IM-21A transition UI only. Polished Build Catalog / Placement Player UX remains IM-21C. Selection / Context remains IM-21B. System Menu / Save / Help / Guidance remains IM-21F.
- No new Building, Resource, Construction, Workforce, Population, Gold, Transport or SaveGame authority is introduced by IM-21A. Inspector remains NON-PLAYER / NON-IM-21.
- This record supersedes older top-level IM-20/IM-20G status text elsewhere in this document where that text still describes an intermediate state.

## IM-21B definition record — 2026-09-21

**IM-21B – Selection / Context Panel Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**Definition baseline:** frozen IM-21A @ `0962d3ad531ba093c22b1194388c005518a9493f`, marker `frozen/im-21a-responsive-game-shell-hud-integration`.

### Reconciliation result

Frozen IM-14D already owns the Player world-selection foundation: shared unified WORLD pointer/touch input, Building/Person hit testing, tap-vs-drag separation, multi-touch guard, empty-world clear and read-only selection-context projection. Frozen IM-14E consumes the same WORLD input for camera pan/pinch-zoom. IM-21A deliberately hides the old technical context surface inside `.projection-host`.

Therefore IM-21B does **not** create a second Selection engine. It integrates the existing Selection authority and existing Player/read-model projections into the responsive S2D-04 Context Panel model.

### Binding IM-21B contract

- Existing Selection remains authoritative. IM-21B must reuse the frozen IM-14D selection state/input boundary; no parallel selected-object state, duplicate hit-test pipeline or second gameplay truth is permitted.
- Initial selectable object kinds remain the already supported `building` and `person`. IM-21B does not add terrain, resource-stack, animal, path or other new selectable entity classes.
- A valid selection opens a Player Context Panel. On smartphone the panel starts at `PEEK`; `STANDARD` and `EXPANDED` are transient presentation states only and are not SaveGame state.
- `PEEK` exposes object identity/name, primary status and the most relevant already-supported information/action. `STANDARD` exposes normal relevant details/actions. `EXPANDED` may expose additional existing details without becoming an Inspector.
- Building context is keyed by the stable selected `buildingId` and may consume existing authoritative/read-only Building, Construction, Operational, Housing, Workforce, Stock/Transport and related Player projections only where those sources actually exist.
- Person context is keyed by the stable selected Person/Resident identity and may expose existing assignment/carrier/movement state read-only. No manual Person, Carrier or Workforce micromanagement is introduced.
- Primary-status precedence follows frozen S2D-04: critical/invalid Player-relevant state → deliberate Player state → blocking prerequisite → active transition → normal active operation → neutral waiting.
- Blocking reason may be shown only when supported by existing authoritative/read-model state. IM-21B must not guess or synthesize a gameplay reason.
- IM-21B introduces no new gameplay command authority. General Building Pause/Resume, Work Area editing and Demolition are not invented here. Work Area remains IM-21D; Build Catalog / Placement Player UX remains IM-21C.
- IM-21B-owned immediate actions are presentation/selection actions such as `PEEK ↔ STANDARD ↔ EXPANDED`, minimize and close. Closing or tapping free world clears the selection through the existing Selection boundary.
- A selected object may receive visible read-only selection feedback in the world, but that feedback must not mutate Building, Person or World state.
- If the selected object no longer exists in the current world projection, the selection/context must fail closed to no selection; no stale zombie context is retained.
- Frozen IM-20E behavior remains binding: Continue clears transient selection. Context Panel state is not persisted as authoritative SaveGame state.
- Frozen camera semantics remain unchanged: one-finger drag pans; pinch zooms; drag and multi-touch must not create a selection. UI-panel interaction belongs to the UI input owner and must not leak into WORLD gestures.
- Placement and Selection share the existing WORLD-input stream. While a Placement working mode is active, Placement targeting must not also open/change normal Selection/Context. IM-21B must provide Player-UI arbitration without changing frozen placement validation/commit authority.
- Smartphone/iPhone remains the minimum/reference layout. Besides world + compact HUD + sparse world feedback, only one primary working surface may be active at a time. Context Panel must therefore not compete with Build Catalog / Placement controls or later Work Area / Economy / System surfaces.
- Hidden/minimized Context UI must leave no invisible touch interception surface.
- Inspector / Developer Diagnostics remain **NON-PLAYER / NON-IM-21B**.

### Verification contract for later implementation

A later IM-21B implementation gate must prove at minimum: Building tap and Person tap open the matching context; free-world tap closes; drag and pinch do not change selection; PEEK/STANDARD/EXPANDED preserve the same selected identity; panel interaction does not trigger WORLD gestures; removed selected objects clear fail-closed; Continue clears transient Selection/Context; Placement and Context do not compete for the same Player gesture; and all Context interaction remains free of unauthorized gameplay mutation.

Real-device IM-21B verification must at least cover iPhone portrait and landscape. The complete iPhone → iPad → desktop V1 interaction matrix remains IM-21G.

### Explicit non-scope

No IM-21C Build Catalog / polished Placement Player UX, no IM-21D Work Area editor, no IM-21E Economy Overview, no IM-21F System Menu / Save / Help / Guidance integration, no new Building/Resource/Construction/Workforce/Population/Housing/Gold/Transport/Runtime/Scheduler/SaveGame authority, no Inspector rebuild and no legacy-main gameplay/UI reuse as authority.

### Current IM-21B gate

**IM-21B Completion / Evidence / Freeze Gate: PASS / 0 BLOCKER / FROZEN.**

The completed IM-21B implementation is frozen by `frozen/im-21b-selection-context-panel-integration`. No IM-21C implementation is authorized by this freeze.


**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Frozen development baseline: corrected IM-20C @ `ce84bacef4d2802f045ce522e7f7140b7b173fd8`
- Frozen IM-20C marker: `frozen/im-20c-deterministic-validation-restore-integration`
- Current Whole-Block branch: `feature/im-20-authoritative-savegame-continue-integration`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15 – Guidance / Inspector: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16 – Player Construction & Placement Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17 – Economic Construction Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-18 – Operational Building / Workforce / Production Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19 – Population / Housing / Gold Economy Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19A – Residential Building Admission Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19B – Housing Capacity / Occupancy Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19C – Resident → Housing Assignment Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19D – Authoritative Population Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19E – Gold Economy Admission / Flow Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19F – Operational Economy → Gold Settlement: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19G – Player Population / Housing / Gold Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20 – Authoritative SaveGame / Continue Integration: IN PROGRESS**
- **IM-20A – Persistent State Inventory & SaveGame Schema Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20B – Post-IM13 Authoritative Snapshot Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER — continuity correction incorporated**
- **IM-20C – Deterministic Validation & Restore Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER — continuity correction incorporated**
- **IM-20D – Derived-State Rebinding after Continue: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20E – Browser Save / Reload / Continue Lifecycle Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20F: COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-20G: COMPLETE / FROZEN / PASS / 0 BLOCKER**

IM-19 development has completed and frozen its defined A–G chain and the Whole-Block. IM-19A is frozen at `b528081409407ad531a450e5deb832ee7a0031e7`, IM-19B at `3ba5a17761ac7f8bce3f01a49cbaef515728c355`, IM-19C at `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`, IM-19D at `0847d27b60f13a99cb76d220b56b58107e832950`, IM-19E at `8284c48b3e6b8c75709a58951acacbc59dd81184`, IM-19F at `90d1b093fe1b99b048ea68529b9b0af731b11456`, and IM-19G at `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`. The Whole-Block is frozen at `f9c9202014deded496d96adfb96a430a230f06f2` with marker `frozen/im-19-population-housing-gold-economy-integration`.

## 2. Frozen predecessor chain

Frozen IM-17 Whole-Block marker:
- `frozen/im-17-economic-construction-integration` @ `53de400c2ffe57addf832b599b906b3d5b473385`

Frozen IM-18 markers and heads:

- IM-18A `frozen/im-18a-operational-building-admission-contract` @ `01ad19b2064887b131b4bdd1dd7157f0a4f6724c`
- IM-18B `frozen/im-18b-workforce-requirement-eligibility-contract` @ `42e64722b34ed7d516735111c5c4ce573631d59a`
- IM-18C `frozen/im-18c-deterministic-workforce-assignment-integration` @ `195299b0fb7098806be88b7c0b3a577ca737ecb6`
- IM-18D `frozen/im-18d-production-requirement-recipe-integration` @ `2e5d4fc53295a7abee92b0f9190a6bac1b5e31fe`
- IM-18E `frozen/im-18e-operational-production-execution` @ `9d1a3bb165564b29ad7ad1a5ee8619ed2d131c20`
- IM-18F `frozen/im-18f-input-consumption-output-settlement` @ `6cfe680eb8b66c8015026629a7200483ae4c3bdd`
- IM-18G `frozen/im-18g-player-operational-state-projection` @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`

Frozen IM-18 Whole-Block marker:
- `frozen/im-18-operational-building-workforce-production-integration` @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`

Frozen IM-19A marker:
- `frozen/im-19a-residential-building-admission-contract` @ `b528081409407ad531a450e5deb832ee7a0031e7`

Frozen IM-19B marker:
- `frozen/im-19b-housing-capacity-occupancy-integration` @ `3ba5a17761ac7f8bce3f01a49cbaef515728c355`

Frozen IM-19C marker:
- `frozen/im-19c-resident-housing-assignment-integration` @ `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`

Frozen IM-19D marker:
- `frozen/im-19d-authoritative-population-projection` @ `0847d27b60f13a99cb76d220b56b58107e832950`

Frozen IM-19E marker:
- `frozen/im-19e-gold-economy-admission-flow-integration` @ `8284c48b3e6b8c75709a58951acacbc59dd81184`

Frozen IM-19F marker:
- `frozen/im-19f-operational-economy-gold-settlement` @ `90d1b093fe1b99b048ea68529b9b0af731b11456`

Frozen IM-19G marker:
- `frozen/im-19g-player-population-housing-gold-projection` @ `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`

Frozen IM-20D marker:
- `frozen/im-20d-derived-state-rebinding-after-continue` @ final freeze-gate head

Frozen IM-20E marker:
- `frozen/im-20e-browser-save-reload-continue-lifecycle-integration` @ final freeze-gate head

## 3. Binding ownership boundary after IM-18

- Existing Building Domain/store remains sole owner of stable Building identity, lifecycle and Building-store mutation.
- Frozen IM-17 remains authoritative for economic construction admission, material demand, logistics connection, delivered-material progress and exactly-once construction completion.
- IM-18A consumes completed construction plus existing Building lifecycle and admits an operational Building only when construction is complete and the Building still exists.
- IM-18B defines operational workforce requirement/eligibility over existing Person workforce profiles and existing Workforce assignment state.
- IM-18C performs deterministic workforce assignment over eligible free persons and reuses existing Workforce assignment-state authority.
- IM-18D connects an assigned operational Building to the existing production BuildingStock recipe contract. It creates no second recipe or stock authority.
- IM-18E evaluates operational production only from assigned workforce, the integrated existing recipe and current BuildingStock inputs.
- IM-18F is the authoritative IM-18 production settlement seam: required inputs are removed and outputs are added through existing BuildingStock mutation contracts, with duplicate settlement protection.
- IM-18G projects authoritative operational state into Player UI only. UI owns no Building, workforce, recipe, production, BuildingStock or settlement truth.
- Existing Runtime, Scheduler, Transport, Resource, BuildingStock, Person, Workforce, Selection, Camera and SaveGame owners remain authoritative.
- Frozen IM-15 Inspector remains observer/guidance except its already frozen diagnostic action allowlist.
- Legacy `main` gameplay/UI architecture remains reference only.

## 4. IM-18 – Operational Building / Workforce / Production Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Definition baseline:** frozen IM-17 @ `53de400c2ffe57addf832b599b906b3d5b473385`.

**Frozen Whole-Block head:** `2d068aa357ec5d1fe8f53eb867037021d04caddf`.

**Frozen marker:** `frozen/im-18-operational-building-workforce-production-integration`.

### Whole-Block objective

IM-18 answers:

`How does an authoritatively completed existing Building become operational with real workforce, an existing production recipe, real input availability and deterministic BuildingStock settlement without duplicating Building, Person, Workforce, Recipe, Production or Stock authority?`

The implemented flow is:

`frozen IM-17 completed Building → IM-18A operational admission → IM-18B workforce requirement/eligibility → IM-18C deterministic assignment → IM-18D existing production recipe integration → IM-18E operational execution readiness → IM-18F input consumption/output settlement → IM-18G read-only Player operational-state projection`.

### IM-18A – Operational Building Admission Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `01ad19b2064887b131b4bdd1dd7157f0a4f6724c`

Consumes existing construction completion and Building lifecycle. Operational admission requires exactly one effective completion for the same Building and lifecycle state `EXISTS`.

### IM-18B – Workforce Requirement / Eligibility Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `42e64722b34ed7d516735111c5c4ce573631d59a`

Defines required worker count, specialization and capabilities for an admitted operational Building and evaluates only existing Person workforce profiles plus existing Workforce assignment state. Eligibility requires matching specialization/capabilities and `FREE` assignment availability.

### IM-18C – Deterministic Workforce Assignment Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `195299b0fb7098806be88b7c0b3a577ca737ecb6`

Selects eligible persons deterministically by stable person ID up to the required count and transitions them through the existing Workforce assignment-state contract. Insufficient eligible workforce is rejected rather than partially manufacturing assignment truth.

### IM-18D – Production Requirement / Recipe Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `2e5d4fc53295a7abee92b0f9190a6bac1b5e31fe`

Requires an assigned operational workforce and reuses the existing production BuildingStock recipe for the same Building. Existing recipe inputs and outputs remain authoritative.

### IM-18E – Operational Production Execution

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `9d1a3bb165564b29ad7ad1a5ee8619ed2d131c20`

Evaluates real BuildingStock input availability for the assigned operational Building and produces only `READY` or `BLOCKED_INPUT`. Execution is rejected when required inputs are insufficient.

### IM-18F – Input Consumption / Output Settlement

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `6cfe680eb8b66c8015026629a7200483ae4c3bdd`

Consumes recipe inputs and adds outputs through existing BuildingStock mutation contracts after successful IM-18E execution. A settlement ID prevents the same production settlement from being applied twice.

### IM-18G – Player Operational State Projection

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `2d068aa357ec5d1fe8f53eb867037021d04caddf`

Projects only existing authoritative operational state to Player UI, including no worker, waiting for input, ready to produce and production settled. It owns no gameplay mutation authority.

### IM-18 Whole-Block exclusions

IM-18 introduces no housing assignment, population derivation, Gold economy, tax/trade system, wages, needs/happiness, migration, birth/death/aging, demolition, upgrades, new transport/routing authority, SaveGame rearchitecture, Inspector editor authority or legacy `main` gameplay reuse.

## 5. IM-19 – Population / Housing / Gold Economy Integration

**Status:** WHOLE-BLOCK RECONCILIATION PASS / FREEZE AUTHORIZATION PENDING

**Definition baseline:** frozen IM-18 @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`.

**Whole-Block branch:** `feature/im-19-population-housing-gold-economy-integration`.

### IM-19A – Residential Building Admission Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `b528081409407ad531a450e5deb832ee7a0031e7`  
**Frozen marker:** `frozen/im-19a-residential-building-admission-contract`

IM-19A consumes frozen IM-18A operational admission, existing Building identity and the existing `building-housing` capability. Residential admission requires the same stable `buildingId` across those sources and positive existing housing capacity. It creates no occupancy, resident assignment, population or Gold truth.

Regression evidence on implementation head `c46ef9a7739fee8a82397f4c6b605c1a7a94dc94`: CI `34640779068` SUCCESS and Pages `34640777324` SUCCESS. Real iPad/Safari evidence confirmed the exact IM-19A TESTBUILD identity, correct title and the visible admission-only/non-scope boundary.

Exact-head CI and Pages succeeded on `b528081409407ad531a450e5deb832ee7a0031e7`; the frozen IM-19A marker was created and verified identical to the Whole-Block branch.

### IM-19B – Housing Capacity / Occupancy Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `3ba5a17761ac7f8bce3f01a49cbaef515728c355`  
**Frozen marker:** `frozen/im-19b-housing-capacity-occupancy-integration`

IM-19B consumes only a frozen-IM-19A admitted residential Building plus existing `resident-home-assignment` state. It reuses `HousingCapacityOccupancy` as the sole authority for `capacity`, `occupancy`, `availableSlots` and the capacity invariant. IM-19B derives only `AVAILABLE` or `FULL`; it creates or mutates no resident assignment and introduces no Person, Population or Gold authority.

Final evidence: CI `34682616074` SUCCESS and Pages `34682615729` SUCCESS on exact frozen head `3ba5a17761ac7f8bce3f01a49cbaef515728c355`. The real device evidence was **iPhone/Safari only**. Earlier steering wording that additionally claimed iPad evidence was incorrect and is corrected on this active Whole-Block branch.

### IM-19C – Resident → Housing Assignment Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`  
**Frozen marker:** `frozen/im-19c-resident-housing-assignment-integration`

**Definition baseline:** frozen IM-19B @ `3ba5a17761ac7f8bce3f01a49cbaef515728c355`.

IM-19C consumes only existing stable Resident/Person identities, frozen-IM-19B Housing integration states and existing active home assignments. Housing and candidate persons are ordered deterministically by stable ID. Existing homes are preserved; only previously unassigned existing persons may receive a new home, and that assignment is created solely through the existing `HousingHomeCapacityIntegrationContract.assignHome(...)` authority.

No Person/Resident creation, Population derivation, Workforce mutation or Gold mutation is part of IM-19C.

Final evidence: real **iPhone/Safari** device PASS plus CI `34686333542` SUCCESS and Pages `34686333201` SUCCESS on exact frozen head `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`. No iPad evidence is claimed for IM-19C.

### IM-19D – Authoritative Population Projection

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `0847d27b60f13a99cb76d220b56b58107e832950`  
**Frozen marker:** `frozen/im-19d-authoritative-population-projection`

**Definition baseline:** frozen IM-19C @ `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`.

IM-19D is a read-only Player population projection over frozen-IM-19C Resident→Home truth and existing stable Resident identities. Only valid existing Residents with active authoritative homes are counted; projected Population must remain exactly consistent with the frozen-IM-19B Housing occupancy state.

The projection also exposes immutable `population-count-trace` entries (`personId → homeBuildingId → COUNTED`) so the existing read-only diagnostics/Inspector can later visualize the step chain and branches. This is **data preparation only**: IM-19D adds no Inspector UI, no diagnostic mutation and no new Inspector authority.

No Person creation/mutation, Housing mutation, Home assignment mutation, Workforce mutation or Gold mutation is part of IM-19D.

Freeze-gate correction: the first IM-19D browser/device evidence had the correct TESTBUILD identity, but source inspection proved that HUD and Inspector still read Population from legacy CR-30B `housingPopulation.population`. That blocked freeze. The corrected runtime composition now executes the real frozen-IM-19A→B→C Housing/Resident assignment chain, exposes `CleanRuntime.populationProjection`, and routes HUD plus read-only Inspector Population through IM-19D. Gold remains on its existing pre-IM-19E owner/path. The previous TESTBUILD 1 screenshot remains historical evidence only. The corrected deployment has now passed a fresh real **iPhone/Safari TESTBUILD 2** re-test: screenshots visibly confirm `IM-19D-AUTHORITATIVE-POPULATION-PROJECTION-TESTBUILD-2`, `READY`, Population `3` in both HUD and read-only Inspector, and `IM-19D · TESTBUILD 2` on the lower surface. CI `34687205200` and Pages `34687204928` both succeeded on exact implementation head `149f37fbdc2aa3d1f05301a38ee3eb9452abec40`. This final steering commit must itself receive exact-head CI + Pages SUCCESS before `frozen/im-19d-authoritative-population-projection` is created.

### IM-19E – Gold Economy Admission / Flow Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `8284c48b3e6b8c75709a58951acacbc59dd81184`  
**Frozen marker:** `frozen/im-19e-gold-economy-admission-flow-integration`

**Definition baseline:** frozen IM-19D @ `0847d27b60f13a99cb76d220b56b58107e832950`.

IM-19E connects frozen-IM-19D authoritative Population to the existing non-physical `GoldEconomyOwner` without mutating its balance. The only admitted flow type in this block is `POPULATION_INCOME`. The existing owner remains the sole Gold authority and its existing `deriveIncome(...)` path is reused through a strict adapter from the IM-19D projection.

Admission produces an immutable `gold-economy-admission-flow` containing the source Population, rate and derived amount, while proving that `GoldEconomyOwner.balance` remains unchanged. `applyIncome(...)`, `settle(...)`, settlement IDs and any balance-after state remain IM-19F scope.

No taxes, trade, wages, physical Resources, BuildingStock Gold, transport or Inspector mutation authority is introduced.

Regression/device evidence on implementation head `9319c87192532bc2dae92015b7dabfa190d48e19`: CI `34689680807` SUCCESS and Pages `34689680511` SUCCESS. Real Safari device evidence confirms `READY`, exact `IM-19E-GOLD-ECONOMY-ADMISSION-FLOW-INTEGRATION-TESTBUILD-1`, the IM-19E title, and `IM-17 WHOLE BLOCK – PASS`. The earlier transient `IM-16G — FAIL · buildIdentity=false` view is not the current deployment evidence; the refreshed device view shows the frozen predecessor regression PASS. A final documentation-only exact-head CI + Pages verification is required before the IM-19E frozen marker is created.

### IM-19F – Operational Economy → Gold Settlement

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `90d1b093fe1b99b048ea68529b9b0af731b11456`  
**Frozen marker:** `frozen/im-19f-operational-economy-gold-settlement`

**Definition baseline:** frozen IM-19E @ `8284c48b3e6b8c75709a58951acacbc59dd81184`.

IM-19F consumes only a frozen-IM-19E `POPULATION_INCOME` admission and applies its existing `derived-gold-income` exactly once to the existing non-physical `GoldEconomyOwner`. It rejects stale admissions and duplicate settlement IDs before a second Gold mutation and exposes immutable `stateBefore` / `stateAfter`.

The active visible Gold path is `IM-19D Population → IM-19E Admission → IM-19F Settlement`; the older direct CR-30C settlement shortcut is not the active Runtime path.

Final evidence: real Safari device PASS, CI `34691298234` SUCCESS and Pages `34691298046` SUCCESS on exact frozen head `90d1b093fe1b99b048ea68529b9b0af731b11456`. Frozen marker verification is identical / 0 ahead / 0 behind.

### IM-19G – Player Population / Housing / Gold Projection

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`  
**Frozen marker:** `frozen/im-19g-player-population-housing-gold-projection`

**Definition baseline:** frozen IM-19F @ `90d1b093fe1b99b048ea68529b9b0af731b11456`.

IM-19G is a read-only Player projection over frozen authoritative Population, Housing and Gold truth. Population comes from IM-19D, Housing capacity/occupancy from the frozen IM-19B/IM-19C chain, and Gold from IM-19F `stateAfter` cross-checked against the current `GoldEconomyOwner` snapshot.

The projection aggregates residential Building count, capacity, occupancy and available slots, requires projected Population to equal authoritative Housing occupancy, rejects stale Gold state, and renders only Player-facing state such as `Siedlung · Bevölkerung 3 · Wohnen 3/3 · Gold 3`.

IM-19G owns no Population, Resident, Housing, Home-assignment, Gold, Settlement or other Economy mutation authority. No further Economy capability and no Inspector system graph is introduced.

Regression/device evidence on implementation head `5fba2eb728adf1195473b28e578087fc37de2204`: CI `34697541542` SUCCESS and Pages `34697541497` SUCCESS. Real Safari device evidence on both iPhone and iPad confirms `READY`, exact `IM-19G-PLAYER-POPULATION-HOUSING-GOLD-PROJECTION-TESTBUILD-1`, the IM-19G title, visible Population `3`, visible Gold `3`, and the Player line `Siedlung · Bevölkerung 3 · Wohnen 3/3 · Gold 3`. The Player projection is read-only and remains consistent with authoritative Housing occupancy and frozen IM-19F Gold state. Exact-head CI and Pages passed on the freeze-gate finalization head, and `frozen/im-19g-player-population-housing-gold-projection` was created and verified identical to the Whole-Block branch. This final steering-only synchronization is re-verified before the marker is advanced to the final consistent head.

### Whole-Block objective

IM-19 answers:

`How are real completed/operational Buildings connected to the existing Housing, Population and non-physical Gold model so that residents, available population and Gold economy become gameplay-effective without duplicating Building, Person, Workforce, Housing, Population, Production or Gold authority?`

### Defined substeps

- **IM-19A – Residential Building Admission Contract**  
  Define when an existing real Building may enter the existing Housing system. No occupancy assignment, population mutation or Gold flow yet.

- **IM-19B – Housing Capacity / Occupancy Integration**  
  Connect admitted residential Buildings to existing Housing capacity/occupancy authority. No second occupancy model and no UI-owned mutation.

- **IM-19C – Resident → Housing Assignment Integration**  
  Deterministically connect existing stable Resident/Person identities to available Housing. Housing and Workforce remain separate authorities.

- **IM-19D – Authoritative Population Projection**  
  Derive Player population only from authoritative resident/housing state. No second mutable Player population truth.

- **IM-19E – Gold Economy Admission / Flow Integration**  
  Connect the existing non-physical Gold model to explicitly authorized real economy events. Gold is not a physical Resource or BuildingStock.

- **IM-19F – Operational Economy → Gold Settlement**  
  Apply clearly defined economic events to authoritative Gold state without introducing trade, tax or wage systems.

- **IM-19G – Player Population / Housing / Gold Projection**  
  Read-only Player projection of authoritative population, housing occupancy/capacity and Gold state.

### IM-19 Whole-Block Completion / Reconciliation

**Status:** PASS / 0 BLOCKER / WHOLE-BLOCK FREEZE AUTHORIZATION PENDING

**Baseline:** frozen IM-18 Whole-Block @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`  
**Reconciled A–G head:** `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`

Whole-Block reconciliation confirms:

- IM-19A through IM-19G are each COMPLETE / FROZEN / PASS / 0 BLOCKER and all seven frozen markers exist.
- The Whole-Block branch is identical to frozen IM-19G.
- Against frozen IM-18 the IM-19 line is forward-only: 90 commits ahead / 0 behind.
- The Whole-Block diff is limited to IM-19 domain/integration contracts, A–G self-tests, required Runtime/UI projection wiring, CI and steering documentation; no unrelated gameplay system, CSS redesign, SaveGame rearchitecture or Inspector system graph was introduced.
- CI contains the complete IM-19A→G regression chain.
- Final reconciled-head evidence: CI `34698054759` SUCCESS and Pages `34698054480` SUCCESS on `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`.
- Real device evidence includes the required individual substep checks, with final IM-19G PASS on both iPhone/Safari and iPad/Safari.

The defined Whole-Block question is therefore satisfied by the frozen A–G chain without duplicating Building, Person, Workforce, Housing, Population, Production or Gold authority.

This reconciliation does **not** freeze IM-19 as a Whole-Block. A separate explicit IM-19 Whole-Block Freeze Authorization / Freeze Decision is required before creating a Whole-Block frozen marker.

### Future Inspector – Whole Clean-Runtime Rebuild Chain (NON-SCOPE)

The intended later Inspector chain visualization is the **complete Clean-Runtime rebuild**, not merely an individual Resident/Population trace. It should be able to represent the CR/IM capability graph from the clean foundation through the current integration blocks, including sequential steps, branches, ownership boundaries, frozen baselines/gates and relevant runtime evidence. Local traces such as IM-19D `personId → homeBuildingId → COUNTED` are only optional evidence nodes inside that broader system graph.

No such Inspector graph UI is implemented or authorized by IM-19G.

### IM-19 explicit non-scope

No tax system, marketplace/trade system, wages, needs/happiness, births, deaths, aging, migration, demolition, upgrades, new production system, new transport system, SaveGame rearchitecture, Inspector editor authority or legacy `main` gameplay reuse.

## 6. IM-20 – Authoritative SaveGame / Continue Integration

**Status:** COMPLETE / PASS / 0 BLOCKER — WHOLE-BLOCK FREEZE PENDING

**Definition baseline:** frozen IM-19 Whole-Block @ `f9c9202014deded496d96adfb96a430a230f06f2`.  
**Whole-Block branch:** `feature/im-20-authoritative-savegame-continue-integration`.

### Whole-Block question

`How does the fully rebuilt frozen-IM19 game state survive Save → Reload → Continue as the same authoritative state without additive defaults, lost assignments/stocks, duplicated settlements or persisted second truths?`

### IM-20A – Persistent State Inventory & SaveGame Schema Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-20a-persistent-state-inventory-savegame-schema-contract`

IM-20A defines a declarative persistence inventory and a target SaveGame **schemaVersion 2** boundary without activating that schema in the existing IM-13 SaveGame implementation.

The inventory classifies each relevant state as exactly one of:

- `PERSIST` — authoritative truth whose loss/replay would change gameplay after Continue.
- `REBUILD_DERIVE` — deterministic projection/cache/runtime binding that must be reconstructed from restored owners and must not become a persisted second truth.

**PERSIST coverage includes** the existing IM-13 truth (capture boundary, World, Map, CoreDomainStores, Gold and Path/Wear) plus post-IM13 authoritative state required for frozen IM-19 continuity: ResourceDemands, ResourceClaims, construction progress, local BuildingStock, BuildingStock transport reservations, Workforce assignment state, Resident→Home assignment state, production settlement fences and Gold settlement fences.

**REBUILD / DERIVE coverage includes** Housing occupancy/status, authoritative Population projection, operational Building admission, workforce eligibility/read projection, production readiness/recipe integration, completion projection, Gold admission/read views, Player projections, transient transport recovery bindings, navigation/reachability/routes/caches, path classification/traversability, scheduler registrations/subscriptions and renderer/camera/selection/Inspector runtime state.

Hard IM-20A boundary:

- target schema = V2, status `DEFINED_NOT_ACTIVE`;
- active `SaveGameSnapshotContract.schemaVersion` remains V1;
- active `SaveGameValidationContract.schemaVersion` remains V1;
- no snapshot capture field is added by IM-20A;
- no restore path is extended by IM-20A;
- no browser storage / Save / Continue lifecycle is introduced by IM-20A;
- no silent fallback to New Game is permitted by the target contract;
- legacy `main` save migration remains out of scope.

Implementation:
- `src/savegame/persistent-state-inventory-schema-contract.js`
- `src/dev/im-20a-self-test.js`
- `src/dev/im-20a-self-test.node.js`

### IM-20B – Post-IM13 Authoritative Snapshot Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-20b-post-im13-authoritative-snapshot-integration`

**Definition baseline:** frozen IM-20A @ `045a056535604b7adcaeb658212da403f532b4f9`.

IM-20B adds a separate V2 **capture-only** SaveGame integration above the frozen IM-13 V1 snapshot contract. The frozen V1 contract remains unchanged and continues to capture `capture/world/map/domains/economy.gold/pathWear`.

The IM-20B V2 capture adds exactly the post-IM13 authoritative sections defined by IM-20A:

- `authoritative.resourceDemands`
- `authoritative.resourceClaims`
- `authoritative.constructionProgress`
- `authoritative.buildingStocks`
- `authoritative.buildingStockTransportReservations`
- `authoritative.workforceAssignments`
- `authoritative.homeAssignments`
- `authoritative.settlementFences.production`
- `authoritative.settlementFences.gold`

Demand progress projection fields (`reservedAmount`, `fulfilledAmount`, `remainingAmount`, `status`) are deliberately excluded from persisted demand records because they derive from Claims and must not become a second truth.

Capture is deterministic, deeply frozen and canonicalizable. ResourceDemand/Claim allocator continuity is captured deterministically from stable IDs. Arrays are normalized/sorted and reject duplicate identity keys before serialization.

Hard IM-20B boundary:

- V2 Snapshot Capture = implemented;
- frozen IM-13 `SaveGameSnapshotContract` remains schema V1;
- frozen IM-13 `SaveGameValidationContract` remains schema V1;
- V2 validation = not implemented;
- V2 restore = not implemented;
- browser storage / Save / Continue lifecycle = not implemented;
- no derived-state persistence;
- no IM-20C+ capability.

Implementation:
- `src/savegame/post-im13-authoritative-snapshot-integration.js`
- `src/dev/im-20b-self-test.js`
- `src/dev/im-20b-self-test.node.js`

Implementation head `d04acc61f7bfca07b23c912f16fad1edf40038a4` passed the complete predecessor regression plus IM-20B self-test in CI `34702294625` with SUCCESS. Source verification confirms V2 capture only: frozen V1 Snapshot/Validation remain unchanged, V2 validation/restore are absent, and browser storage/Continue are absent.

**IM-20B = COMPLETE / FROZEN / PASS / 0 BLOCKER — Rebinding prerequisite continuity correction incorporated.**

Freeze evidence: implementation CI `34702294625` SUCCESS on `d04acc61f7bfca07b23c912f16fad1edf40038a4`; finalization CI `34702517357` SUCCESS and Pages `34702517124` SUCCESS on `e9b1df016ecf0ce64510e7f8dcafae1bbcb35993`; marker `frozen/im-20b-post-im13-authoritative-snapshot-integration` created and verified identical at freeze time.

### IM-20B – Build Identity Reconciliation / Correction

**Status:** PASS / 0 BLOCKER / FROZEN STATE CORRECTED

A post-freeze verification found stale predecessor identity surfaces even though the IM-20B SaveGame implementation itself was correct:

- `RuntimeConfig.build` still identified IM-19G;
- runtime verification text/title/surface note still identified IM-19G;
- the static `index.html` fallback still identified IM-16G;
- Safari could therefore load/display predecessor identity through stale cache keys.

Correction scope is intentionally limited to:
- `src/runtime/config.js`
- `src/main.js`
- `index.html`

Corrected visible build identity:
`IM-20B-POST-IM13-AUTHORITATIVE-SNAPSHOT-INTEGRATION-TESTBUILD-1`

Required cache invalidation was applied to the changed `main.js` entry and `RuntimeConfig` import only. Functional predecessor-specific data attributes and cache keys for unchanged modules remain untouched.

Corrected code head:
`aeebbe487429eb9889412ec36179c44a51268a1a`

Verification:
- CI `34703598385` — SUCCESS
- Pages `34703597830` — SUCCESS
- diff against the prior frozen IM-20B head contains only the three identity files above
- no SaveGame contract, capture semantics, validation, restore, browser storage, Continue lifecycle, gameplay authority or layout behavior changed.

The IM-20B frozen marker remains the authoritative ref and is fast-forwarded only after this final steering synchronization also passes exact-head verification.

### IM-20B – Snapshot Completeness Reconciliation / Correction

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

The IM-20C restore preflight found that the previously frozen IM-20B V2 snapshot did not yet contain every authoritative definition source required to reconstruct the post-IM13 runtime without guessing.

Completeness reconciliation result:

- **Resource Type Definitions — PERSIST REQUIRED**  
  `ResourceState` owns a separate authoritative definition store outside `CoreDomainStores`. V2 now captures definition state plus the real `resource-type` StableIdAllocator continuation through read-only `definitionSnapshot()` / `definitionIdSnapshot()`.

- **Housing Capabilities — PERSIST REQUIRED**  
  Building housing capacity is a separate `building-housing` capability input and is not stored in the Building DomainStore. V2 now captures `buildingId + capacity`.

- **Person Workforce Profiles — PERSIST REQUIRED**  
  Specialization/capabilities are required to rebuild workforce eligibility but are not stored in the Unit DomainStore. V2 now captures normalized Person workforce profiles.

- **Building Workforce Requirements — PERSIST REQUIRED**  
  Count/specialization/capability requirements are separate operational inputs and cannot be reconstructed from Workforce assignment state alone. V2 now captures the definition form without persisting derived OperationalAdmission.

- **Production Recipes — PERSIST REQUIRED**  
  Inputs/outputs are separate production definitions and are not stored in BuildingStock or the Building DomainStore. V2 now captures normalized production recipes.

Not duplicated:
- `EconomicConstructionRequirementContract` remains **REBUILD / DERIVE** because its authoritative quantity/reference truth already exists in persisted `ResourceDemand`.
- Building identity/lifecycle remain in `domains.buildings`.
- Person identity and Carrier data remain in `domains.units`.
- Population/Housing occupancy, workforce eligibility, production readiness and Player/Inspector projections remain derived and are not persisted as second truth.

Corrected V2 definition source boundary:
- `authoritative.definitions.resourceTypes`
- `authoritative.definitions.housingCapabilities`
- `authoritative.definitions.workforceProfiles`
- `authoritative.definitions.workforceRequirements`
- `authoritative.definitions.productionRecipes`

The frozen IM-20A inventory contract is not rewritten retroactively. IM-20B carries this explicit completeness amendment discovered by restore preflight.

Build identity for the corrected snapshot:
`IM-20B-POST-IM13-AUTHORITATIVE-SNAPSHOT-INTEGRATION-TESTBUILD-2`

Real-device evidence before this correction:
- the supplied screenshots both came from **iPhone / Safari**;
- one screenshot used reduced page zoom to make the whole development UI readable;
- they verified TESTBUILD 1 build identity only and are **not iPad evidence**.

Hard boundary remains:
- V2 capture = implemented and completeness-corrected;
- V2 validation = not implemented;
- V2 restore = not implemented;
- Derived-State Rebinding = not implemented;
- browser Save/Reload/Continue = not implemented;
- IM-20C+ = not implemented.

Correction evidence: CI `34705200714` SUCCESS and Pages `34705200407` SUCCESS on corrected head `6480d00941b688437976b5b5c88899fef79faa15`; frozen marker `frozen/im-20b-post-im13-authoritative-snapshot-integration` was fast-forwarded to that head and verified identical / 0 ahead / 0 behind.

### IM-20C – Deterministic Validation & Restore Integration

**Status:** IMPLEMENTED / NOT FROZEN

**Baseline:** corrected frozen IM-20B @ `a3a5d2f5fafa1885fea7be489ea601680c432e25`.

IM-20C adds a separate schema-V2 validation/restore layer above the frozen IM-13 V1 SaveGame contracts. The frozen V1 validator/restore remain unchanged.

Validation now covers the complete IM-20B V2 snapshot before any restore owner is committed:

- frozen V1 `capture/world/map/domains/economy.gold/pathWear` validation is reused as the base boundary;
- Resource-Type definitions and allocator continuity;
- Housing capability references/capacity;
- Person workforce profiles;
- Building workforce requirements;
- Production recipes and Resource-Type references;
- ResourceDemands / ResourceClaims structure, allocator continuity and Demand↔Claim↔Resource invariants;
- construction progress;
- local BuildingStock;
- BuildingStock transport reservations;
- Workforce assignments;
- Resident→Home assignments;
- production/Gold exactly-once settlement fences;
- cross-owner stable-ID/reference checks.

Restore is fail-closed and atomic at this contract boundary:

1. validate the entire V2 payload;
2. reject without `runtimeState` when invalid;
3. restore the frozen V1 owners into new standalone instances;
4. restore ResourceState definition state/allocator, Claims, Demands and the remaining persisted authoritative contracts;
5. expose a new `restored-post-im13-authoritative-runtime-state` only after successful preparation.

IM-20C extends the existing Owner constructors only with restore inputs following the already frozen DomainStore pattern. Normal ResourceState/ResourceClaims/ResourceDemands mutation semantics remain unchanged.

Deterministic self-test includes canonical:

`Capture A → Validate → Restore B → Capture B`

identity, Stable-ID allocator continuity, exactly-once fence recovery and fail-closed rejection of invalid cross-owner references.

Implementation:
- `src/savegame/post-im13-savegame-validation-contract.js`
- `src/savegame/post-im13-savegame-restore-integration.js`
- `src/dev/im-20c-self-test.js`
- `src/dev/im-20c-self-test.node.js`
- restore-only constructor support in `src/resources/resource-state.js`, `resource-claims.js`, `resource-demands.js`

Visible verification identity:
`IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-3`

Hard IM-20C boundary:
- V2 Validation = implemented;
- V2 Restore into new standalone authoritative owners = implemented;
- invalid payload = fail-closed before commit;
- Derived-State Rebinding = not implemented;
- restored runtime activation = not implemented;
- browser storage / Save / Reload / Continue = not implemented;
- no IM-20D+ capability.

The next permissible step is exclusively **IM-20C Completion / Regression / Freeze Gate**. IM-20D remains unauthorized until IM-20C is frozen.

### IM-20C – Verification Surface Ownership Correction

**Status:** IMPLEMENTED / DEVICE RE-TEST PENDING / NOT FROZEN

Real iPhone/Safari evidence on IM-20C TESTBUILD 1 showed a contradictory visible state:

- Inspector/Runtime build identity correctly showed `IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-1`;
- IM-20C title and explanatory text were correct;
- the shared verification output nevertheless displayed `IM-16G — FAIL · selfTest=true · buildIdentity=false`.

Root cause: frozen predecessor browser-evidence scripts still wrote directly to the shared `#test-status` surface. In particular `src/im16g-runtime-evidence.js` required the historical IM-16G build identity and overwrote the current IM-20C status. `src/im17-whole-block-runtime-evidence.js` could also race for the same visible surface.

Correction boundary:
- predecessor evidence still executes for regression/console evidence on compatible successor builds;
- IM-16G and IM-17 predecessor scripts may write `#test-status` only when they own their exact historical build;
- successor builds retain ownership of their current visible verification surface;
- no IM-20C validation/restore semantics changed;
- no Derived-State Rebinding, runtime activation, browser storage, Continue lifecycle or IM-20D+ capability added.

Corrected visible build identity:
`IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-3`

Files in this correction:
- `src/im16g-runtime-evidence.js`
- `src/im17-whole-block-runtime-evidence.js`
- `src/runtime/config.js`
- `src/main.js`
- `index.html`

The next permissible action remains exclusively **IM-20C Completion / Regression / Device / Freeze Gate**. A new real iPhone/Safari check must confirm TESTBUILD 2 and absence of the stale IM-16G visible FAIL before IM-20C may freeze.

### IM-20C – Predecessor Verification Surface Ownership Correction 2

**Status:** IMPLEMENTED / AUTOMATED REGRESSION PASS / DEVICE RE-TEST PENDING / NOT FROZEN

Real-device TESTBUILD 2 evidence removed the stale IM-16G FAIL, but exposed the same shared-surface ownership defect one layer earlier: the visible IM-20C verification card was overwritten by frozen IM-15 Inspector/Guidance modules, ending with:

`IM-15 – COMPLETE / FROZEN / PASS / 0 BLOCKER — Guidance / Inspector Whole Block ...`

Root cause:
- IM-15A Inspector Runtime Observation,
- IM-15B Structured Runtime Diagnostics,
- IM-15C World Diagnostic Overlay,
- IM-15D Controlled Diagnostic Actions,
- IM-15E / IM-15 Whole-Block Simulation Observation

all still wrote directly to shared `#test-status` whenever their controller activated.

Correction:
- all IM-15A–E predecessor capabilities continue to initialize and operate unchanged;
- they may own/write the shared visible verification surface only while the active build belongs to IM-15;
- on successor hosts such as IM-20C they remain functional but do not overwrite successor verification evidence;
- the previously corrected IM-16G and IM-17 predecessor evidence ownership rule remains in force.

No SaveGame validation/restore semantics, runtime authority, Inspector behavior, Derived-State Rebinding, activation, browser storage or Continue capability changed.

Corrected visible identity:
`IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-3`

Corrected code head:
`41dc32495fe3098fa8bb23053eea088784a80fad`

Automated evidence:
- CI `34746060489` — SUCCESS
- `Run IM-20C + frozen predecessor regression` — SUCCESS
- Pages `34746060336` — SUCCESS

Freeze remains blocked pending a new real-device TESTBUILD 3 check confirming that the IM-20C verification surface is no longer replaced by IM-15/16/17 predecessor status.

### IM-20C – Completion / Regression / Device / Freeze Gate

**Status:** PASS / 0 BLOCKER / FINAL MARKER PENDING

Final real-device evidence on **iPhone / Safari** confirms TESTBUILD 3 after both predecessor verification-surface ownership corrections:

- visible build: `IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-3`;
- title remains `IM-20C – Deterministic Validation & Restore Integration`;
- current verification card remains owned by IM-20C;
- no stale IM-15, IM-16G or IM-17 predecessor status is visible;
- Runtime = `READY`;
- Population = `3`;
- Gold = `3`;
- Housing = `3/3`;
- visible projection reports `3 Buildings / 3 Persons`.

Automated evidence on the current pre-finalization head:
- CI `34746139822` — SUCCESS;
- `Run IM-20C + frozen predecessor regression` — SUCCESS;
- Pages `34746139270` — SUCCESS.

Scope diff against frozen IM-20B is ahead-only / 0 behind and limited to IM-20C validation/restore, restore-only Owner support, IM-20C tests/CI/build identity, steering documentation, and the necessary predecessor verification-surface ownership fixes. No IM-20D+ capability is present.

Freeze evidence: final gate documentation head `a5f720ca870617e5ae611fec5ea50846588272ff` passed CI `34748598823` with the full IM-20C + frozen predecessor regression. Marker `frozen/im-20c-deterministic-validation-restore-integration` was created on that exact head and verified identical / 0 ahead / 0 behind. Real iPhone/Safari TESTBUILD 3 evidence confirms correct IM-20C visible verification ownership with READY, Population 3, Gold 3, Housing 3/3 and 3 Buildings / 3 Persons.

### IM-20B/C – Rebinding Prerequisite Continuity Correction

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

IM-20D preflight against frozen IM-20C exposed three non-derivable continuity gaps. Persisting only the previous owner state was insufficient to reconstruct these relationships without guessing:

1. workforce `assignmentId ↔ buildingId`;
2. carrier `jobId ↔ unitId`;
3. active `TransportExecutionContract` state (`TO_PICKUP / PICKED_UP / TO_DROPOFF / DELIVERED`).

The V2 persistence boundary is therefore corrected with three authoritative continuity sections:

- `authoritative.workforceBindings[]` — `workforce-building-binding { assignmentId, buildingId }`;
- `authoritative.carrierBindings[]` — `carrier-job-binding { jobId, unitId }`;
- `authoritative.transportExecutions[]` — existing `transport-execution { jobId, unitId, state }`.

Validation is fail-closed:
- every ASSIGNED workforce assignment must resolve to exactly one workforce-building binding;
- workforce bindings may not reference unknown Buildings or orphan assignment IDs;
- carrier bindings require a PENDING TransportJob and an OCCUPIED matching carrier Unit;
- one carrier Unit may not own two active job bindings;
- every OCCUPIED carrier must have a persisted job binding;
- persisted transport execution must match the same jobId↔unitId carrier binding;
- post-IM13 TransportJobs resolve claimId/demandId against V2 authoritative ResourceClaims/ResourceDemands and are revalidated through the existing TransportJobContract.

Restore behavior:
- frozen V1 SaveGame contracts remain unchanged;
- the IM-20C V2 adapter restores World/Map/Gold/Wear through the frozen V1 owner path;
- after successful V2 validation, CoreDomainStores including Jobs are restored from the original V2 snapshot with allocator continuity, avoiding the older V1-only dangling-reference interpretation for post-IM13 Claim/Demand links;
- the three new continuity arrays are restored immutable;
- no derived rebinding, activation, scheduler registration, browser storage or Continue lifecycle is introduced.

Regression evidence on code head `90931a8410cf43254193839fe893ed744c1104c8`:
- CI `34753225971` — SUCCESS;
- Pages `34753225982` — SUCCESS;
- IM-20B capture test — PASS;
- IM-20C V2 validation/restore canonical roundtrip — PASS;
- missing workforce binding, carrier/execution mismatch and execution-without-binding are rejected fail-closed;
- full frozen predecessor regression remains green.

Scope diff from prior frozen IM-20C is ahead-only / 0 behind and limited to the six SaveGame/test files required by this correction. No IM-20D+ implementation exists.

Corrected freeze evidence: steering-document head `c77840995fd7b7a06d9b14d392fe9dcd0ffda134` passed CI `34753353620`. Both existing frozen markers were fast-forwarded to that exact head and verified identical / 0 ahead / 0 behind against the Whole-Block branch.

### IM-20D – Derived-State Rebinding after Continue

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-20d-derived-state-rebinding-after-continue`

**Baseline:** corrected frozen IM-20C @ `ce84bacef4d2802f045ce522e7f7140b7b173fd8`.

IM-20D adds a fail-closed, side-effect-free rebinding seam that accepts only the exact IM-20C `RESTORED` result. It builds a candidate derived graph from the restored B owners without publishing that graph into the active Runtime.

Rebuilt state:
- construction-completion evidence and operational admission from restored Building/lifecycle/progress truth, without replaying completion effects;
- residential admission, Housing capacity/occupancy and Population from restored capabilities, Person identities and persisted Home assignments, without creating new assignments;
- operational workforce projection from persisted `assignmentId ↔ buildingId`, including exact restored Person assignment states;
- production-recipe integration and `READY` / `BLOCKED_INPUT` state from restored BuildingStock, without production settlement;
- Player Population/Housing/Gold and operational read models; Gold uses current restored balance plus the complete settlement-fence view and does not fabricate/replay a historical last settlement;
- CarrierAssignmentService state from persisted `jobId ↔ unitId`, plus exact `TransportExecutionContract` state and an explicit recovery action;
- fresh restored-B path classification, traversability, reachability, entity-validation, on-demand routing and render projections; serialized route caches remain empty;
- a deterministic scheduler registration plan and presentation/Inspector reset/read models, all marked uninstalled/unpublished.

Fail-closed boundary:
- a raw snapshot or raw runtime-state object is rejected;
- a structurally restored but semantically inconsistent derived graph is rejected with no candidate graph;
- workforce assignment, carrier assignment and transport execution identities are never guessed;
- authoritative snapshot content remains canonically unchanged across Rebind.

Visible build:
`IM-20D-DERIVED-STATE-REBINDING-AFTER-CONTINUE-TESTBUILD-1`

Local evidence:
- `npm run ci` — PASS / 0 BLOCKER;
- `node src/dev/im-20d-self-test.node.js` — PASS;
- Housing `2/2`, Population `2`, Gold `9` rebuilt from restored B;
- Workforce `assignment:00000001 ↔ building:00000002` rebound;
- Carrier `transport-job:00000001 ↔ unit:00000001` rebound;
- transport execution state `TO_DROPOFF` preserved with `CONTINUE_TO_DROPOFF` recovery action;
- canonical authoritative Capture→Restore→Rebind→Capture identity preserved;
- inconsistent workforce-on-non-operational-Building graph rejected fail-closed.

Remote implementation evidence:
- implementation head `1dea166edc10460ef17080c4b95264815a513aec` with tree `8efba31176c110dab27e102337ea121c459a6f3f`;
- CI `34767700678` — SUCCESS, including `Run IM-20D + frozen predecessor regression` — SUCCESS;
- Pages `34767700128` — SUCCESS;
- diff from corrected frozen IM-20C is ahead-only / 0 behind and limited to the 12 IM-20D implementation, test, build-identity, CI and steering-document files.

Freeze-gate evidence:
- documentation/evidence head `d1ebc1204257516709c51effcf17543befa02262` passed CI `34767886051` with the full IM-20D + frozen predecessor regression;
- real iPhone/Safari evidence confirms `READY`, exact `IM-20D-DERIVED-STATE-REBINDING-AFTER-CONTINUE-TESTBUILD-1`, the IM-20D title, Population `3`, Gold `3`, Housing `3/3`, and the lower IM-20D TESTBUILD 1 surface;
- real iPad/Safari evidence confirms `READY`, exact `IM-20D-DERIVED-STATE-REBINDING-AFTER-CONTINUE-TESTBUILD-1`, the IM-20D title, Population `3`, Gold `3`, Housing `3/3`, and the Player line `Siedlung · Bevölkerung 3 · Wohnen 3/3 · Gold 3`;
- no cache regression to IM-20C is visible on either device.

Hard boundary: no active-runtime publication, Scheduler installation, browser persistence, Save/Reload/Continue lifecycle, settlement replay/reconciliation or other IM-20E+ capability is implemented or authorized.

### IM-20E – Browser Save / Reload / Continue Lifecycle Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-20e-browser-save-reload-continue-lifecycle-integration`

**Verification-blocker correction implementation:** remote commit `75f0c779f98806785d9f26913ddff376a1b13ec6` (Pages source, normal transport continuation, atomic rollback and missing lifecycle acceptance coverage).

**Definition baseline:** frozen IM-20D @ `7758bff83164c90793dacc75d437b2d9f3d64c66` with marker `frozen/im-20d-derived-state-rebinding-after-continue`.

IM-20E connects the already frozen IM-20A–D contracts to one real browser lifecycle without creating a second SaveGame, Runtime or Scheduler authority:

`completed simulation step → canonical V2 capture → browser persistence → browser reload → V2 validation → restore → IM-20D rebinding → atomic activation → scheduler installation → Continue`.

Save boundary:
- Save capture is permitted only at a confirmed `completed-simulation-step-boundary`; no mid-step capture is valid.
- Capture and serialization use the frozen IM-20B schema-V2 integration unchanged.
- IM-20E provides exactly one stable technical same-origin `localStorage` entry. Its canonical serialized V2 payload is the only stored game-state payload; browser storage remains transport/persistence infrastructure and owns no gameplay truth.
- A failed write must not replace the previous valid entry with a partial payload.

Reload / preparation boundary:
- after a real page reload, a present payload is read and parsed, validated completely by IM-20C, restored into new standalone owners and rebound completely by IM-20D;
- the result remains an unpublished candidate until every stage succeeds;
- absence of a saved payload leaves normal baseline boot available and creates no guessed Continue state;
- malformed, unsupported or invalid payloads are rejected fail-closed and are not repaired or silently migrated.

Continue / activation boundary:
- Continue accepts only an exact IM-20D result with status `REBOUND`;
- active Runtime composition publication, IM-20D-derived presentation/read-model publication, scheduler-plan installation, camera reset and selection clear form one controlled activation transaction;
- the Runtime/Scheduler may start or resume only after that transaction succeeds;
- scheduler registrations use the deterministic IM-20D descriptors and recovery actions such as `CONTINUE_TO_PICKUP` / `CONTINUE_TO_DROPOFF`; duplicate/partial installation must reject or roll back without leaving mixed old/new registrations;
- failed parse, validation, restore, rebinding, scheduler installation or publication preserves the previous active composition, scheduler state and non-running lifecycle state.

IM-20E does not replay construction completion, production, delivery or Gold settlement effects and does not invent missing Workforce, Carrier or TransportExecution identity. It may expose only the minimum technical Save/Continue access required for automated and browser integration verification; this is not a final player Save menu or responsive UI redesign.

Acceptance boundary:
- canonical V2 Save at an exact completed-step boundary;
- persistence across a real browser reload;
- full `validate → restore → rebind` completion before publication;
- atomic active-owner/presentation publication and scheduler installation before Runtime start;
- preserved `assignmentId ↔ buildingId`, `jobId ↔ unitId` and TransportExecution continuity;
- camera/selection/transient caches are reset or rebuilt rather than persisted;
- invalid/corrupt/unsupported storage and every activation-stage failure remain fail-closed with no partial publication;
- canonical Capture-before-Save versus Capture-after-Continue identity;
- full IM-20D and frozen predecessor regression remains green;
- no IM-20F+ capability is present.

Hard IM-20E / IM-20F boundary: IM-20E may execute only the unambiguous normal continuation actions already determined by IM-20D. Crash-window settlement reconciliation, additional exactly-once/recovery fences, ambiguous-state repair, replay reconciliation and new recovery decisions remain exclusively IM-20F and are not implemented or authorized here.

Explicit non-scope remains: multi-slot Save UI, cloud save, multiplayer synchronization, autosave, legacy-main save migration, final Save-menu/wireframe or responsive Game-UI redesign, new Economy capability, Inspector system graph, IM-20F Exactly-once & Recovery Reconciliation and IM-20G Player/Device Verification.

Completion / evidence / freeze gate:
- verified implementation/evidence head `991cc28e3c5146e7dada0093569ecc7801b01572` passed the full local IM-20E and frozen-predecessor regression with 0 blockers;
- manually started exact-head CI run `35200717289` completed SUCCESS; rerun job `105157412546` completed every relevant setup, checkout and `Run IM-20E + frozen predecessor regression` step successfully;
- exact-head Pages run `35200717307` completed SUCCESS and the live Pages source exposed `IM-20E-BROWSER-SAVE-RELOAD-CONTINUE-LIFECYCLE-INTEGRATION-TESTBUILD-2`;
- freeze-documentation head `1d0523da21329b0293bef879d22e1c9ab4a4fb11` passed CI `35211582967` and Pages `35211582955`, both SUCCESS;
- branch comparison against frozen IM-20D `7758bff83164c90793dacc75d437b2d9f3d64c66` is ahead-only / 0 behind and limited to the authorized IM-20E lifecycle, storage, activation/rollback, scheduler, transport-continuation, verification, build-identity, CI/Pages and steering-document scope;
- the four prior verification blockers are corrected: branch-bound Pages deployment, normal transport continuation through completion, atomic composition/presentation rollback, and lifecycle acceptance coverage;
- no IM-20F exactly-once/recovery reconciliation, ambiguous-state repair, replay reconciliation or other IM-20F+ capability is present.

### IM-20F – Exactly-once & Recovery Reconciliation

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Definition baseline:** frozen IM-20E @ `84945407ef40cfc31fe4dc56f11823e591e9fac2` with marker `frozen/im-20e-browser-save-reload-continue-lifecycle-integration`.

IM-20F owns only deterministic reconciliation of persisted crash-window states that IM-20E deliberately leaves unresolved. The existing normal continuation actions remain frozen. In particular, an execution restored as `DELIVERED` remains blocked behind `AWAIT_IM20F_COMPLETION_RECONCILIATION` until IM-20F classifies the complete authoritative state without replay or guessing.

Transport recovery decision boundary:
- `DELIVERED + Claim ACTIVE + Job PENDING + matching active Carrier binding` means delivery settlement has not yet become effective; IM-20F may apply it once and then complete the Job and release the Carrier;
- `DELIVERED + Claim CONSUMED + Job PENDING + matching active Carrier binding` means settlement is already effective; IM-20F must not settle again and may only finish Job completion and Carrier release;
- a canonically completed terminal Job with already consumed Claim is acknowledged as complete with no repeated effect;
- contradictory identity, Claim/Demand/Resource, Job, execution, Carrier state or binding combinations reject fail-closed and are never silently repaired.

Terminal continuity must define one canonical persisted outcome for `carrierBinding`, `transportExecution`, Scheduler registration and Carrier `OCCUPIED → AVAILABLE` release. The current V2 validation rule requiring every persisted TransportExecution to have a matching Carrier binding may not be weakened ambiguously; terminal cleanup versus terminal evidence retention must be made explicit and deterministic.

Production and Gold exactly-once boundary:
- BuildingStock input/output mutation and its `productionSettlementId` fence form one logical effect; stock/fence mismatch must not replay production and must reject unless a deterministic authorized reconciliation exists;
- Gold balance mutation and its `goldSettlementId` fence form one logical effect; balance/fence mismatch must not apply income twice and must reject unless a deterministic authorized reconciliation exists;
- restored construction completion remains evidence-only and must never replay completion side effects.

Authority boundary:
- ResourceState, ResourceClaims and ResourceDemands retain resource settlement authority;
- TransportJob and CarrierAssignment owners retain Job/Carrier lifecycle authority;
- BuildingStock remains production inventory authority and GoldEconomyOwner remains Gold authority;
- persisted settlement fences remain exactly-once evidence;
- IM-20F may classify and execute only a uniquely determined missing transition. It creates no second gameplay authority, invents no identity and performs no heuristic repair.

Required future acceptance coverage:
- crash before delivery settlement;
- crash after settlement but before Job completion;
- crash after Job completion but before terminal Carrier/binding cleanup;
- already complete terminal state is a no-op;
- duplicate transport, production or Gold settlement identity produces no second effect;
- production stock/fence mismatch, Gold balance/fence mismatch and contradictory transport states reject fail-closed;
- canonical `Capture → Restore → Reconcile → Continue → Capture` continuity;
- full IM-20A–E and frozen predecessor regression remains green.

Implementation status: IM-20F is COMPLETE / FROZEN / PASS / 0 BLOCKER. The final verified code head is `cac2b1cd0fa009e06538473f8da9e2f8e682a5d4`. Completion/freeze evidence: CI #5657 passed the complete IM-20F + frozen-predecessor regression on that code head; Completion Evidence documentation parent `3ab6edfc46728b6860f87acf8f1afd0020b1c360` passed CI #5658; the subsequent head `1d68d47676c6f0c9616de942f86cb134b8ad4b36` changed only `docs/ROADMAP_CURRENT.md`, which is excluded from the CI push path filter, so no new CI was triggered by design while exact-head Whole-Block Pages #18 and dynamic Pages #7497 both passed. Real iPad/Safari evidence confirms the IM-20F TESTBUILD 1 surface and Save → Reload → Continue lifecycle. Verification found no remaining Post-Recovery-Rebind blocker. No IM-20G+ capability is authorized.


### IM-20G – Save/Continue Player & Device Verification

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Definition baseline:** frozen IM-20F @ `eebf74a422b3277a10632b162cc2c7c471d65e50` with marker `frozen/im-20f-exactly-once-recovery-reconciliation`.

IM-20G owns verification of the complete player-facing Save/Continue lifecycle on real target devices. It introduces no new SaveGame capability. The verification flow is: establish real gameplay state → Save → real browser/page reload → detect persisted state → Continue → verify continuation of the same authoritative state → Save again. Existing IM-20A–F exactly-once/recovery guarantees remain frozen and must be exercised, not redesigned.

Required device scope includes iPhone / iOS Safari and iPad / iPadOS Safari; Desktop/browser may provide supplementary regression evidence. Visible build identity and the actually tested branch/build must be unambiguous. Existing valid real-device evidence from IM-20E/F may be reused where it proves the exact required contract; evidence must not be repeated artificially. Remaining device evidence, especially iPhone coverage, must be identified before completion.

If device verification exposes a real defect, that defect must first be reconciled and separately authorized; IM-20G must not silently expand into new functionality.

Explicit non-scope: multi-slot Save UI, cloud save, autosave, legacy `main` save migration, responsive Game-UI redesign, new Economy/Transport/Recovery capability, Inspector system graph, or any IM-20H+ capability.

**Completion evidence:** implementation/verification head `e66de4c920cc448c0cc213bd583fb0f01574ddbd` is ahead-only against frozen IM-20F and remains within the authorized verification-first product scope. Exact-head CI `CI Baseline #5671` completed SUCCESS. Controlled Pages deployment `Deploy Authoritative Development Testbuild to Pages #26` completed SUCCESS from `feature/im-20g-save-continue-player-device-verification`, and the live device surface exposed exact build identity `IM-20G-SAVE-CONTINUE-PLAYER-DEVICE-VERIFICATION-TESTBUILD-1`. Real iPhone/iOS Safari video evidence confirms Start → Pause → Save V2 → real page reload → Continue on that exact build; the Save evidence visibly records V2 at step 53. Existing valid iPad/iPadOS Safari evidence from IM-20E/F is reused for the frozen underlying Save/Reload/Continue contract, so no duplicate iPad execution is required for this verification-only block. The reduced Safari page zoom required to make the current technical surface usable on iPhone is NON-BLOCKING / OUT OF SCOPE and belongs to later responsive Player-UI work. No new SaveGame semantics were introduced.

**IM-20G Completion / Evidence Gate: PASS / 0 BLOCKER / FROZEN.**

### Remaining defined substeps

- **IM-20B – Post-IM13 Authoritative Snapshot Integration — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20C – Deterministic Validation & Restore Integration — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20D – Derived-State Rebinding after Continue — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20E – Browser Save / Reload / Continue Lifecycle Integration — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20F – Exactly-once & Recovery Reconciliation — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20G – Save/Continue Player & Device Verification — COMPLETE / FROZEN / PASS / 0 BLOCKER**

### IM-20 explicit non-scope

No multi-slot SaveGame menu, cloud save, multiplayer synchronization, autosave system, legacy `main` save migration, final responsive Game-UI/wireframe redesign, new Economy capability or Inspector Clean-Runtime system graph.

Responsive Game UI remains a later dedicated scope with separate iPhone, iPad and Desktop layout planning.

### IM-20A current gate

Implementation head `e1cc7e94f84d2ba9bf666aece318366c7a90f00f` passed the complete predecessor regression plus IM-20A self-test in CI `34700519373` with SUCCESS. Source verification confirms target schema V2 remains `DEFINED_NOT_ACTIVE`, active snapshot/validation stay on V1, and no capture/restore/browser-storage implementation was introduced.

**IM-20A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Freeze evidence includes implementation CI `34700519373`, finalization CI `34700971956`, exact-head regression PASS and the frozen marker `frozen/im-20a-persistent-state-inventory-savegame-schema-contract`. The marker is the authoritative frozen ref for IM-20A.

## 7. Current gate

**IM-18 = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19 = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19C = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19D = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19F = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19G = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20 = COMPLETE / PASS / 0 BLOCKER — WHOLE-BLOCK FREEZE PENDING.**

**IM-20A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20C = COMPLETE / FROZEN / PASS / 0 BLOCKER — Rebinding prerequisite continuity correction incorporated.**

**IM-20D = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20F = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20G = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The IM-20F freeze is final. IM-20G implementation and real-device verification are complete and frozen at `1d1846ffd0faa7f00df94681474e72e2f390fb78` with marker `frozen/im-20g-save-continue-player-device-verification`; no further IM-20G product change is authorized.

## 8. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-19 — IM-20F COMPLETE / FROZEN / PASS / 0 BLOCKER. Freeze evidence records final verified code head `cac2b1cd0fa009e06538473f8da9e2f8e682a5d4`, CI #5657, documentation-parent CI #5658, exact-head Pages #18/#7497, and real iPad/Safari evidence. IM-20G is COMPLETE / FROZEN / PASS / 0 BLOCKER at `1d1846ffd0faa7f00df94681474e72e2f390fb78`; no further IM-20G implementation is authorized.

## Repository Workflow Authority / CI-Pages Unification

**Status:** IMPLEMENTED / VERIFIED

The new-development workflow authority is independent from legacy `main`. Legacy `main` remains historical old-game reference and its legacy workflow is not migrated, replaced or deleted by this contract.

- CI push authority covers `feature/**`; block-specific branch hardcoding in CI is not permitted.
- CI-relevant paths include runtime/source/tool/package/index changes, both workflow files, and both steering files `docs/DEVELOPMENT_WORKFLOW_CURRENT.md` and `docs/ROADMAP_CURRENT.md`.
- `workflow_dispatch` remains the controlled exact-head fallback.
- CI evidence belongs to the exact tested commit SHA.
- Automatic Pages deployment is restricted to Whole-Block-style CR/IM branches matching `feature/cr-[0-9][0-9]-*` or `feature/im-[0-9][0-9]-*`. Letter-suffixed sub-block / verification branches such as IM-20G do not auto-deploy and therefore cannot overwrite the shared live testbuild merely by push.
- Pages `workflow_dispatch` remains the explicit verification-head deployment route. Pages evidence must be attributable to the exact deployed SHA.
- The active authoritative Whole-Block/testbuild line is a steering decision; changing an IM/CR sub-block must not require rewriting workflow branch names.
- IM-20G remains paused at pre-unification head `422568b03b38704acc4e4fe3e8f154729476219f` until this workflow-only/documentation head passes the separate scope/exact-head verification gate. No device evidence or freeze is authorized by this implementation.



### IM-20 Whole-Block Completion

**Status:** COMPLETE / PASS / 0 BLOCKER — WHOLE-BLOCK FREEZE PENDING

IM-20A through IM-20G form the complete defined Authoritative SaveGame / Continue Integration chain. IM-20G is frozen at `1d1846ffd0faa7f00df94681474e72e2f390fb78` with marker `frozen/im-20g-save-continue-player-device-verification`. No IM-20H capability is required or defined. The IM-20 Whole-Block question is satisfied by the frozen A–G chain. Multi-slot SaveGame UI, cloud save, autosave, legacy `main` save migration, final responsive Game-UI/wireframe redesign, further Economy capability and the Inspector Clean-Runtime system graph remain outside IM-20. No further IM-20 product change is authorized by this documentation finalization. A separate Whole-Block verification / freeze gate is required before creation of an IM-20 Whole-Block frozen marker.
