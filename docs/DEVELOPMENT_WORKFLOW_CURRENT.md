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
- IM-14D – World Selection & Context Projection: **COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen predecessor line

IM-14A remains authoritative for Player UI Shell/layout, IM-14B for neutral Pointer/Touch transport/lifecycle, and IM-14C for the read-only Runtime HUD projection.

Frozen markers:

- `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`
- `frozen/im-14b-unified-pointer-touch-interaction-contract` @ `8aa7594f4debcc838382ca6f49fcdcbadf9be324`
- `frozen/im-14c-runtime-hud-projection` @ `788358677092ef91d7edf1c0d8a6a82efacc5f21`

## 3. Frozen IM-14D contract

IM-14D introduces only ephemeral selection and read-only context projection for already visible Runtime objects.

Frozen requirements:

- selectable scope limited to visible projected `building` and `person` objects,
- world Tap/Click may acquire selection; empty-world Tap/Click clears selection,
- Drag/Pan and Multi-Touch must not create selection,
- hit testing uses the same camera-projected render-command geometry as visible rendering,
- deterministic overlap priority is `person` before `building`, then stable source ID,
- selection state is ephemeral UI state only: `null` or `{ kind, id }`,
- selected domain/runtime objects are never mutated by selection,
- read-only context projection is limited to Building ID/definitionId/visibleState or Person ID/visibleState,
- no context actions are introduced,
- IM-14A shell ownership, IM-14B neutral input ownership and IM-14C HUD ownership remain unchanged,
- visible/build identity is `IM-14D-WORLD-SELECTION-CONTEXT-PROJECTION`.

Explicitly excluded from IM-14D:

- terrain/cell selection,
- build placement or construction/context actions,
- stock/workforce/transport/housing/economy controls,
- persistent selection or SaveGame ownership,
- new camera Pan/Zoom semantics,
- IM-14E player camera-control integration,
- Inspector,
- gameplay/domain/persistence mutation.

## 4. IM-14D Completion / Regression / Freeze Gate

Authoritative final pre-freeze branch HEAD: `b6ef61188e26dbbc0462bfedbb897f11b210cc53`.

Regression against frozen IM-14C @ `788358677092ef91d7edf1c0d8a6a82efacc5f21`:

- branch is 7 commits ahead / 0 behind,
- changed surface is limited to this workflow file, roadmap, `index.html`, `src/im14d-runtime-evidence.js`, `src/runtime/config.js`, `src/ui/app.css`, and `src/ui/world-selection-context-projection.js`,
- `src/main.js` is unchanged,
- no IM-14E camera-control semantics and no gameplay/domain/persistence mutation were introduced.

Technical evidence:

- CI Baseline run `34199822307`: **SUCCESS** on `72a3e8ac092fa58d9c0f580823471c3d3048ca54`,
- the only change from `72a3e8ac092fa58d9c0f580823471c3d3048ca54` to final pre-freeze HEAD `b6ef61188e26dbbc0462bfedbb897f11b210cc53` is `docs/ROADMAP_CURRENT.md`; no runtime/config/UI/selection behavior changed after successful CI,
- Pages build/deployment run `34199874533`: **SUCCESS** on final pre-freeze HEAD `b6ef61188e26dbbc0462bfedbb897f11b210cc53`.

Real-device evidence:

- iPhone / Safari, 2026-09-08 09:37–09:41 local: **PASS / 0 BLOCKER**,
- visible browser gate shows World Selection PASS, Empty World Clear PASS, Drag/Multi-touch Guard PASS, Context Projection PASS, Read-only Ownership PASS and Build Identity PASS,
- real tap on a Building changes context from `Keine Auswahl` to a read-only Building context (`building:00000003 · STOREHOUSE · …`),
- user manually confirmed empty-world clear, repeated drag/pan with and without selection, and pinch/zoom all work without accidental selection,
- frozen HUD and mobile shell remain intact.

**Gate result: IM-14D = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 5. Current gate

The complete IM-14 block remains **IN PROGRESS / NOT FROZEN**.

IM-14D freeze does not automatically authorize IM-14E implementation. The next permissible action is exclusively **reconciliation/definition of IM-14E – Player Camera Controls Integration against frozen IM-14D**. Implementation requires separate explicit authorization after that contract is reconciled and accepted.

## 6. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-14D COMPLETE / FROZEN / PASS / 0 BLOCKER after full regression, CI/Pages success and real iPhone/Safari interaction evidence. IM-14 whole block remains NOT FROZEN; next permissible action is IM-14E reconciliation/definition only.
