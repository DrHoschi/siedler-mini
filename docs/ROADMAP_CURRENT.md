# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 FROZEN / IM-14A FROZEN / IM-14B IMPLEMENTED / VERIFICATION PENDING / IM-14 WHOLE BLOCK NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-14-ui-mobile-foundation`  
**Whole-block base:** frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13A through IM-13D and whole IM-13 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14A – Player UI Shell & Responsive Surface Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `4ba4e152931058c9e6b62e2e26489f378779e80f`.

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

Current sequence:

- **IM-14A – Player UI Shell & Responsive Surface Contract — COMPLETE / FROZEN**,
- **IM-14B – Unified Pointer / Touch Interaction Contract — IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**,
- IM-14C – Runtime HUD Projection,
- IM-14D – World Selection & Context Projection,
- IM-14E – Player Camera Controls Integration,
- IM-14 Whole-Block Completion / Regression / Freeze Gate.

Later substeps are not automatically authorized by IM-14B implementation.

## 4. Frozen IM-14A boundary

IM-14A remains the authoritative responsive Player UI Shell boundary with distinct Topbar, World/Canvas and Action regions, mobile/desktop viewport support, `viewport-fit=cover`, safe-area handling, deterministic UI/World layering and Canvas↔World binding.

Frozen marker: `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`.

## 5. IM-14B – Unified Pointer / Touch Interaction Contract

Status: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**.

Implemented boundary:

- one neutral Pointer Event transport/lifecycle contract for mouse/pen/touch pointer sources,
- deterministic UI vs WORLD classification from the frozen IM-14A surface structure,
- owner-separated subscriber channels,
- pointerId-based ACTIVE contact tracking,
- deterministic ENDED/CANCELLED cleanup,
- normalized owner/region/pointer/button/client/local-coordinate samples,
- dedicated IM-14B browser evidence,
- synchronized IM-14B visible/build identity and cache-safe evidence/config loading.

Explicitly not introduced:

- world/entity selection,
- Tap = Select or other gameplay meaning,
- new camera Pan/Zoom semantics,
- pinch/gesture interpretation beyond neutral contact tracking,
- build placement/context actions,
- HUD/domain projection,
- Save/Load UI,
- Inspector,
- new gameplay/domain/persistence ownership.

The pre-existing camera behavior remains unchanged and is not made an IM-14B owner.

## 6. Current gate

The only active step is **IM-14B verification**. IM-14B is not frozen yet.

Before IM-14C may begin, direct technical/CI checks and real browser/device evidence must confirm the unified input boundary with PASS / 0 BLOCKER. The complete IM-14 block remains NOT FROZEN until its later Whole-Block gate.

---

**Updated:** 2026-09-07 — IM-14B implemented against frozen IM-14A; verification pending, not frozen.
