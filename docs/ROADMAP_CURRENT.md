# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16E COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16F COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16G COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-16-player-construction-placement-integration`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

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
Frozen IM-16G head and Whole-Block completion-gate baseline: `9022b7934e885950af8d8a3559cbecdd41a2da63`.

## 2. Binding ownership after IM-16G completion

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the current supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and real world-target consumption.
- Frozen IM-16C owns only temporary player-visible Placement Preview / Validity projection.
- Frozen IM-16D owns only the authoritative commit seam that revalidates through IM-16A and then uses existing Building Domain identity/lifecycle/store ownership plus `BuildingRegistrationWorldOwnership`.
- Existing Building Domain remains sole owner of stable Building identity/lifecycle and Building-store mutation.
- `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- Frozen IM-16E owns only explicit Player Confirm/Cancel interaction orchestration.
- Frozen IM-16F owns only the narrow Player Building selection / Placement activation seam: bounded known/testable options `HQ`, `WOODCUTTER`, `STOREHOUSE` → frozen IM-16B `activate(definitionId)`.
- Frozen IM-16G owns only temporary player-facing projection of the actual immutable Confirm → IM-16D commit result.
- World rendering of a registered Building remains Runtime/Render ownership.
- World pointer/touch and camera gestures remain non-commit paths.
- IM-15 remains observation/guidance except its frozen diagnostic action allowlist.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED — WHOLE-BLOCK COMPLETION / REGRESSION / FREEZE GATE DEFINED / NOT EXECUTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

The reconciled target flow is fully covered by frozen IM-16A through IM-16G:

`IM-16F Selection → IM-16B Placement/World Target → IM-16A Validity → IM-16C Preview → IM-16E Confirm/Cancel → IM-16D authoritative Commit/Registration → IM-16G Player Result Projection`.

Whole-Block completion is therefore eligible for a dedicated final gate, but is **not yet COMPLETE/FROZEN** by this documentation step.

## 4. Frozen substep result

**IM-16A through IM-16G = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The substep freeze chain preserves the established ownership boundaries and collectively closes the documented IM-16 end-to-end Player Construction & Placement flow.

## 5. Player Construction Runtime-State Gating reconciliation point

Real iPad/Safari evidence established that building selection/placement/commit is currently possible while Runtime is still `READY` before Start/Play.

Reconciliation against the frozen Runtime contract found no existing binding rule that Player/Domain mutations are permitted only while Runtime is `RUNNING`. Therefore this observation is **NON-BLOCKING for IM-16 Whole-Block completion** and is not retroactively converted into an IM-16H capability.

`Player Construction Runtime-State Gating` remains a separate later policy/reconciliation point. Any future restriction of Player gameplay mutation by Runtime state requires its own explicit contract and must not be introduced inside the IM-16 Whole-Block freeze gate.

## 6. IM-16 Whole-Block Completion / Regression / Freeze Gate – definition

**Status:** DEFINED / NOT EXECUTED

**Exclusive gate baseline:** frozen IM-16G @ `9022b7934e885950af8d8a3559cbecdd41a2da63`.

The Whole-Block gate is verification/finalization only. It introduces no new gameplay capability.

The gate must:

- verify the complete IM-16 range from frozen IM-15 baseline `9e797ab93036f6b3731442dc626edb8c091893c8` through frozen IM-16G;
- verify that every substep marker IM-16A through IM-16G resolves to its documented frozen head;
- regress the complete A→G end-to-end construction path and all frozen predecessor checks;
- confirm that the final Player flow remains building selection → placement/world target → validity/preview → explicit Confirm/Cancel → authoritative commit/registration → authoritative result feedback;
- reconfirm all Runtime/Domain/Building/Camera/Selection/Pointer/Inspector/SaveGame ownership boundaries and preserved exclusions;
- include the already accepted real iPhone/iPad evidence from the substep gates; no new device behavior may be invented by the Whole-Block gate;
- preserve `Player Construction Runtime-State Gating` as NON-BLOCKING / separately undecided;
- synchronize `DEVELOPMENT_WORKFLOW_CURRENT.md` and `ROADMAP_CURRENT.md` to Whole-Block COMPLETE / FROZEN / PASS / 0 BLOCKER only after the complete regression is clean;
- require CI and Pages SUCCESS on the exact final Whole-Block documentation head;
- create and verify the IM-16 Whole-Block frozen marker only after those exact-head checks succeed.

Any unexpected runtime/domain/UI implementation change, ownership drift, stale visible/build identity, failed frozen predecessor regression, failed CI/Pages, or marker mismatch is a blocker and prevents Whole-Block freeze.

### Explicit exclusions

This gate must not add IM-16H or any later capability; change READY/RUNNING gameplay policy; add costs/resources/Gold, construction progression, workers/production, demolition/upgrades, rotation/multi-cell footprints, new catalogue/definition authority, new placement rules, SaveGame rearchitecture, Inspector mutation, or reuse legacy `main` gameplay/UI architecture.

## 7. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16A through IM-16G = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 Whole-Block Completion / Regression / Freeze Gate = DEFINED / NOT EXECUTED.**

The next permissible action is exclusively the separate **IM-16 Whole-Block Documentation Verification / Finalization Gate** against frozen IM-16G `9022b7934e885950af8d8a3559cbecdd41a2da63`. No Whole-Block freeze or new implementation is authorized by this definition step.

---

**Updated:** 2026-09-09 — IM-16 Whole-Block Completion / Regression / Freeze Gate defined against frozen IM-16G. No Whole-Block freeze and no new implementation performed.
