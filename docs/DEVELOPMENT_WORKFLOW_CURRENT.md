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
- IM-14E – Player Camera Controls Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen predecessor line

Frozen markers:

- `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`
- `frozen/im-14b-unified-pointer-touch-interaction-contract` @ `8aa7594f4debcc838382ca6f49fcdcbadf9be324`
- `frozen/im-14c-runtime-hud-projection` @ `788358677092ef91d7edf1c0d8a6a82efacc5f21`
- `frozen/im-14d-world-selection-context-projection` @ `72b234e0ada95afa324d62d83274ee1f320abe37`

IM-14A remains layout owner, IM-14B neutral Pointer/Touch transport owner, IM-14C read-only HUD owner, and IM-14D ephemeral Selection/Context owner.

## 3. Frozen IM-14E contract

IM-14E integrates the already existing/frozen camera behavior into the IM-14 input architecture. It does not invent a new camera policy.

Frozen requirements:

- `cameraState` remains the single authoritative camera state,
- camera mutations continue exclusively through `panWorldViewCamera`, `zoomWorldViewCameraAt`, and viewport resize through `resizeWorldViewCameraViewport`,
- frozen zoom limits remain `0.5 .. 3.0`,
- one WORLD pointer moving means Pan,
- two WORLD pointers mean midpoint Pan + anchor-based Pinch Zoom,
- Wheel means anchor-based desktop zoom,
- Pointer Up/Cancel ends gesture state cleanly,
- Pointer camera input reuses the same frozen IM-14D/IM-14B WORLD input boundary,
- direct parallel Canvas pointer handling is removed so camera mutations are not double processed,
- IM-14D Tap/Click selection remains functional and Drag/Pinch still does not select,
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

## 4. IM-14E Completion / Regression / Freeze Gate

Authoritative final pre-freeze branch HEAD: `e3df3aca45a1fa156447ba302188227fd3718125`.

Regression against frozen IM-14D @ `72b234e0ada95afa324d62d83274ee1f320abe37`:

- branch is 11 commits ahead / 0 behind,
- changed surface is limited to this workflow file, roadmap, `index.html`, `src/im14e-runtime-evidence.js`, `src/main.js`, `src/runtime/config.js`, and `src/ui/player-camera-controls-integration.js`,
- the former direct Canvas pointer/wheel camera pipeline is removed from `src/main.js`,
- the single authoritative camera state and frozen camera-control functions remain in use,
- no new camera policy, gameplay/domain/persistence ownership or Inspector was introduced.

Technical evidence on `e3df3aca45a1fa156447ba302188227fd3718125`:

- CI Baseline run `34203676233`: **SUCCESS**,
- Pages build/deployment run `34203675151`: **SUCCESS**.

Evidence correction history:

- first real-device pass exposed only `Frozen Camera Policy FAIL` while all functional camera/selection checks passed,
- diagnosis confirmed the failure came exclusively from JavaScript object-identity comparison across cache-versioned module instances,
- the evidence path was corrected to compare the frozen semantic values (`minZoom = 0.5`, `maxZoom = 3.0`) and actual clamp results rather than object identity,
- no camera behavior or policy was changed by that correction.

Real-device evidence:

- iPhone / Safari, 2026-09-08 10:13–10:14 local: one-finger Pan, two-finger zoom in/out, Pan after zoom, Building selection and Person selection all manually confirmed; Drag/Pinch causes no accidental selection,
- corrected iPhone / Safari evidence, 2026-09-08 10:18 local: **READY / PASS / 0 BLOCKER**,
- visible browser gate shows Unified Camera Input PASS, Single-Pointer Pan PASS, Pinch Zoom PASS, Wheel Zoom PASS, Selection Regression PASS, No Double Processing PASS, Frozen Camera Policy PASS and Build Identity PASS,
- HUD, Context and responsive shell remain intact.

**Gate result: IM-14E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 5. Current gate

The complete IM-14 block remains **IN PROGRESS / NOT FROZEN**.

IM-14E freeze does not itself freeze the whole block. The next permissible action is exclusively **IM-14 Whole-Block Completion / Regression / Freeze Gate** across frozen IM-14A/B/C/D/E and their real-device/CI evidence. No additional IM-14 feature implementation is authorized before that gate.

## 6. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-14E COMPLETE / FROZEN / PASS / 0 BLOCKER after full regression, successful CI/Pages, corrected camera-policy evidence and real iPhone/Safari interaction verification. IM-14 whole block remains NOT FROZEN; next permissible action is the separate IM-14 Whole-Block Completion / Regression / Freeze Gate only.
