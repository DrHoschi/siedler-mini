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

## 2. Binding IM-14A contract

IM-14A introduces only the structural player UI shell over the frozen modular runtime.

Binding requirements:

- a dedicated Player UI Shell exists over the existing World/Canvas surface,
- World/Canvas, Topbar and Action regions are structurally distinct,
- responsive layout supports desktop and mobile viewport sizes,
- `viewport-fit=cover` and CSS safe-area insets are respected,
- UI shell layout may own only presentation/layout state,
- resize/orientation changes must preserve a valid viewport-bound shell,
- existing runtime, camera and gameplay ownership remain unchanged,
- visible/build identity is `IM-14A-PLAYER-UI-SHELL-RESPONSIVE-SURFACE-CONTRACT`.

Explicitly excluded from IM-14A:

- Gold/Population or other domain HUD projection,
- world/entity selection and context actions,
- build UI,
- Save/Load UI, Save Slots, storage adapters or autosave,
- new Pointer/Touch gameplay semantics,
- camera behavior changes,
- minimap, dialogs/notifications and Inspector,
- any new gameplay, simulation, domain or persistence ownership.

## 3. Frozen IM-14A surface

The frozen implementation provides:

- responsive `app-shell` with topbar, world stage and structural action region,
- safe-area aware desktop/mobile layout,
- deterministic UI/World layer separation,
- world canvas bound to the dedicated world region,
- browser runtime evidence in `src/im14a-runtime-evidence.js`,
- synchronized page title, visible gate identity and RuntimeConfig build identity,
- cache-safe evidence/config loading for reliable real-device build-identity verification.

No IM-14B/C/D/E behavior has been introduced.

## 4. IM-14A Completion / Regression / Freeze Gate

**IM-14A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Accepted evidence:

- full branch diff reviewed against frozen IM-13 base `0a011af99ea8814b9e3555d7075ee091cfaf05c2`,
- diff remains inside the IM-14A presentation/layout boundary,
- latest functional IM-14A implementation/evidence head before freeze recording: `a3fd439278199dbc0efa69522984f8a061d95fec`,
- CI Baseline run `34157309746` on that head: SUCCESS,
- GitHub Pages build/deployment run `34157308682` on that head: SUCCESS,
- real iPhone/Safari evidence 2026-09-07 21:56 local: READY and IM-14A PASS with Player Shell PASS, viewport-fit=cover PASS, Safe-Area/Viewport PASS, Canvas↔World Surface PASS and Build Identity PASS,
- real iPad/Safari evidence 2026-09-07 22:01 local: READY and IM-14A PASS with the same complete PASS set, including responsive wide-layout behavior,
- the earlier iPhone Build Identity FAIL was isolated to stale module/cache loading and corrected without introducing new UI/gameplay behavior.

## 5. Frozen predecessor preservation

IM-13 and the frozen CR-31/CR-32 Navigation/Path/Wear boundaries remain authoritative and unchanged. IM-14A is presentation structure only and does not make UI a gameplay or persistence owner.

## 6. Current gate

IM-14A is frozen. This freeze does **not** automatically authorize IM-14B implementation.

The next permissible action is reconciliation/definition of IM-14B – Unified Pointer / Touch Interaction Contract against frozen IM-14A. The complete IM-14 block remains NOT FROZEN until its later Whole-Block gate.

## 7. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-14A Completion / Regression / Freeze Gate PASS / 0 BLOCKER with CI, Pages, iPhone and iPad evidence; IM-14A frozen.
