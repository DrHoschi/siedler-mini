# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-17A–G COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-17 WHOLE-BLOCK FINALIZATION / FINAL MARKER PENDING  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-17-economic-construction-integration`  
**Frozen IM-16 Whole-Block head:** `99b0e7d001b7a4f175727cf8e304dde0928c730b`  
**Frozen IM-16 Whole-Block marker:** `frozen/im-16-player-construction-placement-integration`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14, IM-15 and IM-16 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-17 substeps are also individually frozen:

- IM-17A – Player Construction Runtime Admission Contract @ `6caf6132864e71201dee6b9a286c111f67fce016`
- IM-17B – Economic Construction Requirement Contract @ `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`
- IM-17C – Player Placement → Construction Initialization Integration @ `c30d2d7a88f7f16b2cf73e1d2b85cec867dcea40`
- IM-17D – Construction Demand → Existing Logistics Integration @ `1c728ab4ce051abff33dda17c9e3ef40cb7c9f4c`
- IM-17E – Delivered Material → Construction Progress Settlement @ `b46e061b185915b805332b252033fe33de9dfe74`
- IM-17F – Construction Completion Integration @ `a4254cacb9dd89f54950a7d0d4125f2c9827b531`
- IM-17G – Player Construction State Projection @ `a6e32ac19dade82e01fdbfc7c3c4e9cad557c871`

The IM-17 Whole-Block marker does not yet exist. It may be created only after exact-finalization-head CI and Pages succeed.

## 2. Binding ownership after IM-17G

