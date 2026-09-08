# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 FROZEN / IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Whole-block branch:** `feature/im-14-ui-mobile-foundation`  
**Whole-block base:** frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-14 – UI / Mobile Foundation is now COMPLETE / FROZEN / PASS / 0 BLOCKER as a whole block.**

Its frozen substeps are:

- IM-14A – Player UI Shell & Responsive Surface Contract,
- IM-14B – Unified Pointer / Touch Interaction Contract,
- IM-14C – Runtime HUD Projection,
- IM-14D – World Selection & Context Projection,
- IM-14E – Player Camera Controls Integration.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — COMPLETE / FROZEN**,
- IM-15 – Guidance/Inspector.

## 3. Frozen IM-14 composition

IM-14 establishes the player-facing UI/mobile foundation without transferring gameplay/domain/persistence ownership into UI:

- responsive safe-area-aware Player UI Shell,
- neutral unified Pointer/Touch transport and UI-vs-WORLD classification,
- read-only Population/Gold HUD projection,
- ephemeral Building/Person selection and read-only Context projection,
- shared-input player camera Pan/Pinch/Wheel integration using the frozen camera policy.

The following remain outside IM-14:

- new gameplay/context actions,
- Save/Load UI or persistence ownership,
- minimap,
- Inspector/Guidance,
- camera inertia/edge scrolling/WASD/world clamps,
- new domain/simulation ownership.

## 4. IM-14 Whole-Block Completion / Regression / Freeze Gate

Final pre-whole-block-freeze branch HEAD: `053d4cc7f8befdb747ebce9afb755f286e2b0682`.

Full branch regression against frozen IM-13 `0a011af99ea8814b9e3555d7075ee091cfaf05c2`:

- **51 commits ahead / 0 behind**,
- changed surface limited to IM-14 control, evidence, responsive UI, HUD, unified input, selection/context and camera-integration surfaces,
- all planned IM-14 substeps A–E individually frozen before the whole-block gate,
- no unrelated domain/gameplay/persistence/Inspector implementation introduced.

Technical evidence:

- final functional/evidence state `e3df3aca45a1fa156447ba302188227fd3718125`: CI Baseline `34203676233` **SUCCESS**, Pages `34203675151` **SUCCESS**,
- only `docs/DEVELOPMENT_WORKFLOW_CURRENT.md` and `docs/ROADMAP_CURRENT.md` changed between that state and final pre-whole-block-freeze HEAD,
- Pages run `34204224161` on `053d4cc7f8befdb747ebce9afb755f286e2b0682`: **SUCCESS**.

Combined real-device evidence:

- IM-14A shell: iPhone + iPad **PASS / 0 BLOCKER**,
- IM-14B unified input: iPhone + iPad **PASS / 0 BLOCKER**,
- IM-14C HUD: iPhone **PASS / 0 BLOCKER**,
- IM-14D selection/context/gesture guard: iPhone **PASS / 0 BLOCKER**,
- IM-14E Pan/Pinch/selection regression/frozen camera policy: iPhone **PASS / 0 BLOCKER**.

**Whole-block result: IM-14 = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 5. Current gate

No further IM-14 feature work is authorized.

According to the binding migration order, the next migration block is **IM-15 – Guidance / Inspector**. The IM-14 freeze does not automatically authorize IM-15 implementation. The next permissible action is reconciliation/definition of the next block against frozen IM-14 before any implementation begins.

---

**Updated:** 2026-09-08 — IM-14 UI / Mobile Foundation COMPLETE / FROZEN / PASS / 0 BLOCKER after whole-block regression and combined CI/Pages/device evidence.
