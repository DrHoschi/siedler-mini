# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 FROZEN / IM-14A FROZEN / IM-14 WHOLE BLOCK IN PROGRESS / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-14-ui-mobile-foundation`  
**Whole-block base:** frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13A through IM-13D and whole IM-13 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14A – Player UI Shell & Responsive Surface Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

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

- **IM-14A – Player UI Shell & Responsive Surface Contract — COMPLETE / FROZEN**,
- IM-14B – Unified Pointer / Touch Interaction Contract,
- IM-14C – Runtime HUD Projection,
- IM-14D – World Selection & Context Projection,
- IM-14E – Player Camera Controls Integration,
- IM-14 Whole-Block Completion / Regression / Freeze Gate.

Later substeps are not automatically authorized by the IM-14A freeze.

## 4. Frozen IM-14A – Player UI Shell & Responsive Surface Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen boundary:

- responsive Player UI Shell with distinct Topbar, World/Canvas and structural Action regions,
- mobile/desktop viewport support,
- `viewport-fit=cover` plus safe-area insets,
- deterministic UI/World layering,
- canvas constrained to the World surface,
- synchronized IM-14A visible/build identity,
- dedicated browser runtime evidence,
- cache-safe module/evidence loading for reliable real-device verification.

Accepted completion evidence:

- full diff against frozen IM-13 base `0a011af99ea8814b9e3555d7075ee091cfaf05c2` reviewed and inside IM-14A scope,
- functional/evidence head `a3fd439278199dbc0efa69522984f8a061d95fec`,
- CI Baseline run `34157309746`: SUCCESS,
- Pages build/deployment run `34157308682`: SUCCESS,
- iPhone/Safari 2026-09-07 21:56 local: READY / PASS / 0 BLOCKER with Player Shell, viewport-fit, Safe-Area/Viewport, Canvas↔World Surface and Build Identity all PASS,
- iPad/Safari 2026-09-07 22:01 local: READY / PASS / 0 BLOCKER with the same complete PASS set and responsive wide-layout behavior,
- earlier Build Identity FAIL corrected as a cache/module-loading issue without broadening IM-14A scope.

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

IM-14A is frozen. The complete IM-14 block remains NOT FROZEN.

There is no automatically authorized implementation successor. The next permissible action is reconciliation/definition of **IM-14B – Unified Pointer / Touch Interaction Contract** against frozen IM-14A.

---

**Updated:** 2026-09-07 — IM-14A Completion / Regression / Freeze Gate PASS / 0 BLOCKER with CI, Pages, iPhone and iPad evidence; IM-14A frozen.