- Frozen IM-16 remains the Player selection / placement / validity / explicit Confirm-Cancel / authoritative Building registration / result-projection authority.
- Existing Runtime remains Runtime-state authority. IM-17A only decides economic-construction admission and requires `COMMITTED + RUNNING`.
- Existing `ResourceDemands` and Resource Claims remain the demand/reservation/fulfillment authority. IM-17B reuses that vocabulary and quantity invariant.
- Existing Building Construction state/progress/completion contracts remain construction truth. IM-17C initializes `PENDING`, IM-17E advances only from authoritative delivered material and IM-17F verifies completion exactly once.
- Existing Resource Matching, Resource Assignment, BuildingStock transport reservation, TransportJob and delivery settlement boundaries remain logistics authority. IM-17D only connects construction demand to them.
- BuildingStock transport reservations and Resource Claim reservations stay separate authorities.
- Building lifecycle `EXISTS/RETIRED` remains distinct from Building Construction state `PENDING/IN_PROGRESS/COMPLETED`.
- IM-17G is read-only Player UI projection. It creates no admission, demand, resource, delivery, progress or completion truth.
- No regular workforce assignment or production start is part of IM-17.
- IM-15 Inspector remains observation/guidance except its already frozen diagnostic action allowlist.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen Whole-Block head: `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

Frozen marker: `frozen/im-16-player-construction-placement-integration`.

IM-16 established the complete Player-facing placement/commit path. IM-17 consumes its actual authoritative commit result and does not alter IM-16.

## 4. IM-17 – Economic Construction Integration

**Status:** WHOLE-BLOCK FINALIZATION / PASS / 0 FUNCTIONAL BLOCKER / FINAL MARKER PENDING

**Definition baseline:** frozen IM-16 @ `99b0e7d001b7a4f175727cf8e304dde0928c730b`.

**Whole-Block branch:** `feature/im-17-economic-construction-integration`.

### Whole-Block target flow

`frozen IM-16 placement/commit → Runtime admission → economic construction requirement → construction initialization → existing logistics/material delivery → authoritative progress settlement → exactly-once completion → Player construction-state projection`.

That target flow is now covered by frozen IM-17A through IM-17G without introducing a second Building, Resource, Demand, Reservation, Transport, BuildingStock, Construction or Runtime authority.

### IM-17A – Player Construction Runtime Admission Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `6caf6132864e71201dee6b9a286c111f67fce016`  
**Marker:** `frozen/im-17a-player-construction-runtime-admission-contract`

Consumes the actual frozen-IM-16 commit result plus authoritative Runtime state. Economic construction is admitted only for `COMMITTED + RUNNING`. Existing Building registration is never undone.

Real iPad/Safari evidence confirmed correct build identity and READY → RUNNING → PAUSED behavior with real placement/commit while RUNNING. The known world-label/annotation positioning issue remains NON-BLOCKING and outside IM-17.

### IM-17B – Economic Construction Requirement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `32f219029d4f76fcd0ff5e768e66cf32a47ec50b`  
**Marker:** `frozen/im-17b-economic-construction-requirement-contract`

Uses existing `ResourceDemands`; stable `buildingId` is `consumerId`. Existing `targetAmount`, `reservedAmount`, `fulfilledAmount`, `remainingAmount` and `status` remain authoritative, including the quantity invariant.

### IM-17C – Player Placement → Construction Initialization Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `c30d2d7a88f7f16b2cf73e1d2b85cec867dcea40`  
**Marker:** `frozen/im-17c-player-placement-construction-initialization-integration`

Initializes admitted construction through the existing Building Construction state as `PENDING` using the same stable `buildingId`. The final head also contains the narrow self-test Runtime-stop lifecycle fix; production semantics are unchanged.

### IM-17D – Construction Demand → Existing Logistics Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `1c728ab4ce051abff33dda17c9e3ef40cb7c9f4c`  
**Marker:** `frozen/im-17d-construction-demand-existing-logistics-integration`

Connects real construction demand to existing Resource Matching, claims, BuildingStock transport reservation and TransportJob ownership. No second logistics subsystem, routing or movement authority.

### IM-17E – Delivered Material → Construction Progress Settlement

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `b46e061b185915b805332b252033fe33de9dfe74`  
**Marker:** `frozen/im-17e-delivered-material-construction-progress-settlement`

Only authoritative delivered BuildingStock settlement may consume the corresponding ACTIVE construction demand claim. Actual fulfilled amount derives deterministic monotonic construction progress through the existing progress authority.

### IM-17F – Construction Completion Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `a4254cacb9dd89f54950a7d0d4125f2c9827b531`  
**Marker:** `frozen/im-17f-construction-completion-integration`

Reuses the existing Building Construction Completion boundary. Completion becomes effective exactly once at terminal `COMPLETED / progress 1`; no Building lifecycle mutation, worker assignment or production start is introduced.

### IM-17G – Player Construction State Projection

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `a6e32ac19dade82e01fdbfc7c3c4e9cad557c871`  
**Marker:** `frozen/im-17g-player-construction-state-projection`

Projects only actual authoritative economic construction state into Player UI: waiting for material, under construction, progress and completed. UI remains read-only with respect to gameplay truth.

## 5. IM-17 verification evidence

Substep gates were independently completed before successors were released. Final exact-head evidence includes:

- IM-17A CI `34394606222`: SUCCESS; accepted real iPad/Safari evidence.
- IM-17B CI `34460374866`, Pages `34460373223`: SUCCESS.
- IM-17C CI `34508191830`, Pages `34508190775`: SUCCESS.
- IM-17D CI `34520097029`, Pages `34520094382`: SUCCESS.
- IM-17E CI `34523081316`, Pages `34523080482`: SUCCESS.
- IM-17F CI `34531232168`, Pages `34531230761`: SUCCESS.
- IM-17G CI `34575744508`, Pages `34575743961`: SUCCESS.

All IM-17A→G frozen markers were live-verified on their expected exact SHAs.

## 6. IM-17 Whole-Block Completion / Regression / Freeze Gate

**Status:** REGRESSION PASS / DOCUMENTATION & VISIBLE-BUILD-IDENTITY FINALIZATION IN PROGRESS / FINAL MARKER PENDING

The complete range frozen IM-16 `99b0e7d001b7a4f175727cf8e304dde0928c730b` → frozen IM-17G `a6e32ac19dade82e01fdbfc7c3c4e9cad557c871` is **20 commits ahead / 0 behind**, merge-base exactly frozen IM-16.

The complete current CI regression contains IM-17A through IM-17G plus frozen predecessor checks and is green on frozen IM-17G. Ownership and exclusions were rechecked across the full Whole-Block range with 0 functional blocker.

The current finalization changes only the two steering documents and visible/build identity surfaces from IM-17G substep identity to IM-17 Whole-Block gate identity. It adds no gameplay capability.

After the finalization head is created, both CI and Pages must succeed on exactly that SHA. Only then may the Whole-Block marker `frozen/im-17-economic-construction-integration` be created and verified on that exact head.

## 7. IM-17 Whole-Block exclusions

IM-17 contains no regular workforce assignment, regular production operation, broad Building catalogue authority, general Gold construction-price system, demolition, upgrades, rotation, multi-cell footprints, new terrain/distance placement rules, SaveGame rearchitecture, Inspector mutation/editor authority or legacy `main` gameplay/UI reuse.

## 8. Current gate

**IM-17A through IM-17G = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-17 Whole Block = FINALIZATION HEAD PENDING EXACT-HEAD CI/PAGES / FINAL MARKER PENDING.**

No new IM block may begin during this gate. After exact-finalization-head CI and Pages are both successful, the only permissible write is the IM-17 Whole-Block frozen marker on that same exact head.

---

**Updated:** 2026-09-11 — IM-17A through IM-17G synchronized as COMPLETE / FROZEN / PASS / 0 BLOCKER; Whole-Block regression PASS / 0 functional blocker; documentation and build-identity finalization in progress; exact-head CI/Pages and Whole-Block marker pending.