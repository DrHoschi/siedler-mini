# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 FROZEN / IM-14A FROZEN / IM-14B FROZEN / IM-14C FROZEN / IM-14 WHOLE BLOCK IN PROGRESS / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-14-ui-mobile-foundation`  
**Whole-block base:** frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13A through IM-13D and whole IM-13 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14A – Player UI Shell & Responsive Surface Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `4ba4e152931058c9e6b62e2e26489f378779e80f`.

IM-14B – Unified Pointer / Touch Interaction Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at frozen marker `frozen/im-14b-unified-pointer-touch-interaction-contract` @ `8aa7594f4debcc838382ca6f49fcdcbadf9be324`.

IM-14C – Runtime HUD Projection is **COMPLETE / FROZEN / PASS / 0 BLOCKER** after its Completion / Regression / Freeze Gate.

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
- **IM-14C – Runtime HUD Projection — COMPLETE / FROZEN**,
- IM-14D – World Selection & Context Projection,
- IM-14E – Player Camera Controls Integration,
- IM-14 Whole-Block Completion / Regression / Freeze Gate.

Later substeps are not automatically authorized by the IM-14C freeze.

## 4. Frozen predecessor boundaries

IM-14A remains the authoritative responsive Player UI Shell boundary with distinct Topbar, World/Canvas and Action regions, mobile/desktop viewport support, safe-area handling and Canvas↔World binding.

IM-14B remains the neutral unified Pointer/Touch transport/lifecycle boundary with deterministic UI vs WORLD classification, pointerId lifecycle tracking and no Selection, Gameplay or Camera meaning.

## 5. Frozen IM-14C – Runtime HUD Projection

IM-14C is frozen as a read-only player-facing projection over authoritative Runtime data:

- population source exclusively `housingPopulation.population.count`,
- gold source exclusively `goldEconomy.snapshot().balance`,
- immutable deterministic HUD view model,
- compact Topbar projection for Bevölkerung and Gold,
- DOM-only render/refresh without domain mutation,
- responsive integration into the frozen IM-14A shell,
- synchronized `IM-14C-RUNTIME-HUD-PROJECTION` visible/build identity.

The authoritative pre-freeze implementation/evidence head is `3b6273531fbca76ada1c6f17b44d04032951c816`.

Freeze evidence:

- full diff against frozen IM-14B `8aa7594f4debcc838382ca6f49fcdcbadf9be324`: 8 commits ahead / 0 behind and limited to IM-14C/control surfaces,
- `src/main.js` unchanged,
- CI Baseline run `34192108518`: **SUCCESS** on `3b6273531fbca76ada1c6f17b44d04032951c816`,
- Pages build/deployment run `34192108143`: **SUCCESS** on the same head,
- real iPhone/Safari evidence at 2026-09-08 07:51 local: **READY / PASS / 0 BLOCKER**, showing `Bevölkerung: 3`, `Gold: 3` and all IM-14C evidence checks PASS.

Explicitly not introduced:

- world/entity selection or context projection,
- Tap = Select or other gameplay meaning,
- new camera Pan/Zoom semantics,
- population/housing mutation,
- gold settlement, spending or income mutation,
- production/stock/workforce/transport controls,
- Save/Load UI,
- minimap, notifications or Inspector,
- new gameplay/domain/persistence ownership.

## 6. Current gate

The complete IM-14 block remains **IN PROGRESS / NOT FROZEN**.

There is no automatically authorized implementation successor. The next permissible action is exclusively **reconciliation/definition of IM-14D – World Selection & Context Projection against frozen IM-14C**. IM-14D implementation requires separate explicit authorization after that contract is reconciled and accepted.

---

**Updated:** 2026-09-08 — IM-14C COMPLETE / FROZEN / PASS / 0 BLOCKER. IM-14 whole block remains NOT FROZEN. Next permissible action: IM-14D reconciliation/definition only.
