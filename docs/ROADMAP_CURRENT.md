# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 FROZEN / IM-14A FROZEN / IM-14B FROZEN / IM-14C FROZEN / IM-14D FROZEN / IM-14 WHOLE BLOCK IN PROGRESS / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-14-ui-mobile-foundation`  
**Whole-block base:** frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13A through IM-13D and whole IM-13 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14A – Player UI Shell & Responsive Surface Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14B – Unified Pointer / Touch Interaction Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14C – Runtime HUD Projection is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `frozen/im-14c-runtime-hud-projection` @ `788358677092ef91d7edf1c0d8a6a82efacc5f21`.

IM-14D – World Selection & Context Projection is **COMPLETE / FROZEN / PASS / 0 BLOCKER** after its Completion / Regression / Freeze Gate.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — IN PROGRESS / NOT FROZEN**,
- IM-15 – Guidance/Inspector.

## 3. Reconciled IM-14 Foundation direction

Current sequence:

- **IM-14A – Player UI Shell & Responsive Surface Contract — COMPLETE / FROZEN**,
- **IM-14B – Unified Pointer / Touch Interaction Contract — COMPLETE / FROZEN**,
- **IM-14C – Runtime HUD Projection — COMPLETE / FROZEN**,
- **IM-14D – World Selection & Context Projection — COMPLETE / FROZEN**,
- IM-14E – Player Camera Controls Integration,
- IM-14 Whole-Block Completion / Regression / Freeze Gate.

Later steps are not automatically authorized by the IM-14D freeze.

## 4. Frozen IM-14D boundary

IM-14D is frozen as ephemeral read-only selection/context projection for already visible Buildings and Persons:

- world Tap/Click selects; empty-world Tap/Click clears,
- Drag/Pan and Multi-Touch do not create selection,
- deterministic hit testing uses camera-projected visible render-command geometry,
- overlap priority Person before Building, then stable source ID,
- selection is only `null` or `{ kind, id }`,
- Building context is limited to ID/definitionId/visibleState,
- Person context is limited to ID/visibleState,
- no context action or domain mutation is introduced,
- `src/main.js` remains unchanged and no new camera-control semantics are introduced.

Authoritative final pre-freeze branch HEAD: `b6ef61188e26dbbc0462bfedbb897f11b210cc53`.

Freeze evidence:

- full diff against frozen IM-14C `788358677092ef91d7edf1c0d8a6a82efacc5f21`: 7 commits ahead / 0 behind and limited to IM-14D/control surfaces,
- CI Baseline run `34199822307`: **SUCCESS** on `72a3e8ac092fa58d9c0f580823471c3d3048ca54`,
- only `docs/ROADMAP_CURRENT.md` changed between that CI-verified state and final pre-freeze HEAD `b6ef61188e26dbbc0462bfedbb897f11b210cc53`,
- Pages build/deployment run `34199874533`: **SUCCESS** on final pre-freeze HEAD,
- real iPhone/Safari interaction evidence at 2026-09-08 09:37–09:41 local: **PASS / 0 BLOCKER** for selection, context projection, empty-world clear, drag/pan guard and pinch/zoom guard.

## 5. Current gate

The complete IM-14 block remains **IN PROGRESS / NOT FROZEN**.

There is no automatically authorized implementation successor. The next permissible action is exclusively **reconciliation/definition of IM-14E – Player Camera Controls Integration against frozen IM-14D**. IM-14E implementation requires separate explicit authorization after its contract is reconciled and accepted.

---

**Updated:** 2026-09-08 — IM-14D COMPLETE / FROZEN / PASS / 0 BLOCKER. IM-14 whole block remains NOT FROZEN. Next permissible action: IM-14E reconciliation/definition only.
