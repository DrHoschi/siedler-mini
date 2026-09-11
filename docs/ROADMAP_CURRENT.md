# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-17 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-18A–G DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current steering/documentation branch:** `feature/im-17-economic-construction-integration`  
**Frozen IM-17 Whole-Block head / exclusive IM-18 baseline:** `53de400c2ffe57addf832b599b906b3d5b473385`  
**Frozen IM-17 Whole-Block marker:** `frozen/im-17-economic-construction-integration`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14, IM-15, IM-16 and IM-17 are **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen IM-17 substeps:

- IM-17A – Player Construction Runtime Admission Contract @ `6caf6132864e71201dee6b9a286c111f67fce016`
- IM-17B – Economic Construction Requirement Contract @ `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`
- IM-17C – Player Placement → Construction Initialization Integration @ `c30d2d7a88f7f16b2cf73e1d2b85cec867dcea40`
- IM-17D – Construction Demand → Existing Logistics Integration @ `1c728ab4ce051abff33dda17c9e3ef40cb7c9f4c`
- IM-17E – Delivered Material → Construction Progress Settlement @ `b46e061b185915b805332b252033fe33de9dfe74`
- IM-17F – Construction Completion Integration @ `a4254cacb9dd89f54950a7d0d4125f2c9827b531`
- IM-17G – Player Construction State Projection @ `a6e32ac19dade82e01fdbfc7c3c4e9cad557c871`

Frozen IM-17 Whole Block:

- head `53de400c2ffe57addf832b599b906b3d5b473385`
- marker `frozen/im-17-economic-construction-integration`
- exact-head CI Baseline run `34580257709`: **SUCCESS**
- exact-head Pages run `34580256994`: **SUCCESS**

The former `FINAL MARKER PENDING` wording is obsolete. Repository state proves IM-17 is fully frozen.

## 2. Binding ownership after frozen IM-17

- Frozen IM-16 remains the Player selection / placement / validity / explicit Confirm-Cancel / authoritative Building registration / result-projection authority.
- Existing Runtime remains Runtime-state authority. Frozen IM-17A only decides economic-construction admission and requires `COMMITTED + RUNNING`.
- Existing `ResourceDemands` and Resource Claims remain demand/reservation/fulfillment authority.
- Existing Building Construction state/progress/completion contracts remain construction truth.
- Existing Resource Matching, Resource Assignment, BuildingStock transport reservation, TransportJob and delivery settlement boundaries remain logistics authority.
- BuildingStock transport reservations and Resource Claim reservations remain distinct authorities.
- Building lifecycle `EXISTS/RETIRED` remains distinct from Building Construction state `PENDING/IN_PROGRESS/COMPLETED`.
- Frozen IM-17G is read-only Player UI projection and creates no gameplay truth.
- Existing workforce/person identities, BuildingStock/resource mutation boundaries and any already-existing production contracts must be reconciled and reused by IM-18 rather than duplicated.
- Frozen IM-15 Inspector remains observation/guidance except its already frozen diagnostic action allowlist.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 3. Frozen IM-17 – Economic Construction Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen Whole-Block head:** `53de400c2ffe57addf832b599b906b3d5b473385`

**Frozen marker:** `frozen/im-17-economic-construction-integration`

Implemented target flow:

`frozen IM-16 placement/commit → Runtime admission → economic construction requirement → construction initialization → existing logistics/material delivery → authoritative progress settlement → exactly-once completion → Player construction-state projection`

IM-17 stops deliberately at authoritative completed construction. Regular workforce assignment and regular production operation were explicitly excluded and therefore form the next major gameplay/economy capability gap.

## 4. IM-18 – Operational Building / Workforce / Production Integration

**Status:** DEFINED / NOT IMPLEMENTED

**Definition baseline:** frozen IM-17 @ `53de400c2ffe57addf832b599b906b3d5b473385`.

**Development branch:** NOT CREATED.

### Whole-Block objective

IM-18 answers:

`How does an authoritatively completed Building become operational, receive eligible existing workforce and execute deterministic production through existing BuildingStock/resource boundaries without introducing a second Building, Workforce, Production, Resource, Inventory or Runtime authority?`

Planned binding flow:

`frozen IM-17 completed Building → operational admission → workforce requirement/eligibility → deterministic workforce assignment → production requirement/recipe integration → operational production execution → authoritative input consumption/output settlement → read-only Player operational-state projection`

