# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16D COMPLETE / FROZEN / PASS / 0 BLOCKER  
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
Frozen IM-16C head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

The IM-16D frozen marker must point at the final documentation HEAD produced by this closing gate after final CI/Pages verification.

## 2. Binding ownership after frozen IM-16D

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the current supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and real world-target consumption.
- Frozen IM-16C owns only temporary player-visible Placement Preview / Validity projection.
- Frozen IM-16D owns only the authoritative commit seam that revalidates through IM-16A and then uses existing Building Domain identity/lifecycle/store ownership plus `BuildingRegistrationWorldOwnership`.
- Existing Building Domain remains sole owner of stable Building identity/lifecycle and Building-store mutation.
- `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- IM-15 remains observation/guidance except its already frozen diagnostic action allowlist.
- IM-15C diagnostic overlay remains read-only and is not Player Placement authority.
- No Player Confirm/Cancel control exists yet.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

IM-16A, IM-16B, IM-16C and IM-16D are frozen. Later IM-16 capability remains separately gated.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16B adds only the temporary Player Placement interaction-state and world-target seam above frozen IM-16A. It creates no Ghost/Preview, no Confirm/Commit and no Building mutation path.

## 6. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16C projects only the already existing frozen-IM-16B state into a temporary player-visible world preview.

- input remains frozen IM-16B state: `definitionId`, current real `targetCellId`, unchanged frozen-IM-16A evaluation;
- existing camera-synchronous projected world geometry remains the only visual geometry authority;
- the target cell is visually highlighted;
- `VALID` and `TARGET_CELL_OCCUPIED` are visually distinguishable without re-evaluating placement rules;
- `NO TARGET` suppresses the Player Preview;
- the simple Building Ghost is temporary render presentation only and creates no Building/Domain entity or Construction state;
- camera pan/zoom keeps preview synchronized;
- Selection remains independent;
- Inspector remains read-only.

Real iPhone tests also established that accumulated verification/inspector overlays are difficult to read on the narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and was not folded into IM-16D.

## 7. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive implementation baseline:** frozen IM-16C @ `ddebbb4ee8b743b869e069da11d644690e0620eb`.

### Frozen capability

IM-16D introduces only the authoritative commit / Building registration seam behind the already frozen placement interaction and preview path.

- candidate input remains only existing Building `definitionId` plus real `targetCellId`;
- immediately before any Building mutation, the candidate is re-evaluated through frozen IM-16A against current authoritative state;
- stale cached `VALID` state from IM-16B/IM-16C is never mutation authority;
- non-`VALID` final revalidation rejects with the authoritative IM-16A reason and produces no Building mutation;
- stable Building ID is allocated only through the existing Building-store allocator;
- existing `BuildingIdentityOwnershipContract` owns Building identity;
- existing `BuildingLifecycleStateContract` owns lifecycle semantics;
- actual registration occurs exclusively through `BuildingRegistrationWorldOwnership.register(...)`;
- the registration owner was extended only to carry the already existing authoritative Building `position` so subsequent frozen-IM-16A occupancy checks see the committed Building on its real target cell;
- exactly one successful registration results from one successful commit invocation;
- the immutable commit result identifies success plus created Building ID or rejection plus authoritative reason;
- Player UI, frozen IM-16B state and frozen IM-16C preview remain consumers only.

### Frozen exclusions

IM-16D includes no Player Confirm button, no Player Cancel button, no Pointer/Touch commit trigger, no automatic Placement Mode deactivation, no Player-facing live commit trigger, no cost/resource/Gold deduction, no construction progression, no workforce/production integration, no SaveGame rearchitecture, no Building rotation, no multi-cell footprints, no new placement rules, no new Camera/Selection semantics and no Inspector mutation/editor functionality.

## 8. IM-16D Completion / Regression / Freeze Gate

Frozen baseline: IM-16C @ `ddebbb4ee8b743b869e069da11d644690e0620eb`.

Pre-freeze IM-16D implementation HEAD: `463ca686e0f0986573c4b96c2939e28a979c8e62`.

Full cumulative diff from frozen IM-16C to that implementation HEAD was reviewed before freeze:

- **11 commits ahead / 0 behind**,
- merge base exactly frozen IM-16C,
- exactly **11 changed files**,
- two changed files are the already verified IM-16D control-documentation updates,
- nine changed files are limited to IM-16D commit/registration implementation, the narrow registration-owner extension, self-test/runtime evidence, CI wiring and visible/build identity synchronization,
- no unrelated Runtime/Transport/Scheduler/SaveGame/Selection/Camera/Inspector ownership expansion,
- no Player Confirm/Cancel and no IM-16E.

Technical evidence:

- CI Baseline `34335841839`: **SUCCESS**,
- CI step `Run IM-16D + frozen predecessor regression`: **SUCCESS**,
- Pages deploy `34335841057`: **SUCCESS** on implementation HEAD `463ca686e0f0986573c4b96c2939e28a979c8e62`.

Real iPhone/Safari evidence on 2026-09-09 confirmed:

- page title `IM-16D – Authoritative Placement Commit & Building Registration Contract`,
- visible Build identity `IM-16D-AUTHORITATIVE-PLACEMENT-COMMIT-BUILDING-REGISTRATION-CONTRACT`,
- browser evidence `IM-16D — PASS`,
- occupied `cell:00000019` → `TARGET_CELL_OCCUPIED / NO MUTATION`,
- free `cell:00000001` → `COMMITTED building:00000004`,
- immediate recheck of the same target → `TARGET_CELL_OCCUPIED / NO SECOND REGISTRATION`,
- authoritative position registered,
- Inspector remained `OBSERVATION READ ONLY`,
- `No Player Confirm/Cancel`,
- Build Identity PASS.

The browser evidence uses an isolated Miniworld and reports `liveRuntimeMutation: false`; the visible live runtime is not committed by the verification harness.

**Gate result: PASS / 0 BLOCKER.**

## 9. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16C – Player Placement Preview & Validity Projection Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16D – Authoritative Placement Commit & Building Registration Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The final frozen marker `frozen/im-16d-authoritative-placement-commit-building-registration-contract` must point at the final documentation HEAD produced by this closing gate. Marker creation is mechanical only and adds no capability.

No Player Confirm/Cancel and no IM-16E implementation is authorized in this same gate.

After the frozen marker exists, the next permissible action is exclusively reconciliation/definition of the next IM-16 substep against frozen IM-16D. No implementation is automatically authorized.

---

**Updated:** 2026-09-09 — IM-16D Completion / Regression / Freeze Gate PASS / 0 BLOCKER after full frozen-IM-16C diff review, successful CI/Pages and real iPhone evidence. No Player Confirm/Cancel and no IM-16E in this step.
