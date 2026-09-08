# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13 FROZEN / IM-14A FROZEN / IM-14B FROZEN / IM-14C FROZEN / IM-14D FROZEN / IM-14E FROZEN / IM-14 WHOLE BLOCK IN PROGRESS / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-14-ui-mobile-foundation`  
**Whole-block base:** frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 and IM-14A through IM-14E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Latest frozen predecessor before whole-block gate:

- `frozen/im-14d-world-selection-context-projection` @ `72b234e0ada95afa324d62d83274ee1f320abe37`,
- IM-14E frozen after its own Completion / Regression / Freeze Gate.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — IN PROGRESS / NOT FROZEN**,
- IM-15 – Guidance/Inspector.

## 3. IM-14 sequence

- **IM-14A – Player UI Shell & Responsive Surface Contract — COMPLETE / FROZEN**,
- **IM-14B – Unified Pointer / Touch Interaction Contract — COMPLETE / FROZEN**,
- **IM-14C – Runtime HUD Projection — COMPLETE / FROZEN**,
- **IM-14D – World Selection & Context Projection — COMPLETE / FROZEN**,
- **IM-14E – Player Camera Controls Integration — COMPLETE / FROZEN**,
- **IM-14 Whole-Block Completion / Regression / Freeze Gate — NEXT / NOT YET EXECUTED**.

## 4. Frozen predecessor boundaries

IM-14A remains Player UI Shell/layout owner.

IM-14B remains neutral Pointer/Touch transport/lifecycle owner.

IM-14C remains read-only Runtime HUD owner.

IM-14D remains ephemeral Selection/Context owner; Tap/Click selects, empty world clears, Drag/Pinch does not select.

IM-14E now owns only player gesture interpretation into the already frozen camera-control functions using the shared WORLD input boundary.

## 5. Frozen IM-14E – Player Camera Controls Integration

IM-14E is **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative final pre-freeze implementation/evidence head: `e3df3aca45a1fa156447ba302188227fd3718125`.

Frozen boundary:

- sole authoritative `cameraState` preserved,
- frozen camera-control functions and zoom limits `0.5 .. 3.0` preserved,
- shared IM-14D/IM-14B WORLD input is the pointer source,
- one pointer movement -> Pan,
- two pointers -> midpoint Pan + anchor Pinch Zoom,
- Wheel -> anchor zoom,
- former parallel direct Canvas pointer/wheel camera pipeline removed from `src/main.js`,
- no double pointer-processing ownership,
- IM-14D Selection continues on the same shared WORLD input,
- no new camera policy, gameplay/domain/persistence ownership or Inspector.

Freeze evidence:

- full diff against frozen IM-14D `72b234e0ada95afa324d62d83274ee1f320abe37`: 11 commits ahead / 0 behind and limited to IM-14E/control surfaces,
- CI Baseline run `34203676233`: **SUCCESS** on `e3df3aca45a1fa156447ba302188227fd3718125`,
- Pages build/deployment run `34203675151`: **SUCCESS** on the same head,
- first device run identified only an evidence defect in the Frozen Camera Policy check caused by object-identity comparison across cache-versioned module instances,
- evidence correction changed only the comparison method to semantic limit/clamp verification; camera behavior/policy remained unchanged,
- corrected real iPhone/Safari evidence at 2026-09-08 10:18 local: **READY / PASS / 0 BLOCKER** with Unified Camera Input, Single-Pointer Pan, Pinch Zoom, Wheel Zoom, Selection Regression, No Double Processing, Frozen Camera Policy and Build Identity all PASS,
- manual iPhone interaction at 10:13–10:14 confirmed one-finger Pan, two-finger zoom in/out, Pan after zoom, Building/Person selection and no accidental selection during Drag/Pinch.

## 6. Current gate

The complete IM-14 block remains **IN PROGRESS / NOT FROZEN**.

All planned substeps IM-14A through IM-14E are individually frozen. The next and only permissible action is the separate **IM-14 Whole-Block Completion / Regression / Freeze Gate**, combining the frozen A–E boundaries, full branch diff, CI/Pages evidence and real-device evidence. No new IM-14 feature implementation is authorized before that gate.

---

**Updated:** 2026-09-08 — IM-14E COMPLETE / FROZEN / PASS / 0 BLOCKER. All IM-14 substeps A–E are individually frozen. IM-14 whole block remains NOT FROZEN; next permissible action is the Whole-Block Completion / Regression / Freeze Gate only.
