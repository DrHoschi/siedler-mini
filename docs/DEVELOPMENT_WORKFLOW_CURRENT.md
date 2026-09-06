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
- Post-freeze visible-label correction: **COMPLETE / PASS / 0 BLOCKER**.
- Corrected CR-29 frozen marker: `frozen/cr-29-camera-world-view-foundation` -> `5ef4ba7f59070bfb392ed8c48abb6f8351788fc5`.
- Next allowed action: **select the next system block explicitly from the current roadmap; no successor CR is implicitly authorized**.

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

## 5. Post-freeze visible-label correction

A later visual check found that `index.html` still exposed the previous CR-28C test-page identity although CR-29C runtime status and behavior were already correct.

The correction changed only visible test-page metadata/text:

- document title -> **Neue Siedler – CR-29 Camera & World View Foundation**,
- stage accessibility label -> CR-29 camera-view wording,
- visible card heading -> **CR-29 – Camera & World View Foundation**,
- descriptive text -> CR-29A/B/C presentation chain,
- placeholder status -> **CR-29C Browser-Gate wird aufgebaut …**,
- cache-busting identifiers -> CR-29.

No camera state, projection, Canvas rendering, browser input, gameplay owner or ownership contract changed.

The corrected exact state passed the full CR-29 CI/freeze-gate chain, and the frozen marker was advanced to:

`frozen/cr-29-camera-world-view-foundation` -> `5ef4ba7f59070bfb392ed8c48abb6f8351788fc5`.

## 6. Frozen CR-29 invariants

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

## 7. Frozen CR-29 non-scope

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

## 8. Frozen marker rule and next allowed action

Current frozen marker:

`frozen/cr-29-camera-world-view-foundation`

Current corrected frozen commit:

`5ef4ba7f59070bfb392ed8c48abb6f8351788fc5`

After the corrected marker is in place, **no CR-30 or other successor implementation is automatically authorized**. The next system block must be selected explicitly from the current roadmap and started from the corrected CR-29 frozen marker.

## 9. Permanent visible CR / build identity synchronization rule

This rule is mandatory for every future CR or substep that changes, deploys, tests or presents a visible browser/test page.

Before a browser/device gate, before declaring a visible substep PASS, and again before a whole-CR Freeze Gate, verify that the deployed page visibly identifies the **current authorized CR/substep** and does not retain stale identity from a predecessor.

The check must cover all applicable visible/build identity surfaces, including:

- HTML document/page title,
- visible page/card heading,
- explanatory or diagnostic copy that names the active CR,
- runtime/test-status and browser-gate text,
- `aria-label` or equivalent accessibility labels that contain CR/build identity,
- visible build/version badges or status pills,
- cache-busting/version identifiers on JS/CSS/assets when they carry the CR/build identity,
- any other user-visible or test-visible string that still names an earlier CR/substep.

A stale predecessor label is a **visible verification defect**. It must be corrected before the relevant browser/device verification or Freeze Gate is considered complete. Do not treat correct runtime behavior alone as sufficient when the deployed test page still identifies the wrong CR.

When a new CR/substep begins, visible identity synchronization belongs to that substep's normal completion work whenever the page exposes CR/build identity; it must not be left as an assumed cleanup step for later.

---

**Updated:** 2026-09-06 after successful CR-29 visible-label correction and user-confirmed iPad view. Permanent visible CR/build identity synchronization rule added to prevent stale predecessor labels in future browser/device gates.
