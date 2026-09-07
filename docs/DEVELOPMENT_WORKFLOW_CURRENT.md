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
- IM-14B – Unified Pointer / Touch Interaction Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen IM-14A boundary

IM-14A remains frozen and authoritative for the responsive player shell, Topbar/World/Action regions, safe-area handling, deterministic UI/World layering and Canvas↔World surface binding.

Frozen IM-14A marker: `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`.

## 3. Frozen IM-14B contract

IM-14B introduces only a unified Pointer/Touch transport and lifecycle boundary over frozen IM-14A.

Frozen requirements:

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

## 4. Frozen IM-14B implementation surface

The frozen implementation provides:

- `src/ui/unified-pointer-touch-interaction.js` as the neutral input contract,
- root-level Pointer Event normalization across UI and World surfaces,
- deterministic UI/WORLD classification using existing `data-ui-region` ownership,
- pointerId-based active contact tracking and terminal cleanup,
- owner-specific subscriber channels without assigning gameplay meaning,
- dedicated browser evidence in `src/im14b-runtime-evidence.js`,
- synchronized page title, visible gate identity and RuntimeConfig build identity,
- cache-versioned evidence/config imports for reliable mobile verification.

The existing frozen camera behavior in `src/main.js` was not broadened or semantically changed by IM-14B. No IM-14C/D/E behavior was introduced.

## 5. IM-14B Completion / Regression / Freeze Gate

**IM-14B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Accepted evidence:

- frozen IM-14A base: `4ba4e152931058c9e6b62e2e26489f378779e80f`,
- CI-verified final functional/implementation state: `3017377774b13aeefd8fa06e9f047fe9a6f29ecc`,
- CI Baseline run `34160223336`: completed / SUCCESS,
- final pre-freeze documentation HEAD: `19186808df37eb97382d1ee8787be566e76fed12`,
- the only change from `301737...` to `191868...` is `docs/ROADMAP_CURRENT.md`; no runtime/config/UI/input behavior changed after successful CI,
- Pages run `34160239693` for `191868...`: completed / SUCCESS,
- iPhone / Safari real-device evidence at 2026-09-07 22:41 local: READY and complete IM-14B PASS,
- iPad / Safari real-device evidence at 2026-09-07 23:05 local: READY and complete IM-14B PASS,
- complete regression review confirms no new Selection, Gameplay or Camera semantics and no change to `src/main.js`.

The complete IM-14 block remains NOT FROZEN.

## 6. Next permissible action

The next permissible action is exclusively **reconciliation/definition of IM-14C – Runtime HUD Projection against frozen IM-14B**.

IM-14B freeze does not automatically authorize IM-14C implementation. No IM-14C implementation may begin before its reconciled contract and ownership boundary are explicitly accepted.

## 7. Frozen predecessor preservation

IM-14B, IM-14A, IM-13 and the frozen CR-31/CR-32 boundaries remain authoritative and unchanged. IM-14B is input transport/lifecycle only and does not become a competing camera, gameplay, domain or persistence owner.

## 8. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-14B Completion / Regression / Freeze Gate PASS / 0 BLOCKER; IM-14B COMPLETE / FROZEN. Next permissible action is IM-14C reconciliation/definition only.
