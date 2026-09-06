# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-29 COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-29-camera-world-view-foundation`  
**Latest freeze decision:** **CR-29 – Camera & World View Foundation**

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen CR-28 predecessor marker:

`frozen/cr-28-visible-world-runtime-integration-foundation`

Frozen CR-28 commit:

`1ca2997a3933b312737dda5a220f1026d149bdf1`

Current CR-29 frozen marker:

`frozen/cr-29-camera-world-view-foundation`

The CR-29 marker is maintained at the final documentation-complete, exact-state-CI-verified CR-29 HEAD.

## 2. CR-29 completed system block

**CR-29 – Camera & World View Foundation** — **COMPLETE / FROZEN / PASS / 0 BLOCKER**

Whole-CR development branch:

`feature/cr-29-camera-world-view-foundation`

The branch was created directly from frozen CR-28 at `1ca2997a3933b312737dda5a220f1026d149bdf1`.

### CR-29A – World View / Camera State Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

### CR-29B – Deterministic World-to-Screen Projection

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

### CR-29C – Controlled Pan & Zoom Integration

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

## 3. Whole-system completion / regression / freeze evidence

Whole-system gate:

`src/dev/cr-29-freeze-gate.node.js`

Completion report:

`docs/CR-29_COMPLETION_REGRESSION_FREEZE_GATE.md`

GitHub Actions run `34054452965` on commit `941cdce9e8a4aec4b97e85446d89f52fa4ddf01b` executed the frozen predecessor regression plus the whole CR-29 gate successfully: **PASS / 0 BLOCKER**.

Accepted real iPhone Safari evidence on 2026-09-06 verifies real drag/pan + pinch zoom while the grid, 3 Buildings and 3 Persons remain coherent and visible: **PASS / 0 BLOCKER**.

A post-freeze presentation audit then found stale CR-28C visible test-page labels in `index.html`. Those labels were corrected to CR-29/CR-29C only, with no behavior or ownership change. The corrected final state must again pass the same whole-system freeze-gate CI before the CR-29 frozen marker is advanced to it.

## 4. Frozen architectural boundary

Frozen presentation chain:

`gameplay/world owners -> CR-28A immutable projection -> CR-28B deterministic world render commands -> CR-29A immutable camera/view state -> CR-29B deterministic screen-space projection -> CR-29C controlled camera-only input -> Canvas`

Frozen invariants include:

- gameplay/world owners remain authoritative,
- camera/view state is presentation-only and immutable,
- screen-space transformation remains deterministic,
- camera input mutates only camera/view presentation state,
- zoom remains controlled in the CR-29C range `0.5 .. 3`,
- no camera input write-back exists to Map, Buildings, Persons, Logistics, Workforce, BuildingStock or other gameplay owners,
- frozen CR-28 identities and read-only render ownership remain intact,
- `main` remains historical reference only.

## 5. Frozen CR-29 non-scope

CR-29 owns no:

- Save/Load/Continue,
- Gameplay HUD,
- Build Menu,
- Inspector,
- gameplay selection or commands,
- new pathfinding/movement/traffic behavior,
- BuildingStock/Workforce/Logistics changes,
- new production/construction/simulation semantics,
- mandatory new assets.

## 6. Current next step

Do **not** begin or implicitly authorize a successor CR.

After the visible-label correction receives successful exact-state CI, keep `frozen/cr-29-camera-world-view-foundation` on that verified final state. Only then select the next system block explicitly from the current implementation roadmap.

---

**Updated:** 2026-09-06 after correcting stale CR-28C browser-test-page labels on the frozen CR-29 line; functionality remains unchanged and requires exact-state re-verification before advancing the marker.
