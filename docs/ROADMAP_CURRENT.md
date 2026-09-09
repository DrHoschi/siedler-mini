# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16D DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-16-player-construction-placement-integration`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.
Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

Frozen IM-16B marker: `frozen/im-16b-player-placement-interaction-state-world-target-contract`.
Frozen IM-16B head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

Frozen IM-16C marker: `frozen/im-16c-player-placement-preview-validity-projection-contract`.
Frozen IM-16C head and exclusive IM-16D baseline: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

## 2. Binding ownership after frozen IM-16C

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the current supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and real world-target consumption.
- Frozen IM-16C owns only temporary player-visible Placement Preview / Validity projection.
- Existing Building Domain owns stable Building identity/lifecycle and Building-store mutation.
- `BuildingRegistrationWorldOwnership` remains the existing authoritative Building registration boundary.
- IM-15 remains observation/guidance except its already frozen diagnostic action allowlist.
- IM-15C diagnostic overlay remains read-only and is not Player Placement authority.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

IM-16A, IM-16B and IM-16C are frozen. IM-16D is defined but not implemented. Later IM-16 capability remains separately gated.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16B adds only the temporary Player Placement interaction-state and world-target seam above frozen IM-16A. It creates no Ghost/Preview, no Confirm/Commit and no Building mutation path.

## 6. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive implementation baseline:** frozen IM-16B @ `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

### Frozen capability

IM-16C projects only the already existing frozen-IM-16B state into a temporary player-visible world preview.

- input remains frozen IM-16B state: `definitionId`, current real `targetCellId`, unchanged frozen-IM-16A evaluation;
- existing camera-synchronous projected world geometry remains the only visual geometry authority;
- the target cell is visually highlighted;
- `VALID` and `TARGET_CELL_OCCUPIED` are visually distinguishable without re-evaluating placement rules;
- `NO TARGET` suppresses the Player Preview;
- the simple Building Ghost is temporary render presentation only and creates no Building/Domain entity or Construction state;
- camera pan/zoom keeps preview synchronized;
- Selection remains independent;
- Inspector remains read-only.

### Frozen exclusions

IM-16C includes no Confirm/Commit, no Building creation/registration, no `BuildingRegistrationWorldOwnership`, no construction progression, no cost/resource/Gold deduction, no SaveGame persistence, no new Building catalogue/menu architecture, no new placement rules, no Building rotation, no multi-cell footprints, no new Camera/Selection ownership and no Inspector mutation.

## 7. IM-16C Completion / Regression / Freeze Gate

Pre-freeze implementation HEAD: `77e1c75d361f0a816d84411f9c4e402b4b4c0142`.

Full cumulative diff from frozen IM-16B to the implementation HEAD was reviewed before freeze:

- **10 commits ahead / 0 behind**,
- merge base exactly frozen IM-16B,
- exactly **10 changed files**,
- two files are the already verified IM-16C control-documentation changes,
- eight files are limited to IM-16C preview implementation, self-test/runtime evidence, CI wiring and visible/build identity synchronization,
- no unrelated Domain/Transport/Scheduler/SaveGame owner expansion,
- no Confirm/Commit or Building creation path.

Technical evidence:

- CI Baseline `34323894551`: **SUCCESS**,
- CI step `Run IM-16C + frozen predecessor regression`: **SUCCESS**,
- Pages deploy `34323894385`: **SUCCESS** for the visible IM-16C browser surface at `3bee01efd2525f9255bea02cc585f4b4a400bbcd`; the later implementation HEAD `77e1c75d...` differs only by `.github/workflows/ci.yml` and therefore does not change deployed browser content,
- final freeze-documentation CI `34328670970`: **SUCCESS**,
- final freeze-documentation Pages `34328669914`: **SUCCESS** on frozen IM-16C head `ddebbb4ee8b743b869e069da11d644690e0620eb`.

