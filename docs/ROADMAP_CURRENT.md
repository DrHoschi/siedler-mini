# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 FROZEN / IM-14A FROZEN / IM-14B FROZEN / IM-14C FROZEN / IM-14D FROZEN / IM-14E IMPLEMENTED / VERIFICATION PENDING / IM-14 WHOLE BLOCK IN PROGRESS / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-14-ui-mobile-foundation`  
**Whole-block base:** frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 and IM-14A through IM-14D remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Latest frozen predecessor:

- `frozen/im-14d-world-selection-context-projection` @ `72b234e0ada95afa324d62d83274ee1f320abe37`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — IN PROGRESS / NOT FROZEN**,
- IM-15 – Guidance/Inspector.

## 3. IM-14 sequence

- **IM-14A – Player UI Shell & Responsive Surface Contract — COMPLETE / FROZEN**,
- **IM-14B – Unified Pointer / Touch Interaction Contract — COMPLETE / FROZEN**,
- **IM-14C – Runtime HUD Projection — COMPLETE / FROZEN**,
- **IM-14D – World Selection & Context Projection — COMPLETE / FROZEN**,
- **IM-14E – Player Camera Controls Integration — IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**,
- IM-14 Whole-Block Completion / Regression / Freeze Gate.

Whole-block freeze is not automatically authorized by IM-14E implementation.

## 4. Frozen predecessor boundaries

IM-14A remains Player UI Shell/layout owner.

IM-14B remains neutral Pointer/Touch transport/lifecycle owner.

IM-14C remains read-only Runtime HUD owner.

IM-14D remains ephemeral Selection/Context owner; Tap/Click selects, empty world clears, Drag/Pinch does not select.

## 5. IM-14E – Player Camera Controls Integration

Status: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**.

Implementation started from frozen IM-14D @ `72b234e0ada95afa324d62d83274ee1f320abe37`.

Implemented boundary:

- sole authoritative `cameraState` preserved,
- frozen camera-control functions and zoom limits `0.5 .. 3.0` preserved,
- shared IM-14D/IM-14B WORLD input is the pointer source,
- one pointer movement -> Pan,
- two pointers -> midpoint Pan + anchor Pinch Zoom,
- Wheel -> anchor zoom,
- former parallel direct Canvas pointer/wheel camera pipeline removed from `src/main.js`,
- no double pointer-processing ownership,
- IM-14D Selection continues on the same shared WORLD input,
- dedicated IM-14E evidence and synchronized visible/build identity,
- no new camera policy, gameplay/domain/persistence ownership or Inspector.

Explicitly not introduced:

- camera world-bound clamps,
- inertia/momentum,
- edge scrolling,
- keyboard/WASD controls,
- auto-center/follow camera,
- zoom buttons/minimap control,
- changed zoom limits,
- new Selection/Context semantics.

## 6. Current gate

The only active step is **IM-14E browser/mobile verification**. IM-14E is not frozen yet.

Expected browser gate:

`IM-14E — Player Camera Controls Integration — PASS — Unified Camera Input PASS — Single-Pointer Pan PASS — Pinch Zoom PASS — Wheel Zoom PASS — Selection Regression PASS — No Double Processing PASS — Frozen Camera Policy PASS — Build Identity PASS`

Real-device verification must confirm one-finger Pan, two-finger zoom in/out, Pan after zoom, continued Building/Person Tap selection, no selection during Drag/Pinch, and intact HUD/Context/shell.

Only after technical/CI verification, real-device evidence and **IM-14E Completion / Regression / Freeze Gate = PASS / 0 BLOCKER** may IM-14E freeze. Only after that may the separate IM-14 Whole-Block Completion / Regression / Freeze Gate be considered.

The complete IM-14 block remains **IN PROGRESS / NOT FROZEN**.

---

**Updated:** 2026-09-08 — IM-14E implemented against frozen IM-14D; verification pending, not frozen. Whole-block freeze not yet authorized.
