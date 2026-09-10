# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-17 IN PROGRESS; IM-17A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-17B–G DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-17-economic-construction-integration`  
**Frozen IM-16 Whole-Block head:** `99b0e7d001b7a4f175727cf8e304dde0928c730b`  
**Frozen IM-16 Whole-Block marker:** `frozen/im-16-player-construction-placement-integration`  
**Frozen IM-17A head:** `6caf6132864e71201dee6b9a286c111f67fce016`  
**Frozen IM-17A marker:** `frozen/im-17a-player-construction-runtime-admission-contract`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14, IM-15, IM-16 and IM-17A remain **COMPLETE / FROZEN / PASS / 0 BLOCKER** where applicable.

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.
Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

Frozen IM-16B marker: `frozen/im-16b-player-placement-interaction-state-world-target-contract`.
Frozen IM-16B head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

Frozen IM-16C marker: `frozen/im-16c-player-placement-preview-validity-projection-contract`.
Frozen IM-16C head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

Frozen IM-16D marker: `frozen/im-16d-authoritative-placement-commit-building-registration-contract`.
Frozen IM-16D head: `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

Frozen IM-16E marker: `frozen/im-16e-player-placement-confirm-cancel-interaction-contract`.
Frozen IM-16E head: `a943ac93554e32a8909be2d44ae2d327dd044d58`.

Frozen IM-16F marker: `frozen/im-16f-player-building-selection-placement-activation-contract`.
Frozen IM-16F head: `0cf69a9253b4ec503f9f1c5b8585721722851963`.

Frozen IM-16G marker: `frozen/im-16g-authoritative-construction-result-player-ui-projection-contract`.
Frozen IM-16G head: `9022b7934e885950af8d8a3559cbecdd41a2da63`.

Frozen IM-16 Whole-Block marker: `frozen/im-16-player-construction-placement-integration`.
Frozen IM-16 Whole-Block head and exclusive IM-17 baseline: `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

Frozen IM-17A marker: `frozen/im-17a-player-construction-runtime-admission-contract`.
Frozen IM-17A head and exclusive IM-17B baseline: `6caf6132864e71201dee6b9a286c111f67fce016`.

## 2. Binding ownership after IM-17A

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for current supported outcomes.
- Frozen IM-16B/C retain temporary placement-state/world-target and preview ownership.
- Frozen IM-16D retains authoritative Building commit/registration authority through existing Building identity/lifecycle/store ownership and `BuildingRegistrationWorldOwnership`.
- Frozen IM-16E/F/G retain Confirm/Cancel, Building selection/activation and actual commit-result Player projection ownership.
- Frozen IM-17A owns only the economic-construction admission decision after a real frozen-IM-16 authoritative commit result.
- IM-17A admits economic construction only for `COMMITTED + RUNNING` and rejects non-running Runtime states without undoing or modifying frozen IM-16 Building registration.
- IM-17A owns no economic requirement, Resource/Demand truth, reservation, material logistics, BuildingStock settlement, construction progress or completion.
- Runtime/Render remains owner of visible world projection; Inspector remains observation/guidance only.
- Legacy `main` gameplay/UI architecture remains excluded as an implementation basis.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen Whole-Block head:** `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Frozen marker:** `frozen/im-16-player-construction-placement-integration`.

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actual authoritative result back into Player UI. Frozen IM-16A through IM-16G fully cover that target flow.

## 4. Post-IM-16 Capability Reconciliation Result

The shortest route toward the first closed playable economic construction loop is:

`frozen IM-16 Player placement/commit → Runtime admission → economic construction requirement → construction initialization → existing logistics/material delivery → construction progress → completion → Player state projection`.

Existing Building Construction state/progress/completion, Resource/Demand/Reservation/Claim, Transport/BuildingStock and Runtime ownership must be reused rather than duplicated. Workforce, regular production and broader catalogue/placement capability remain downstream of this first integration block.

Runtime-State Gating is not a separate large Whole Block. It is IM-17A.

## 5. IM-17 – Economic Construction Integration

**Status:** IN PROGRESS

**Definition baseline:** frozen IM-16 @ `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Whole-Block development branch:** `feature/im-17-economic-construction-integration`.

### Whole-Block objective

`How does a successfully and authoritatively placed Player Building become an economically effective construction site with real material demand, existing logistics and controlled completion without duplicating existing Building, Resource, Demand, Transport, BuildingStock or Runtime authority?`

### IM-17A – Player Construction Runtime Admission Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16 @ `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Frozen head:** `6caf6132864e71201dee6b9a286c111f67fce016`.

**Frozen marker:** `frozen/im-17a-player-construction-runtime-admission-contract`.

Frozen IM-17A consumes only the actual frozen-IM-16 authoritative placement commit result plus authoritative Runtime state. Economic construction is admitted only for `COMMITTED + RUNNING`. `READY`, `PAUSED`, `CREATED`, `BOOTING` and `STOPPED` reject admission with `RUNTIME_NOT_RUNNING`; an already rejected placement result is never admitted. The contract does not retroactively alter or undo frozen IM-16 Building registration.

