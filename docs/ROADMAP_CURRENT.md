# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-27A technical preparation  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-27-game-facing-logistics-integration-foundation`  
**Frozen gameplay baseline:** **CR-26 – Workforce Capability & Job Eligibility Foundation**

## 1. Current frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

The whole CR-26 frozen marker is:

`frozen/cr-26-workforce-capability-job-eligibility-foundation`

CR-27 starts from frozen CR-26 HEAD `8b06aa4a14793628c608a7fcf822cb9576bbf5b5`.

## 2. Accepted next system block

# CR-27 – Game-Facing Logistics Integration Foundation

Purpose: connect the frozen game-facing owners to the already existing transport runtime instead of building a second logistics/pathfinding stack.

System chain:

`CR-25 BuildingStock → Logistics Intent/Reservation → CR-26 Workforce → existing transport runtime → Delivery → CR-25 BuildingStock`

### CR-27A – BuildingStock Transport Intent & Reservation Bridge

Create a game-facing transport intent between stable Buildings for one resource type and amount. Reserve source availability separately from CR-25 physical stock mutation so the same quantity cannot be committed twice. No Carrier, Person, TransportJob, movement or destination settlement yet.

### CR-27B – Workforce-Aware Transport Dispatch Integration

Later bridge an accepted intent into the existing transport runtime and use frozen CR-26 as the authoritative workforce eligibility/assignment owner. Required capability: `CAN_SIMPLE_TRANSPORT`. Existing `CarrierContract AVAILABLE/OCCUPIED` must not become a second gameplay availability truth.

### CR-27C – Delivered Transport → BuildingStock Settlement

Later use confirmed delivery evidence to settle source/target BuildingStock exactly once, close the intent/reservation and release the temporary workforce assignment.

After A/B/C, run a whole **CR-27 Completion / Regression / Freeze Gate**.

## 3. Current active sub-block

**CR-27A – BuildingStock Transport Intent & Reservation Bridge**  
Status: **TECHNICAL PREPARATION / NOT IMPLEMENTED / NOT FROZEN**

Required properties:

- source and target are stable `building:` IDs,
- resource is a stable `resource-type:` ID,
- amount is a positive safe integer,
- reservation never mutates frozen CR-25 stock merely by being created,
- active reserved quantity for a source Building/resource type can never exceed its supplied BuildingStock quantity,
- multiple reservations for the same source/resource are accounted deterministically,
- ended reservations stop blocking availability,
- immutable inputs and deterministic results,
- direct tests plus browser Verification / Freeze Gate.

## 4. CR-27 global non-scope

No new pathfinding, routes, traffic algorithms, reservation traffic semantics, deadlock logic, Carrier AI, production timing, construction work, job prioritization/scoring, graphics, Inspector, balancing or SaveGame ownership.

CR-27 integrates existing owners; it does not replace frozen CR-25/CR-26 or rebuild the mature `src/transport/*` foundation.

## 5. Branch / gate policy

- One CR-27 development branch: `feature/cr-27-game-facing-logistics-integration-foundation`.
- A/B/C proceed sequentially on that branch.
- Each sub-block gets direct tests and a browser Verification / Freeze Gate.
- Only PASS / 0 BLOCKER may create its immutable frozen marker.
- Frozen sub-block markers do not become the GitHub Pages development source; Pages remains on the active CR-27 branch during the whole CR-27 cycle.
- Whole CR-27 becomes FROZEN only after the final combined regression/invariant/scope gate passes.

---

**Updated:** 2026-09-06 after explicit acceptance of CR-27 and creation of its development branch from the frozen CR-26 baseline.
