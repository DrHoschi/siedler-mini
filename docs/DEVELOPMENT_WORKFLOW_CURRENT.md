# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-block branch: `feature/im-14-ui-mobile-foundation`
- Whole-block branch base: frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`
- Frozen predecessor: **IM-13 – Deterministic SaveGame Snapshot / Restore Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current migration block: **IM-14 – UI / Mobile Foundation: IN PROGRESS / NOT FROZEN**
- IM-14A – Player UI Shell & Responsive Surface Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-14B – Unified Pointer / Touch Interaction Contract: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**

## 2. Frozen IM-14A boundary

IM-14A remains frozen and authoritative for the responsive player shell, Topbar/World/Action regions, safe-area handling, deterministic UI/World layering and Canvas↔World surface binding.

Frozen IM-14A marker: `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`.

## 3. Binding IM-14B contract

IM-14B introduces only a unified Pointer/Touch transport and lifecycle boundary over frozen IM-14A.

Binding requirements:

- Pointer input is normalized through one contract for mouse/pen/touch pointer sources,
- UI surfaces and the World surface are deterministically classified,
- UI-owned input is not emitted through the World channel,
- active contacts are tracked by pointerId,
- contact lifecycle is controlled as ACTIVE -> ENDED / CANCELLED,
- pointerup/pointercancel cannot leave a hanging active contact,
- duplicate terminal events are not re-emitted as new active interaction,
- normalized samples carry owner, region, pointer identity/type, button/contact state and local/client coordinates,
- the contract owns only input transport/lifecycle state,
- existing camera/gameplay/domain/persistence ownership remains unchanged,
- visible/build identity is `IM-14B-UNIFIED-POINTER-TOUCH-INTERACTION-CONTRACT`.

Explicitly excluded from IM-14B:

- world/entity selection semantics,
- Tap = Select or other gameplay meaning,
- new camera Pan/Zoom semantics,
- pinch/gesture interpretation beyond neutral contact tracking,
- build placement/context actions,
- HUD/domain projection,
- Save/Load UI,
- Inspector,
- any gameplay/domain/persistence mutation or ownership change.

## 4. Implemented IM-14B surface

The current implementation provides:

- `src/ui/unified-pointer-touch-interaction.js` as the neutral input contract,
- root-level Pointer Event normalization across UI and World surfaces,
- deterministic UI/WORLD classification using existing `data-ui-region` ownership,
- pointerId-based active contact tracking and terminal cleanup,
- owner-specific subscriber channels without assigning gameplay meaning,
- dedicated browser evidence in `src/im14b-runtime-evidence.js`,
- synchronized page title, visible gate identity and RuntimeConfig build identity,
- cache-versioned evidence/config imports for reliable mobile verification.

The existing frozen camera behavior in `src/main.js` has not been broadened or semantically changed by IM-14B. No IM-14C/D/E behavior has been introduced.

## 5. Current gate

**IM-14B = IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN.**

Before any IM-14C work, IM-14B requires direct technical/CI verification plus real browser/device evidence. The complete IM-14 block remains NOT FROZEN.

Expected browser gate:

`IM-14B — Unified Pointer / Touch Interaction Contract — PASS — UI↔World Classification PASS — Pointer Lifecycle PASS — Unified Boundary PASS — Build Identity PASS`

## 6. Frozen predecessor preservation

IM-14A, IM-13 and the frozen CR-31/CR-32 boundaries remain authoritative and unchanged. IM-14B is input transport/lifecycle only and does not become a competing camera, gameplay, domain or persistence owner.

## 7. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-14B Unified Pointer / Touch Interaction Contract implemented against frozen IM-14A; verification pending, not frozen.
