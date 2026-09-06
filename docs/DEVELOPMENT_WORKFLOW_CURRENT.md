# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-29-camera-world-view-foundation`
- Current immutable baseline: **CR-28 – Visible World Runtime Integration Foundation**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Active system block: **CR-29 – Camera & World View Foundation**
- CR-29A – World View / Camera State Contract: **COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**
- Next allowed action: **CR-29B – Deterministic World-to-Screen Projection**

## 2. Frozen CR-28 baseline

Whole-system frozen marker:

`frozen/cr-28-visible-world-runtime-integration-foundation`

Frozen commit:

`1ca2997a3933b312737dda5a220f1026d149bdf1`

The CR-29 whole-CR branch was created directly from this exact frozen commit. CR-28 remains immutable.

Frozen visibility chain:

`gameplay/world owners -> CR-28A immutable projection -> CR-28B deterministic rendering -> CR-28C browser-visible Canvas`

## 3. CR-29 – Camera & World View Foundation

Question answered by CR-29:

> How does the player view the already-visible world through a controlled, deterministic camera/view boundary without changing gameplay truth?

### CR-29A – World View / Camera State Contract

**COMPLETE_NOT_FROZEN / PASS / 0 BLOCKER**.

Implementation:

- `src/render/world-view-camera-state.js`
- `src/dev/cr-29a-self-test.node.js`

Frozen-for-successor contract boundary inside the active CR-29 branch:

- camera/view state contains only `viewportWidth`, `viewportHeight`, `offsetX`, `offsetY`, `zoom`,
- viewport dimensions and zoom must be positive finite numbers,
- offsets must be finite numbers,
- equal inputs produce equal state,
- returned state is immutable,
- unowned/gameplay fields are not carried into the camera state,
- no gameplay/world owner references are stored,
- no world-to-screen transformation is performed,
- no Canvas behavior changes,
- no browser input, gestures, pan or zoom integration.

Verification:

GitHub Actions run `34051595342` on commit `5054684093499cc7f9b8f386c850b6d15e97e20e` ran the frozen regression, CR-28 whole-system freeze gate and active CR-29A contract test successfully: **PASS / 0 BLOCKER**.

### CR-29B – Deterministic World-to-Screen Projection

Next authorized step. Apply the CR-29A view state deterministically to the frozen CR-28 visible-world representation. Same world + same view state must produce the same screen-space result. Still no player interaction.

### CR-29C – Controlled Pan & Zoom Integration

Remains unauthorized until CR-29B reaches **PASS / 0 BLOCKER**. Camera changes affect presentation only and must never mutate Map, Buildings, Persons, Logistics, Workforce, BuildingStock or other gameplay owners.

After A/B/C, CR-29 requires a whole-system Completion / Regression / Freeze Gate against frozen CR-28.

## 4. CR-29 hard global non-scope

Until explicitly introduced by later authorized blocks, CR-29 adds no:

- Save/Load/Continue ownership,
- Gameplay HUD,
- Build menu,
- Inspector,
- gameplay selection/commands,
- new pathfinding/movement/traffic behavior,
- BuildingStock/Workforce/Logistics ownership changes,
- production/construction/simulation semantics,
- mandatory new visual assets.

CR-29 is a presentation/view foundation only.

## 5. Frozen boundaries that CR-29 must preserve

- CR-28 projection/rendering remains read-only toward gameplay state,
- camera/view state is not gameplay truth,
- renderer owns no gameplay state and has no write-back path,
- stable Map/Building/Person identities remain unchanged,
- frozen CR-28 browser-visible world remains regressable,
- `main` remains historical reference only and is not a development base.

## 6. Next allowed action

**CR-29B – Deterministic World-to-Screen Projection** may now begin on this same whole-CR-29 branch.

CR-29B must stop at deterministic screen-space projection. Do not add browser controls, pan gestures, pinch/wheel zoom input, HUD, Build Menu or Inspector in CR-29B.

---

**Updated:** 2026-09-06 after **CR-29A – World View / Camera State Contract** verification: **PASS / 0 BLOCKER**.
