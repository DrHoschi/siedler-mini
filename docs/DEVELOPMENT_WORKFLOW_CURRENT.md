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
- Active substep: **CR-29A – World View / Camera State Contract**
- CR-29A status: **AUTHORIZED / NOT_STARTED**
- Next allowed action: **implement CR-29A only**

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

Planned decomposition:

### CR-29A – World View / Camera State Contract

Define only the renderer-facing state contract for the current world view, including the minimum stable values needed for viewport/world offset and zoom/scale.

Requirements:

- deterministic immutable camera/view state,
- explicit finite numeric values,
- no gameplay ownership,
- no world mutation,
- no Canvas drawing changes yet,
- no user input or gestures yet,
- no pan/zoom integration yet.

### CR-29B – Deterministic World-to-Screen Projection

After CR-29A is complete, apply the frozen camera/view state deterministically to the CR-28 visible-world representation. Same world + same view state must produce the same screen-space result. No player interaction yet.

### CR-29C – Controlled Pan & Zoom Integration

Only after CR-29B may player-controlled pan/zoom alter the camera/view state. Camera changes affect presentation only and must never mutate Map, Buildings, Persons, Logistics, Workforce, BuildingStock or other gameplay owners.

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

**CR-29A – World View / Camera State Contract** may now begin on this same whole-CR-29 branch.

CR-29A must stop at the state contract boundary. Do not add world-to-screen transformation, browser controls, pan gestures, pinch zoom, HUD, Build Menu or Inspector in CR-29A.

---

**Updated:** 2026-09-06 after explicit authorization of **CR-29 – Camera & World View Foundation** and creation of its whole-CR branch directly from frozen CR-28.
