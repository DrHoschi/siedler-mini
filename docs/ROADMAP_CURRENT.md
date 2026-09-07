# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 FROZEN / IM-14A IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-14-ui-mobile-foundation`  
**Whole-block base:** frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13A through IM-13D and whole IM-13 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 – Deterministic SaveGame Snapshot / Restore Foundation is the authoritative predecessor for IM-14.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — IN PROGRESS / NOT FROZEN**,
- IM-15 – Guidance/Inspector.

## 3. Reconciled IM-14 Foundation direction

IM-14 introduces the player-facing UI/mobile layer over the existing modular runtime without making UI a gameplay, simulation, domain, camera or persistence owner.

Current planned sequence:

- IM-14A – Player UI Shell & Responsive Surface Contract,
- IM-14B – Unified Pointer / Touch Interaction Contract,
- IM-14C – Runtime HUD Projection,
- IM-14D – World Selection & Context Projection,
- IM-14E – Player Camera Controls Integration,
- IM-14 Whole-Block Completion / Regression / Freeze Gate.

Later substeps are not automatically authorized by IM-14A implementation.

## 4. IM-14A – Player UI Shell & Responsive Surface Contract

Status: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**.

Implemented boundary:

- responsive Player UI Shell with distinct Topbar, World/Canvas and structural Action regions,
- mobile/desktop viewport support,
- `viewport-fit=cover` plus safe-area insets,
- deterministic UI/World layering,
- canvas constrained to the World surface,
- synchronized IM-14A visible/build identity,
- dedicated browser runtime evidence.

Explicitly not introduced:

- domain HUD data,
- world/entity selection,
- gameplay actions/build UI,
- Save/Load UI or storage,
- new Pointer/Touch semantics,
- camera behavior changes,
- minimap/dialog/notification behavior,
- Inspector,
- new gameplay/domain/persistence ownership.

## 5. Current gate

The only active step is **IM-14A verification**. IM-14A is not frozen yet.

Before IM-14B may begin, direct technical verification and browser/device evidence for the responsive Player UI Shell must pass with 0 blocker. The complete IM-14 block remains NOT FROZEN until its later Whole-Block gate.

---

**Updated:** 2026-09-07 — IM-14 whole-block branch created exactly from frozen IM-13; IM-14A implemented, verification pending.
