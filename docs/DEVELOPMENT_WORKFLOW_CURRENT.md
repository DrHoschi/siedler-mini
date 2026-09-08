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
- IM-14C – Runtime HUD Projection: **COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen predecessor line

IM-14A remains authoritative for the responsive Player UI Shell, safe-area handling, Topbar/World/Action regions and Canvas↔World binding.

IM-14B remains authoritative for neutral Pointer/Touch transport/lifecycle and UI-vs-WORLD classification. It owns no Selection, Gameplay or Camera meaning.

Frozen markers:

- `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`
- `frozen/im-14b-unified-pointer-touch-interaction-contract` @ `8aa7594f4debcc838382ca6f49fcdcbadf9be324`

## 3. Frozen IM-14C contract

IM-14C introduces only a read-only player-facing HUD projection over already authoritative Runtime data.

Frozen requirements:

- HUD population source exclusively `housingPopulation.population.count`,
- HUD gold source exclusively `goldEconomy.snapshot().balance`,
- immutable deterministic HUD view model,
- equal authoritative state produces equal projected HUD state,
- rendering may format/display values but creates no second authoritative truth,
- HUD refresh executes no simulation/domain/economy mutation,
- HUD owns only `authoritative runtime state -> immutable HUD view model -> DOM projection`,
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

## 4. IM-14C Completion / Regression / Freeze Gate

Authoritative pre-freeze implementation/evidence head: `3b6273531fbca76ada1c6f17b44d04032951c816`.

Regression against frozen IM-14B @ `8aa7594f4debcc838382ca6f49fcdcbadf9be324`:

- branch is 8 commits ahead / 0 behind,
- changed surface is limited to this workflow file, roadmap, `index.html`, `src/im14c-runtime-evidence.js`, `src/runtime/config.js`, `src/ui/app.css`, and `src/ui/runtime-hud-projection.js`,
- `src/main.js` is unchanged,
- no IM-14D Selection/Context semantics and no new Camera/Gameplay/Persistence ownership were introduced.

Technical evidence on `3b6273531fbca76ada1c6f17b44d04032951c816`:

- CI Baseline run `34192108518`: **SUCCESS**,
- Pages build/deployment run `34192108143`: **SUCCESS**.

Real-device evidence:

- iPhone / Safari, 2026-09-08 07:51 local: **READY / PASS / 0 BLOCKER**,
- visible HUD: `Bevölkerung: 3`, `Gold: 3`,
- visible gate: `IM-14C – Runtime HUD Projection – PASS`, `Population Source PASS`, `Gold Source PASS`, `Read-only Ownership PASS`, `Build Identity PASS`,
- frozen IM-14A mobile shell remains visibly intact.

**Gate result: IM-14C = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 5. Current gate

The complete IM-14 block remains **IN PROGRESS / NOT FROZEN**.

No IM-14D implementation is authorized by the IM-14C freeze itself. The next permissible action is exclusively **reconciliation/definition of IM-14D – World Selection & Context Projection against frozen IM-14C**. Implementation requires separate explicit authorization after that contract is reconciled and accepted.

## 6. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-14C COMPLETE / FROZEN / PASS / 0 BLOCKER after regression, CI/Pages success and real iPhone/Safari evidence. IM-14 whole block remains NOT FROZEN; next permissible action is IM-14D reconciliation/definition only.