Real iPhone/Safari evidence on 2026-09-09 confirmed Build identity, browser PASS, VALID Ghost, occupied INVALID/TARGET_CELL_OCCUPIED, NO TARGET, read-only Inspector, no Confirm/Commit and no Building mutation.

### Non-blocking UI follow-up evidence

The real iPhone tests showed that the accumulated verification/inspector overlays have become difficult to read/use on the narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and must not be silently folded into frozen IM-16C or IM-16D.

**Gate result: PASS / 0 BLOCKER.**

## 8. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** DEFINED / NOT IMPLEMENTED

**Exclusive baseline:** frozen IM-16C @ `ddebbb4ee8b743b869e069da11d644690e0620eb`.

### Leitfrage

„Wie wird ein aktuell platzierbarer Building-Kandidat genau einmal über die bestehenden autoritativen Building-/Lifecycle-Owner committed und registriert, ohne dass Player UI, Preview oder Interaction-State selbst Building- oder Construction-Wahrheit übernehmen?“

### Goal

IM-16D defines only the authoritative commit boundary behind the already frozen placement interaction/preview path. It does not add a Player Confirm/Cancel control.

A placement candidate consists only of an existing Building `definitionId` and a real `targetCellId`. The commit boundary must not trust a stale cached `VALID` result from IM-16B/IM-16C as mutation authority.

### Binding commit / registration boundary

- Immediately before any Building mutation, the candidate must be re-evaluated through frozen IM-16A against current authoritative Map/Building state.
- Only a candidate that is still `VALID` at this final revalidation may proceed to registration.
- A rejected commit must create no Building mutation and returns the authoritative rejection reason without inventing a second validity semantic.
- Stable Building identity remains owned by the existing Building Domain/store. New Building IDs must come only from the existing Building-store allocation boundary.
- Building identity must use the existing `BuildingIdentityOwnershipContract`.
- Building lifecycle must use the existing `BuildingLifecycleStateContract` and only its already supported minimal semantics.
- Actual registration must occur exclusively through existing `BuildingRegistrationWorldOwnership.register(...)`.
- Exactly one successful registration may result from one successful commit invocation.
- The commit result must be immutable and identify success plus the created Building ID, or rejection plus the authoritative reason.
- Player UI, frozen IM-16B interaction state and frozen IM-16C preview remain consumers only and gain no Building/Domain mutation authority.

### Minimal mutation scope

IM-16D may create only the minimal Building state already supported by the existing Building identity/lifecycle/registration owners. It must not invent construction phases, costs, production state, workforce state or other Building semantics that are not already required by those owners.

### Explicit exclusions

IM-16D does **not** include:

- Player Confirm button,
- Player Cancel button,
- Pointer/Touch commit trigger,
- automatic Placement Mode deactivation after success,
- Player-facing commit feedback/projection beyond the immutable commit result,
- cost/resource or Gold deduction,
- construction progression,
- workforce/production integration,
- SaveGame rearchitecture or special persistence path,
- Building rotation,
- multi-cell footprints,
- new terrain/distance/resource/building-type placement rules,
- new Camera/Selection semantics,
- Inspector mutation/editor functionality,
- IM-16E implementation.

## 9. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16C – Player Placement Preview & Validity Projection Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16D – Authoritative Placement Commit & Building Registration Contract = DEFINED / NOT IMPLEMENTED.**

This documentation update authorizes no IM-16D implementation and no Player Confirm/Cancel control.

The next permissible action is exclusively the IM-16D Documentation Verification / Finalization Gate against frozen IM-16C @ `ddebbb4ee8b743b869e069da11d644690e0620eb` and the resulting documentation HEAD on `feature/im-16-player-construction-placement-integration`. Only after PASS / 0 BLOCKER may IM-16D implementation be explicitly authorized.

---

**Updated:** 2026-09-09 — IM-16D Authoritative Placement Commit & Building Registration Contract documented as DEFINED / NOT IMPLEMENTED against frozen IM-16C. No implementation and no Player Confirm/Cancel authorized in this step.
