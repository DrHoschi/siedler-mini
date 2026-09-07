# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-block branch: `feature/im-13-savegame-foundation`
- Whole-block branch base: frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`
- Frozen predecessor: **CR-32 – Path / Wear Integration Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current migration block: **IM-13 – Deterministic SaveGame Snapshot / Restore Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-13A – SaveGame Snapshot Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-13B – Deterministic SaveGame Validation Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-13C – Deterministic SaveGame Restore Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-13D – Deterministic Restored Runtime Activation & Derived Rebinding Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-13 Whole-Block Completion / Regression / Freeze Gate: **COMPLETE / PASS / 0 BLOCKER**

## 2. Binding IM-13 Foundation contract

IM-13 is persistence only. It captures, serializes, validates, restores and activates existing authoritative runtime truth without becoming a gameplay owner.

Binding requirements:

- authoritative World/Map identity and state persist,
- authoritative domain state persists,
- Gold balance persists as non-physical economy truth,
- CR-32 PATH/ROAD wear persists,
- Stable IDs and allocator continuity survive Save -> Restore,
- capture occurs only at a completed deterministic simulation-step boundary,
- payload is canonical and versioned from schemaVersion 1,
- invalid schema/reference/allocator/Gold/Wear state is rejected deterministically without silent repair,
- restore is all-or-nothing and reconstructs authoritative owners without gameplay mutation,
- restored state is atomically activated and dependent transient/derived integrations are rebound,
- Population remains derived/non-persisted,
- pathfinder/routes/traversal costs/render projections/reachability/navigation results are derived/transient rather than persisted,
- Camera remains non-persisted view state,
- frozen Navigation/Path/Wear/Movement/Traffic/Reservation/Deadlock/Recovery ownership remains unchanged.

Explicitly excluded remain Save Slots, LocalStorage/file adapters, save/load UI, autosave, cloud/multiplayer synchronization, compression/encryption, historical schema migration beyond schemaVersion 1, new gameplay rules, IM-14 UI/Mobile and IM-15 Guidance/Inspector.

## 3. Frozen IM-13 substeps

- IM-13A frozen marker: `frozen/im-13a-savegame-snapshot-contract` @ `fadacda7f728f57b3b97cbb1771284e5d609d805`.
- IM-13B frozen marker: `frozen/im-13b-deterministic-savegame-validation-contract` @ `0a4b225d86e239cc2b2d80c20166faafe483aa20`.
- IM-13C frozen marker: `frozen/im-13c-deterministic-savegame-restore-contract` @ `21aa0a3e42f84cb713bc681467cd3a0b075f2bff`.
- IM-13D frozen marker: `frozen/im-13d-deterministic-restored-runtime-activation-derived-rebinding-contract` @ `f34d8012f1562bba7879858b860920a3c67471b8`.

Together A+B+C+D implement the reconciled IM-13 Foundation chain:

`active Runtime A -> Capture -> Serialize/Parse -> Validate -> Restore B -> Activate B -> active Runtime B -> Capture B`

with canonical Capture A/Capture B identity and B-backed derived rebinding.

## 4. Whole-Block completion evidence

The Whole-Block gate introduced no gameplay or persistence feature. It only regressed the four frozen contracts together and exposed a matching browser/device verification surface.

Completion evidence:

- `src/dev/im-13-freeze-gate.node.js` executes frozen IM-13A/B/C/D regressions as one Whole-Block gate,
- CI SUCCESS / 0 blocker including frozen CR-31/CR-32 predecessor regression,
- GitHub Pages deployment SUCCESS,
- full whole-branch diff against frozen CR-32 reviewed and within the original IM-13 persistence boundary,
- visible/build identity `IM-13-WHOLE-BLOCK-COMPLETION-REGRESSION-FREEZE-GATE`,
- real iPhone/Safari evidence on 2026-09-07 20:10 local: READY, correct `IM-13 – Whole-Block Completion / Regression / Freeze Gate` identity, PASS / 0 BLOCKER, A Snapshot PASS, B Validation PASS, C Restore PASS, D Activation/Rebinding PASS, Capture A -> Restore/Activate B -> Capture B IDENTISCH, schemaVersion 1, stable runtime owners active PASS, derived/transient rebound PASS, and excluded Save-Slots/Storage/UI, Autosave, Cloud/Multiplayer and Schema-Migration not introduced.

## 5. Current gate

**IM-13 WHOLE-BLOCK = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The next migration block is not automatically implementation-authorized by this freeze. IM-14 UI/Mobile, IM-15 Guidance/Inspector and any Save-Slots/Storage, Autosave, Cloud/Multiplayer or Schema-Migration work remain locked until separately reconciled/authorized.

## 6. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-13 Whole-Block Completion / Regression / Freeze Gate PASS / 0 BLOCKER with real iPhone/Safari evidence; IM-13 frozen as a whole.
