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
- IM-14D – World Selection & Context Projection: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**

## 2. Frozen predecessor line

IM-14A remains authoritative for the responsive Player UI Shell, safe-area handling, Topbar/World/Action regions and Canvas↔World binding.

IM-14B remains authoritative for neutral Pointer/Touch transport/lifecycle and UI-vs-WORLD classification.

IM-14C remains authoritative for the read-only player-facing Runtime HUD projection.

Frozen markers:

- `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`
- `frozen/im-14b-unified-pointer-touch-interaction-contract` @ `8aa7594f4debcc838382ca6f49fcdcbadf9be324`
- `frozen/im-14c-runtime-hud-projection` @ `788358677092ef91d7edf1c0d8a6a82efacc5f21`

## 3. Binding IM-14D contract

IM-14D introduces only ephemeral selection and read-only context projection for already visible Runtime objects.

Binding requirements:

- selectable scope is limited to visible projected `building` and `person` objects,
- world Tap/Click may acquire selection; Tap/Click on empty world clears selection,
- Drag/Pan and Multi-Touch gestures must not create selection,
- hit testing is based on the same camera-projected render-command geometry used for visible rendering,
- deterministic overlap priority is `person` before `building`, then stable source ID ordering,
- selection state is ephemeral UI state only: `null` or `{ kind, id }`,
- selection does not mutate the selected domain/runtime object,
- context projection is read-only and limited to Building ID/definitionId/visibleState or Person ID/visibleState,
- no context actions are introduced,
- IM-14A shell ownership, IM-14B neutral input ownership and IM-14C HUD ownership remain unchanged,
- visible/build identity is `IM-14D-WORLD-SELECTION-CONTEXT-PROJECTION`.

Explicitly excluded from IM-14D:

- terrain/cell selection,
- build placement or construction actions,
- stock, workforce, transport, housing or economy controls,
- persistent selection or SaveGame ownership,
- new camera Pan/Zoom semantics,
- IM-14E player camera-control integration,
- Inspector,
- any gameplay/domain/persistence mutation.

## 4. Implemented IM-14D surface

Implementation started exactly from frozen IM-14C @ `788358677092ef91d7edf1c0d8a6a82efacc5f21` on the existing whole-block branch.

Current implementation provides:

- `src/ui/world-selection-context-projection.js` as the selection/context boundary,
- reuse of the frozen IM-14B unified WORLD pointer stream,
- Tap-vs-Drag/Multi-Touch guarding with no new camera-control semantics,
- deterministic hit testing against current camera-projected render commands,
- Person-before-Building overlap priority and stable ID fallback,
- ephemeral `{ kind, id }` selection state,
- read-only Building/Person context view models,
- a compact context surface in the frozen IM-14A Action region,
- dedicated browser evidence in `src/im14d-runtime-evidence.js`,
- synchronized page/verification/build identity and cache-versioned IM-14D bootstrap.

`src/main.js` remains unchanged by IM-14D. Existing camera behavior is neither replaced nor broadened.

## 5. Current gate

**IM-14D = IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN.**

Expected browser gate:

`IM-14D — World Selection & Context Projection — PASS — World Selection PASS — Empty World Clear PASS — Drag/Multi-touch Guard PASS — Context Projection PASS — Read-only Ownership PASS — Build Identity PASS`

Real browser/device verification should additionally demonstrate that tapping a visible Building/Person updates only the context surface, empty-world tap clears it, and drag/pinch camera interaction does not accidentally select.

Before IM-14E may begin, IM-14D requires technical/CI verification, real browser/device evidence and its Completion / Regression / Freeze Gate with PASS / 0 BLOCKER.

The complete IM-14 block remains NOT FROZEN.

## 6. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-14D implemented against frozen IM-14C; verification pending, not frozen. No IM-14E implementation authorized.
