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
- IM-14C – Runtime HUD Projection: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**

## 2. Frozen predecessor line

IM-14A remains authoritative for the responsive Player UI Shell, safe-area handling, Topbar/World/Action regions and Canvas↔World binding.

IM-14B remains authoritative for neutral Pointer/Touch transport/lifecycle and UI-vs-WORLD classification. It owns no Selection, Gameplay or Camera meaning.

Frozen markers:

- `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`
- `frozen/im-14b-unified-pointer-touch-interaction-contract` @ `8aa7594f4debcc838382ca6f49fcdcbadf9be324`

## 3. Binding IM-14C contract

IM-14C introduces only a read-only player-facing HUD projection over already authoritative Runtime data.

Binding requirements:

- the HUD source for population is exclusively `housingPopulation.population.count`,
- the HUD source for gold is exclusively `goldEconomy.snapshot().balance`,
- projection produces an immutable HUD view model,
- equal authoritative state produces equal projected HUD state,
- rendering may format and display values but may not create a second authoritative truth,
- HUD refresh must not execute simulation/domain/economy mutation,
- the HUD owns only `authoritative runtime state -> immutable HUD view model -> DOM projection`,
- IM-14A layout ownership and IM-14B input ownership remain unchanged,
- visible/build identity is `IM-14C-RUNTIME-HUD-PROJECTION`.

Explicitly excluded from IM-14C:

- world/entity selection,
- context panels or selection-derived information,
- Tap = Select or other interaction meaning,
- new camera Pan/Zoom semantics,
- population creation or housing assignment,
- gold settlement, income application or spending,
- production/stock/workforce/transport controls,
- Save/Load UI or persistence mutation,
- minimap, notifications or Inspector,
- any new gameplay/domain/persistence owner.

## 4. Implemented IM-14C surface

The current implementation provides:

- `src/ui/runtime-hud-projection.js` as the read-only projection boundary,
- a compact player-facing Topbar HUD for `Bevölkerung` and `Gold`,
- population read directly from the existing derived-population truth,
- gold read directly from `GoldEconomyOwner.snapshot()`,
- immutable deterministic view-model projection,
- DOM-only rendering/refresh without domain mutation,
- responsive HUD styling inside the frozen IM-14A shell,
- dedicated browser evidence in `src/im14c-runtime-evidence.js`,
- synchronized page/verification/build identity.

`src/main.js` was not changed by IM-14C. Existing camera behavior and all frozen gameplay/domain/persistence owners remain unchanged.

## 5. Current gate

**IM-14C = IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN.**

Expected browser gate:

`IM-14C — Runtime HUD Projection — PASS — Population Source PASS — Gold Source PASS — Read-only Ownership PASS — Build Identity PASS`

Before any IM-14D work, IM-14C requires technical/CI verification plus real browser/device evidence and a Completion / Regression / Freeze Gate with PASS / 0 BLOCKER.

The complete IM-14 block remains NOT FROZEN.

## 6. Frozen predecessor preservation

IM-14B, IM-14A, IM-13 and the frozen CR-31/CR-32 boundaries remain authoritative and unchanged. IM-14C is projection-only and does not become a competing Simulation, Gameplay, Selection, Camera or Persistence owner.

## 7. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-14C Runtime HUD Projection implemented against frozen IM-14B; verification pending, not frozen.
