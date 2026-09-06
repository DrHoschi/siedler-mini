# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-29-camera-world-view-foundation`
- Frozen predecessor: **CR-28 – Visible World Runtime Integration Foundation**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-29A – World View / Camera State Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-29B – Deterministic World-to-Screen Projection: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-29C – Controlled Pan & Zoom Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Next allowed action: **final exact-state CI verification, then create the CR-29 frozen marker; no successor CR is implicitly authorized**

## 2. Frozen predecessor baseline

CR-28 whole-system frozen marker:

`frozen/cr-28-visible-world-runtime-integration-foundation`

CR-28 frozen commit:

`1ca2997a3933b312737dda5a220f1026d149bdf1`

The CR-29 whole-CR branch was created directly from this exact frozen commit. CR-28 remains immutable.

## 3. CR-29 – Camera & World View Foundation frozen result

Question answered by CR-29:

> How does the player view the already-visible world through a controlled, deterministic camera/view boundary without changing gameplay truth?

Frozen presentation chain:

`gameplay/world owners -> CR-28A immutable projection -> CR-28B deterministic world render commands -> CR-29A immutable camera/view state -> CR-29B deterministic screen-space projection -> CR-29C controlled camera-only input -> Canvas`

### CR-29A – World View / Camera State Contract

**COMPLETE / FROZEN / PASS / 0 BLOCKER**.

The frozen camera/view state contains only:

- `viewportWidth`,
- `viewportHeight`,
- `offsetX`,
- `offsetY`,
- `zoom`.

Viewport dimensions and zoom are positive finite numbers; offsets are finite. Camera states are immutable and contain no gameplay/world owner references.

### CR-29B – Deterministic World-to-Screen Projection

**COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen deterministic behavior:

- screen coordinates are derived from CR-28 render coordinates using CR-29A camera state,
- rectangle dimensions and circle radii scale deterministically with zoom,
- command order, roles, source identities and visible states are preserved,
- CR-28 source render commands are not mutated,
- same source render commands + same camera state produce the same screen-space commands,
- viewport dimensions define the Canvas execution boundary.

### CR-29C – Controlled Pan & Zoom Integration

**COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen controlled behavior:

- one-pointer drag changes camera offset only,
- two-pointer interaction changes camera midpoint/zoom only,
- desktop wheel zoom changes camera zoom only,
- anchored zoom preserves the interaction anchor,
- zoom is clamped to `0.5 .. 3`,
- viewport resize changes camera viewport dimensions only,
- no camera input path mutates Map, Buildings, Persons, Logistics, Workforce, BuildingStock or any other gameplay owner.

## 4. Completion / regression / freeze evidence

Whole-system gate:

`src/dev/cr-29-freeze-gate.node.js`

Completion report:

`docs/CR-29_COMPLETION_REGRESSION_FREEZE_GATE.md`

GitHub Actions run `34054452965` on commit `941cdce9e8a4aec4b97e85446d89f52fa4ddf01b` executed:

`npm run ci -> CR-24C frozen gate -> CR-28 whole-system freeze gate -> CR-29 whole-system freeze gate`

Result: **PASS / 0 BLOCKER**.

Accepted real-browser evidence on 2026-09-06:

- real iPhone Safari initial view displayed the grid, 3 Buildings and 3 Persons,
- real drag/pan changed only the visible camera position,
- real pinch zoom materially enlarged the visible world,
- subsequent zoom-out materially reduced the visible world,
- grid, Buildings and Persons remained coherent and visible across those camera changes.

Browser verification: **PASS / 0 BLOCKER**.

## 5. Frozen CR-29 invariants

- gameplay/world owners remain authoritative,
- camera/view state remains presentation state only,
- camera/view state is immutable,
- renderer remains read-only toward gameplay state,
- deterministic CR-29B projection is the world-to-screen path,
- camera input changes presentation only,
- no camera write-back path to gameplay/world owners exists,
- stable Map/Building/Person identities remain unchanged,
- frozen CR-28 visibility/render ownership remains intact,
- `main` remains historical old-game reference only and is not a development base or integration target.

## 6. Frozen CR-29 non-scope

CR-29 adds no ownership for:

- Save / Load / Continue,
- Gameplay HUD,
- Build Menu,
- Inspector,
- gameplay selection or commands,
- new pathfinding/movement/traffic behavior,
- BuildingStock/Workforce/Logistics changes,
- production/construction/new simulation semantics,
- mandatory new visual assets.

## 7. Final marker rule and next allowed action

The intended frozen marker is:

`frozen/cr-29-camera-world-view-foundation`

It may be created only after this final documentation-complete HEAD receives successful CI verification. The marker must point exactly to that CI-verified HEAD.

After the marker exists, **no CR-30 or other successor implementation is automatically authorized**. The next system block must be selected explicitly from the current roadmap and started from the CR-29 frozen marker.

---

**Updated:** 2026-09-06 after **CR-29 Completion / Regression / Freeze Gate** reached **PASS / 0 BLOCKER**; final exact-state CI verification is the only remaining prerequisite for the frozen marker.
