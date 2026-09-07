# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 FROZEN / IM-14A FROZEN / IM-14B FROZEN / IM-14 WHOLE BLOCK IN PROGRESS / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-14-ui-mobile-foundation`  
**Whole-block base:** frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13A through IM-13D and whole IM-13 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14A – Player UI Shell & Responsive Surface Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `4ba4e152931058c9e6b62e2e26489f378779e80f`.

IM-14B – Unified Pointer / Touch Interaction Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** after its Completion / Regression / Freeze Gate.

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
- **IM-14B – Unified Pointer / Touch Interaction Contract — COMPLETE / FROZEN**,
- IM-14C – Runtime HUD Projection,
- IM-14D – World Selection & Context Projection,
- IM-14E – Player Camera Controls Integration,
- IM-14 Whole-Block Completion / Regression / Freeze Gate.

Later substeps are not automatically authorized by the IM-14B freeze.

## 4. Frozen IM-14A boundary

IM-14A remains the authoritative responsive Player UI Shell boundary with distinct Topbar, World/Canvas and Action regions, mobile/desktop viewport support, `viewport-fit=cover`, safe-area handling, deterministic UI/World layering and Canvas↔World binding.

Frozen marker: `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`.

## 5. Frozen IM-14B boundary

IM-14B is frozen as the neutral unified Pointer/Touch transport/lifecycle boundary over IM-14A:

- one Pointer Event contract for mouse/pen/touch pointer sources,
- deterministic UI vs WORLD classification,
- owner-separated subscriber channels,
- pointerId-based ACTIVE contact tracking,
- deterministic ENDED/CANCELLED cleanup,
- normalized owner/region/pointer/button/client/local-coordinate samples,
- no Selection, Gameplay or Camera meaning assigned by the input boundary.

Freeze evidence includes CI Baseline run `34160223336` = SUCCESS on the final functional/implementation state `3017377774b13aeefd8fa06e9f047fe9a6f29ecc`, Pages run `34160239693` = SUCCESS on pre-freeze documentation HEAD `19186808df37eb97382d1ee8787be566e76fed12`, and real-device PASS / 0 BLOCKER on iPhone/Safari and iPad/Safari. The single commit between the CI-verified implementation state and pre-freeze documentation HEAD changed only this roadmap file.

Explicitly not introduced by IM-14B:

- world/entity selection,
- Tap = Select or other gameplay meaning,
- new camera Pan/Zoom semantics,
- pinch/gesture interpretation beyond neutral contact tracking,
- build placement/context actions,
- HUD/domain projection,
- Save/Load UI,
- Inspector,
- new gameplay/domain/persistence ownership.

## 6. Current gate

There is no automatically authorized implementation successor.

The next permissible action is exclusively **reconciliation/definition of IM-14C – Runtime HUD Projection against frozen IM-14B**. IM-14C implementation requires separate explicit authorization after that contract is reconciled and accepted.

The complete IM-14 block remains NOT FROZEN until its later Whole-Block gate.

---

**Updated:** 2026-09-07 — IM-14B COMPLETE / FROZEN / PASS / 0 BLOCKER. Next permissible action: IM-14C reconciliation/definition only.
