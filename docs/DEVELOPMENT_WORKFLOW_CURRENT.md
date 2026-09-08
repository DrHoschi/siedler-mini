# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-block branch: `feature/im-14-ui-mobile-foundation`
- Whole-block branch base: frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`
- Current migration block: **IM-14 – UI / Mobile Foundation: IN PROGRESS / NOT FROZEN**
- IM-14A – Player UI Shell & Responsive Surface Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-14B – Unified Pointer / Touch Interaction Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-14C – Runtime HUD Projection: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-14D – World Selection & Context Projection: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-14E – Player Camera Controls Integration: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**

## 2. Frozen predecessor line

Frozen markers:

- `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`
- `frozen/im-14b-unified-pointer-touch-interaction-contract` @ `8aa7594f4debcc838382ca6f49fcdcbadf9be324`
- `frozen/im-14c-runtime-hud-projection` @ `788358677092ef91d7edf1c0d8a6a82efacc5f21`
- `frozen/im-14d-world-selection-context-projection` @ `72b234e0ada95afa324d62d83274ee1f320abe37`

IM-14A remains layout owner, IM-14B neutral Pointer/Touch transport owner, IM-14C read-only HUD owner, and IM-14D ephemeral Selection/Context owner.

## 3. Binding IM-14E contract

IM-14E integrates the already existing/frozen camera behavior into the IM-14 input architecture. It does not invent a new camera policy.

Binding requirements:

- `cameraState` remains the single authoritative camera state,
- camera mutations continue exclusively through `panWorldViewCamera`, `zoomWorldViewCameraAt`, and viewport resize through `resizeWorldViewCameraViewport`,
- frozen zoom limits remain `0.5 .. 3.0`,
- one WORLD pointer moving means Pan,
- two WORLD pointers mean midpoint Pan + anchor-based Pinch Zoom,
- Wheel means anchor-based desktop zoom,
- Pointer Up/Cancel ends gesture state cleanly,
- Pointer camera input reuses the same frozen IM-14D/IM-14B WORLD input boundary,
- direct parallel Canvas pointer handling must be removed so camera mutations are not double processed,
- IM-14D Tap/Click selection remains functional and Drag/Pinch still must not select,
- camera mutation only triggers world rerender and does not create gameplay/domain/persistence ownership,
- browser gesture suppression remains limited to the Canvas/world interaction surface,
- visible/build identity is `IM-14E-PLAYER-CAMERA-CONTROLS-INTEGRATION`.

Explicitly excluded:

- new zoom limits or camera math,
- world-bound camera clamps,
- inertia/momentum,
- edge scrolling,
- keyboard/WASD camera controls,
- auto-center/follow camera,
- zoom buttons or minimap camera control,
- new Selection/Context semantics,
- gameplay/domain/persistence mutation,
- Inspector.

## 4. Implemented IM-14E surface

Implementation started exactly from frozen IM-14D @ `72b234e0ada95afa324d62d83274ee1f320abe37` on the existing whole-block branch.

Current implementation provides:

- `src/ui/player-camera-controls-integration.js` as the player camera gesture integration boundary,
- shared use of `window.IM14DWorldSelectionContext.input` rather than creating a second Pointer/Touch pipeline,
- single-pointer Pan,
- two-pointer midpoint Pan + Pinch Zoom,
- Wheel anchor zoom,
- continued use of the existing frozen camera-control functions and limits,
- removal of the former direct Canvas pointer/wheel camera pipeline from `src/main.js`,
- explicit runtime camera mutation wrappers (`panCameraBy`, `zoomCameraAt`) that mutate the sole `cameraState` and rerender,
- retained IM-14D Selection/Context controller and shared input identity,
- dedicated `src/im14e-runtime-evidence.js`,
- synchronized visible/build identity and IM-14E cache-versioned page bootstrap.

No new camera policy, gameplay, domain, persistence, HUD or Context ownership is introduced.

## 5. Current gate

**IM-14E = IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN.**

Expected browser gate:

`IM-14E — Player Camera Controls Integration — PASS — Unified Camera Input PASS — Single-Pointer Pan PASS — Pinch Zoom PASS — Wheel Zoom PASS — Selection Regression PASS — No Double Processing PASS — Frozen Camera Policy PASS — Build Identity PASS`

Real-device verification must additionally confirm:

- one-finger Pan works,
- two-finger zoom in/out works,
- Pan after zoom works,
- Building/Person Tap selection still works,
- Drag/Pinch does not accidentally select,
- HUD, Context and responsive shell remain intact.

Before the IM-14 Whole-Block gate may begin, IM-14E requires technical/CI verification, real browser/device evidence and its own Completion / Regression / Freeze Gate with PASS / 0 BLOCKER.

The complete IM-14 block remains **IN PROGRESS / NOT FROZEN**.

## 6. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-14E implemented against frozen IM-14D; verification pending, not frozen. Whole-block freeze is not yet authorized.