CI run `34394606222` on `6caf6132864e71201dee6b9a286c111f67fce016` completed **SUCCESS**, including `Run IM-17A + frozen predecessor regression`.

Fresh real iPad/Safari evidence confirms the exact visible build identity, `READY → RUNNING`, successful real placement/authoritative commit while `RUNNING`, and `RUNNING → PAUSED`. This evidence is accepted for IM-17A.

### NON-BLOCKING UI/Render follow-up

The same real-device evidence shows existing world-canvas labels/annotations can extend awkwardly beyond the intended object/preview anchor, notably `HQ · VALID` and long `building:*` labels. This is recorded as a **NON-BLOCKING later UI/Render follow-up**. A bounded future label/annotation projection rule may address anchor, offset and viewport-edge clamping. This is not placement-validity or Runtime-admission truth and was not modified in IM-17A.

### IM-17B – Economic Construction Requirement Contract

**Status:** DEFINED / NOT IMPLEMENTED

Define the authoritative economic requirement of a placed Building using existing Resource/Demand identities tied to the stable `buildingId`, including required quantity, reserved/fulfilled quantity and remaining need. No transport execution or progress. No second resource, demand, cost or inventory truth.

### IM-17C – Player Placement → Construction Initialization Integration

**Status:** DEFINED / NOT IMPLEMENTED

Connect an admitted successful frozen-IM-16 commit to existing Building Construction state using the same stable `buildingId`, initialized as `PENDING`. Do not create a second construction-site Building identity or alter frozen IM-16 authority.

### IM-17D – Construction Demand → Existing Logistics Integration

**Status:** DEFINED / NOT IMPLEMENTED

Connect construction demand to existing Reservation/Claim/Transport/BuildingStock boundaries. Only authoritative available resources may be reserved and delivered. No second construction-material logistics subsystem and no routing/movement rewrite.

### IM-17E – Delivered Material → Construction Progress Settlement

**Status:** DEFINED / NOT IMPLEMENTED

Translate only authoritative delivered/settled construction material into deterministic existing Building Construction Progress. Progress remains monotonic `0…1`; `PENDING`, `IN_PROGRESS` and `COMPLETED` semantics remain authoritative. No workforce or production integration.

### IM-17F – Construction Completion Integration

**Status:** DEFINED / NOT IMPLEMENTED

Use the existing Building Construction Completion boundary so completion becomes effective exactly once when authoritative completion conditions are satisfied. Preserve stable Building identity and existing lifecycle ownership. No worker assignment or production start.

### IM-17G – Player Construction State Projection

**Status:** DEFINED / NOT IMPLEMENTED

Project only actual authoritative economic construction state back into Player UI, such as waiting for material, under construction, progress and completed. UI owns no admission, demand, resource, delivery, progress or completion truth.

### IM-17 Whole-Block exclusions

No regular workforce assignment, regular production operation, broad Building catalogue authority, general Gold construction-price system, demolition, upgrades, rotation, multi-cell footprints, new terrain/distance placement rules, SaveGame rearchitecture, Inspector mutation/editor authority or legacy `main` gameplay/UI reuse belongs to IM-17.

## 6. IM-17A Completion / Regression / Freeze Gate

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Full diff frozen IM-16 `99b0e7d001b7a4f175727cf8e304dde0928c730b` → frozen IM-17A `6caf6132864e71201dee6b9a286c111f67fce016` was verified as **1 commit ahead / 0 behind**, merge-base exactly frozen IM-16. Changed scope is limited to the IM-17A Runtime-admission contract, focused self-test/Node/evidence, visible build identity/runtime entry surface and CI regression integration. There is no IM-17B Resource/Demand/cost/logistics/progress/completion implementation.

CI run `34394606222` completed **SUCCESS**. Fresh real iPad/Safari evidence is accepted. Frozen marker `frozen/im-17a-player-construction-runtime-admission-contract` resolves to the exact frozen head `6caf6132864e71201dee6b9a286c111f67fce016`.

The world-label/annotation positioning issue is explicitly retained as NON-BLOCKING follow-up and is outside the frozen IM-17A scope.

## 7. Current gate

**IM-17 – Economic Construction Integration = IN PROGRESS.**

**IM-17A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**Frozen IM-17A head = `6caf6132864e71201dee6b9a286c111f67fce016`.**

**IM-17B through IM-17G = DEFINED / NOT IMPLEMENTED.**

No IM-17B functionality was introduced by the IM-17A gate.

---

**Updated:** 2026-09-10 — IM-17A frozen PASS / 0 BLOCKER at `6caf6132864e71201dee6b9a286c111f67fce016`; real iPad evidence accepted; world label/annotation positioning recorded as NON-BLOCKING UI/Render follow-up; IM-17B through IM-17G remain DEFINED / NOT IMPLEMENTED.