### IM-18A – Operational Building Admission Contract

**Status:** DEFINED / NOT IMPLEMENTED

A completed Building may become economically operational only through a controlled admission boundary after authoritative frozen-IM-17 completion. Define operational admissibility/state only. No workforce assignment and no production execution yet.

### IM-18B – Workforce Requirement / Eligibility Contract

**Status:** DEFINED / NOT IMPLEMENTED

Define which operational Building requires how much or what class of existing workforce and which existing persons/workers are eligible. Existing workforce/person identity and ownership remain authoritative. No assignment and no production yet.

### IM-18C – Deterministic Workforce Assignment Integration

**Status:** DEFINED / NOT IMPLEMENTED

Connect eligible existing workforce deterministically to an admitted operational Building. Prevent double assignment and preserve existing workforce authority. No production execution in this substep.

### IM-18D – Production Requirement / Recipe Integration

**Status:** DEFINED / NOT IMPLEMENTED

Bind an operational Building to deterministic production requirements/recipes using existing resource definitions and BuildingStock boundaries. Inputs, outputs and quantities must not create a parallel resource, recipe or inventory truth.

### IM-18E – Operational Production Execution

**Status:** DEFINED / NOT IMPLEMENTED

Execute production only when the Building is operational, required workforce is validly assigned and required authoritative inputs are available. Production must remain deterministic and must not manufacture output without valid prerequisites.

### IM-18F – Input Consumption / Output Settlement

**Status:** DEFINED / NOT IMPLEMENTED

Authoritatively consume production inputs and settle produced outputs through existing BuildingStock/resource mutation boundaries. Prevent negative stock, double consumption and double output settlement.

### IM-18G – Player Operational State Projection

**Status:** DEFINED / NOT IMPLEMENTED

Project only real authoritative operational state into Player UI. Candidate visible states include no worker, waiting for input, producing and output blocked where supported by authoritative runtime data. UI owns no operational, workforce or production truth.

## 5. IM-18 Whole-Block exclusions

IM-18 does not include broad Building catalogue authority, demolition, upgrades, rotation, multi-cell footprints, new terrain/distance placement rules, new pathfinding/movement authority, SaveGame rearchitecture, Inspector editor authority, general Gold construction-price redesign, general UI redesign or legacy `main` gameplay/UI reuse.

Any missing underlying workforce or production primitive discovered during reconciliation must be treated as an explicit dependency gap and resolved through the existing authority model; it must not silently create a parallel subsystem.

## 6. Deferred Player UI / Mobile Consolidation

The iPhone/iPad readability and density problem remains a real, explicitly deferred follow-up need and is not lost by scheduling IM-18 first.

Known follow-up scope includes:

- narrow-phone verification/Inspector overlays becoming difficult to read,
- accumulated controls competing for limited mobile/tablet viewport space,
- known world-label/annotation positioning/readability issue,
- prioritization of normal gameplay controls over diagnostics,
- contextual/collapsible secondary controls,
- Inspector/diagnostics separated from normal Player play where appropriate,
- responsive iPhone / iPad / Desktop behavior,
- permanent visible-build-identity synchronization.

This consolidation is intentionally sequenced **after IM-18**, because workforce and production add important final gameplay states that the Player surface must represent. The follow-up block has no assigned IM identifier yet and is not authorized for implementation.

## 7. Current gate

**Frozen baseline:** IM-17 @ `53de400c2ffe57addf832b599b906b3d5b473385`.

**IM-18 = DEFINED / NOT IMPLEMENTED.**

**IM-18A through IM-18G = DEFINED / NOT IMPLEMENTED.**

The current action is steering-documentation reconciliation only. No IM-18 development branch and no IM-18 implementation have been authorized by this update.

After this documentation change is verified clean, the next permissible development action is exclusively the separate creation of the IM-18 Whole-Block development branch exactly from frozen IM-17 `53de400c2ffe57addf832b599b906b3d5b473385`. No IM-18A implementation may occur in the same step.

## 8. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-11 — Actual repository state reconciled: IM-17 Whole Block COMPLETE / FROZEN / PASS / 0 BLOCKER at `53de400c2ffe57addf832b599b906b3d5b473385`; IM-18 Operational Building / Workforce / Production Integration with A–G defined against that frozen baseline; Player UI / Mobile Consolidation retained explicitly as the next planned follow-up after IM-18.