# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current Whole-Block branch: `feature/im-16-player-construction-placement-integration`
- Frozen development baseline: IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15 – Guidance / Inspector: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15B – Structured Runtime Diagnostics Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15C – World Diagnostic Overlay Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15E – Simulation & Balancing Observation Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16 – Player Construction & Placement Integration: DEFINED / PARTIALLY IMPLEMENTED**
- **IM-16A – Authoritative Construction Placement Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16B – Player Placement Interaction State & World Target Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16C – Player Placement Preview & Validity Projection Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16D – Authoritative Placement Commit & Building Registration Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16E – Player Placement Confirm / Cancel Interaction Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen predecessor chain

Frozen IM-15 substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.
Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

Frozen IM-16B marker: `frozen/im-16b-player-placement-interaction-state-world-target-contract`.
Frozen IM-16B head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

Frozen IM-16C marker: `frozen/im-16c-player-placement-preview-validity-projection-contract`.
Frozen IM-16C head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

Frozen IM-16D marker: `frozen/im-16d-authoritative-placement-commit-building-registration-contract`.
Frozen IM-16D head and exclusive IM-16E baseline: `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

IM-16E pre-freeze implementation/evidence head: `b077553d9158c504ba5fb2b898732b651fe81054`.
Final frozen IM-16E head is the completion-documentation head produced by this gate and verified by final-head CI/Pages before the frozen marker is set.

## 3. Binding ownership boundary after IM-16E completion

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the currently supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and world-target consumption.
- Frozen IM-16C owns only temporary Player Placement Preview / Validity projection.
- Frozen IM-16D owns only the authoritative commit seam: final revalidation through IM-16A and controlled handoff to existing Building identity/lifecycle/store/registration owners.
- Existing Building Domain/store remains sole owner of stable Building identity, lifecycle and Building-store mutation.
- Existing `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- IM-16E owns only explicit Player Confirm/Cancel interaction orchestration. Confirm consumes frozen IM-16D; Cancel only deactivates the temporary placement state.
- World pointer/touch, `pointerup`, ordinary world tap, drag end, pan, pinch and `pointercancel` are not implicit commit triggers.
- Frozen IM-15 Inspector remains observer only; IM-15C diagnostic overlay is not Player Placement authority.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

Target flow remains:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

IM-16A through IM-16E are frozen. No later IM-16 capability is authorized by this completion/freeze step; the next capability must be separately reconciled/defined against frozen IM-16E.

## 5. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

IM-16A remains the immutable, mutation-free placement-evaluation authority for an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 6. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

IM-16B establishes only temporary Player Placement interaction state plus camera-compatible targeting of real `MapStructure` cells.

## 7. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

IM-16C owns only the temporary player-visible world preview and unchanged validity projection from frozen IM-16B / IM-16A. It creates no Building and owns no mutation truth.

### Non-blocking UI/readability evidence

Real iPhone evidence showed that accumulated Inspector/verification surfaces are difficult to read on a narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and was not silently folded into IM-16E.

## 8. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

IM-16D owns only the authoritative commit / Building registration seam behind the frozen interaction/preview path. It revalidates through frozen IM-16A immediately before mutation and then uses the existing Building ID, identity, lifecycle, store and `BuildingRegistrationWorldOwnership` owners.

## 9. IM-16E – Player Placement Confirm / Cancel Interaction Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16D @ `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

**Pre-freeze implementation/evidence head:** `b077553d9158c504ba5fb2b898732b651fe81054`.

### Frozen capability

IM-16E closes only the explicit Player-interaction seam between the already frozen owners:

`IM-16B Placement State → IM-16C Preview → Player CONFIRM → IM-16D authoritative Commit`

or:

`IM-16B Placement State → Player CANCEL → Placement State INACTIVE`

- `CONFIRM` is an explicit Player action only and requires active Placement with a real `definitionId` plus `targetCellId`.
- Confirm delegates mutation exclusively to frozen IM-16D. Cached preview/validity is not mutation authority; IM-16D performs final frozen-IM-16A revalidation immediately before mutation.
- A successful commit deactivates the temporary Placement state and triggers world re-render; the resulting Building remains owned by existing Building/registration owners.
- A rejected commit preserves the authoritative IM-16D / IM-16A reason and preserves the active Placement state.
- `CANCEL` never invokes a Building commit and only deactivates temporary Placement state.
- World pointer/touch is not an implicit Confirm path.
- Confirm/Cancel results are immutable and IM-16E exposes no placement-validity, Building-mutation, Camera/Selection, SaveGame or Inspector authority.
- Exactly one player-facing Confirm/Cancel control surface is present; the duplicate-control defect found during real iPhone verification was corrected by marking the existing static surface as the authoritative `data-im16e-controls` surface.

### Verification evidence

Automated self-test verifies active-target requirement, occupied-target rejection with Placement preserved, successful authoritative commit with Placement deactivation, Cancel without Building mutation, immutable results and preserved ownership boundaries.

CI on pre-freeze implementation/evidence head `b077553d9158c504ba5fb2b898732b651fe81054`: run `34351027622` — **SUCCESS**, including `Run IM-16E + frozen predecessor regression`.

Pages on the same head: run `34351026003` — **SUCCESS**.

Real iPhone/Safari evidence after the final duplicate-control correction confirms:

- visible title `IM-16E – Player Placement Confirm / Cancel Interaction Contract`,
- visible `IM-16E — PASS`,
- Build `IM-16E-PLAYER-PLACEMENT-CONFIRM-CANCEL-INTERACTION-CONTRACT`,
- occupied target → `TARGET_CELL_OCCUPIED / PLACEMENT PRESERVED`,
- free target → `COMMITTED building:00000004 / PLACEMENT INACTIVE`,
- Cancel → `INACTIVE / NO BUILDING MUTATION`,
- World pointer/touch is not implicit Confirm,
- Inspector remains `OBSERVATION READ ONLY`,
- exactly one `Bestätigen / Abbrechen / Placement inaktiv` control group is visible.

### Explicit exclusions preserved

IM-16E introduces no new placement-validity rules, no second Building creation/registration path, no cost/resource/Gold deduction, no construction progression, no workforce/production integration, no Building rotation, no multi-cell footprints, no new terrain/distance/resource/building-type rules, no Camera/Selection ownership change, no Inspector mutation/editor path, no SaveGame rearchitecture, no implicit world-tap commit, no complete Building catalogue/management UI, no legacy `main` BuildDock/gameplay reuse and no later IM-16 substep implementation.

## 10. Completion / Regression / Freeze Gate

Full diff frozen IM-16D `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1` → pre-freeze IM-16E head `b077553d9158c504ba5fb2b898732b651fe81054` was rechecked as **13 commits ahead / 0 behind**, merge-base exactly frozen IM-16D, with 10 changed files limited to the two control documents plus IM-16E implementation/evidence/CI/visible-entry-point surfaces.

Ownership and exclusions were rechecked against the full diff. CI/Pages and final real iPhone/Safari evidence are PASS. The completion documentation is therefore synchronized as **COMPLETE / FROZEN / PASS / 0 BLOCKER**, subject only to final-head CI/Pages verification before setting the frozen marker.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A through IM-16E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

No later IM-16 substep is implemented or authorized here. After the frozen marker is verified, the next permissible action is exclusively reconciliation/definition of the next still-missing IM-16 capability against frozen IM-16E.

## 11. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-09 — IM-16E Completion / Regression / Freeze Gate synchronized after full-diff, CI/Pages and real iPhone/Safari verification. No later IM-16 substep implemented.
