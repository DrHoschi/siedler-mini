# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 FROZEN / IM-14A FROZEN / IM-14B FROZEN / IM-14C FROZEN / IM-14D IMPLEMENTED / VERIFICATION PENDING / IM-14 WHOLE BLOCK IN PROGRESS / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-14-ui-mobile-foundation`  
**Whole-block base:** frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13A through IM-13D and whole IM-13 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14A – Player UI Shell & Responsive Surface Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14B – Unified Pointer / Touch Interaction Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14C – Runtime HUD Projection is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at frozen marker `frozen/im-14c-runtime-hud-projection` @ `788358677092ef91d7edf1c0d8a6a82efacc5f21`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — IN PROGRESS / NOT FROZEN**,
- IM-15 – Guidance/Inspector.

## 3. Reconciled IM-14 Foundation direction

Current sequence:

- **IM-14A – Player UI Shell & Responsive Surface Contract — COMPLETE / FROZEN**,
- **IM-14B – Unified Pointer / Touch Interaction Contract — COMPLETE / FROZEN**,
- **IM-14C – Runtime HUD Projection — COMPLETE / FROZEN**,
- **IM-14D – World Selection & Context Projection — IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**,
- IM-14E – Player Camera Controls Integration,
- IM-14 Whole-Block Completion / Regression / Freeze Gate.

Later steps are not automatically authorized by IM-14D implementation.

## 4. Frozen predecessor boundaries

IM-14A remains the Player UI Shell/layout owner.

IM-14B remains the neutral Pointer/Touch transport/lifecycle owner.

IM-14C remains the read-only Runtime HUD projection owner.

None of these frozen boundaries is broadened by IM-14D.

## 5. IM-14D – World Selection & Context Projection

Status: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**.

Implementation started from frozen IM-14C @ `788358677092ef91d7edf1c0d8a6a82efacc5f21`.

Implemented boundary:

- selectable scope limited to visible projected Buildings and Persons,
- WORLD Tap/Click may select and empty-world Tap/Click clears selection,
- Drag/Pan and Multi-Touch are guarded from selection,
- deterministic hit testing against camera-projected render-command geometry,
- overlap priority Person before Building, then stable source ID,
- ephemeral selection reference only (`null` or `{ kind, id }`),
- read-only Building context: ID, definitionId, visibleState,
- read-only Person context: ID, visibleState,
- compact context projection in the existing Action region,
- dedicated IM-14D browser evidence,
- synchronized `IM-14D-WORLD-SELECTION-CONTEXT-PROJECTION` visible/build identity,
- `src/main.js` unchanged; no new camera-control semantics.

Explicitly not introduced:

- terrain/cell selection,
- build placement or context actions,
- stock/workforce/transport/housing/economy controls,
- persistent selection or SaveGame ownership,
- IM-14E camera-control integration,
- Inspector,
- gameplay/domain/persistence mutation.

## 6. Current gate

The only active step is **IM-14D verification**. IM-14D is not frozen yet.

Expected browser gate:

`IM-14D — World Selection & Context Projection — PASS — World Selection PASS — Empty World Clear PASS — Drag/Multi-touch Guard PASS — Context Projection PASS — Read-only Ownership PASS — Build Identity PASS`

Real-device verification must also confirm usable Tap/Click selection of visible Building/Person, empty-world clearing and no accidental selection during drag/pinch camera use.

Before IM-14E may begin, technical/CI checks, real browser/device evidence and the IM-14D Completion / Regression / Freeze Gate must confirm PASS / 0 BLOCKER.

The complete IM-14 block remains **IN PROGRESS / NOT FROZEN**.

---

**Updated:** 2026-09-08 — IM-14D implemented against frozen IM-14C; verification pending, not frozen. No IM-14E implementation authorized.
