# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13A/B/C/D FROZEN / IM-13 WHOLE-BLOCK FREEZE NOT YET AUTHORIZED  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-13-savegame-foundation`  
**Whole-block base:** frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**. CR-32 – Path / Wear Integration Foundation is the direct frozen predecessor of IM-13.

IM-13A – SaveGame Snapshot Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `fadacda7f728f57b3b97cbb1771284e5d609d805`, marker `frozen/im-13a-savegame-snapshot-contract`.

IM-13B – Deterministic SaveGame Validation Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `0a4b225d86e239cc2b2d80c20166faafe483aa20`, marker `frozen/im-13b-deterministic-savegame-validation-contract`.

IM-13C – Deterministic SaveGame Restore Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `21aa0a3e42f84cb713bc681467cd3a0b075f2bff`, marker `frozen/im-13c-deterministic-savegame-restore-contract`.

IM-13D – Deterministic Restored Runtime Activation & Derived Rebinding Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER**, marker `frozen/im-13d-deterministic-restored-runtime-activation-derived-rebinding-contract`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame**,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

## 3. IM-13 – Deterministic SaveGame Snapshot / Restore Foundation

Status: **IMPLEMENTATION-AUTHORIZED / IN PROGRESS / WHOLE-BLOCK NOT YET FROZEN**.

Whole-block branch: `feature/im-13-savegame-foundation`, created exactly from frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`.

Binding boundary: persist existing authoritative truth, preserve Stable IDs/allocator continuity, persist World/Map, domain state, Gold and CR-32 PATH/ROAD wear, recompute derived/transient views, capture only at completed deterministic simulation-step boundaries, version payloads, and do not alter frozen gameplay ownership.

## 4. IM-13A – SaveGame Snapshot Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen scope: canonical schemaVersion-1 snapshot/capture, World/Map, CoreDomainStores plus allocators, Gold, CR-32 wear and deterministic canonical serialization.

## 5. IM-13B – Deterministic SaveGame Validation Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen scope: deterministic side-effect-free validation of the frozen IM-13A payload, including schema/capture, Stable-ID uniqueness, allocator continuity, World/Map/Domain references, Gold and CR-32 wear consistency, deterministic INVALID results and no silent repair.

## 6. IM-13C – Deterministic SaveGame Restore Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen scope: IM-13B-validated all-or-nothing reconstruction of a complete authoritative replacement World/Map/Domain/Gold/Path-Wear state with exact Stable IDs, revisions and allocator continuity, plus deterministic Capture A -> Restore B -> Capture B canonical identity and rejected-restore non-mutation.

## 7. IM-13D – Deterministic Restored Runtime Activation & Derived Rebinding Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen scope:

- only an already successful IM-13C `RESTORED` result is activatable,
- active World/Map/CoreDomainStores/Gold/Path-Classification/Path-Wear are published as one atomic runtime composition,
- dependent World-backed Traversability is rebuilt from B before publish,
- Reachability and Runtime Entity Navigation validation are rebound to B,
- Render Projection reads B Map/Domain truth after activation and the browser render path follows the active composition,
- Population remains explicitly derived/non-persisted and activation performs no population mutation,
- Gold and CR-32 wear are adopted without settlement/recalculation,
- Camera remains independent non-persisted view state,
- failed publish keeps prior active composition A,
- raw snapshots and non-RESTORED inputs are rejected,
- IM-13C restore logic is not duplicated or changed.

Verified end-to-end chain:

`active Runtime A -> Capture A -> Serialize/Parse -> IM-13B VALID -> IM-13C Restore B -> IM-13D Activate B -> active Runtime B -> Capture B`

with canonical Capture A/Capture B identity and explicit B-owner, Traversability, Navigation, Reachability, Render Projection and failed-activation checks.

Freeze evidence: implementation head `caae631f8985a7100d13adc31f5d0c489cb0307d`; CI Baseline run `34148749832` SUCCESS; Pages deployment SUCCESS; real iPhone/Safari PASS evidence with correct visible IM-13D identity and all required B-rebinding/round-trip/failure checks; full diff against frozen IM-13C remains within the authorized D boundary. Result: **PASS / 0 BLOCKER**.

Explicitly excluded remain Save Slots/storage adapters, LocalStorage/file system, save/load UI, autosave, cloud/multiplayer synchronization, historical schema migration beyond schemaVersion 1, compression/encryption, new gameplay rules, IM-14 UI/Mobile and IM-15 Guidance/Inspector.

## 8. IM-13 Foundation reconciliation status

All four reconciled Foundation substeps A+B+C+D are now individually frozen. No further IM-13 Foundation substep is planned.

This does **not** automatically freeze IM-13 as a whole. Whole-block closure still requires a separate final reconciliation/regression/freeze gate against the original binding IM-13 contract and all four frozen substeps together.

## 9. Current gate

The next exclusively permissible step is **IM-13 Whole-Block Completion / Regression / Freeze Gate**.

That Whole-Block gate is not executed or implicitly authorized by the IM-13D freeze itself. IM-14 UI/Mobile, IM-15 Guidance/Inspector, Save-Slots/Storage, autosave, cloud/multiplayer sync and schema migration remain locked until Whole-IM-13 has separately passed and been frozen.

---

**Updated:** 2026-09-07 — IM-13D COMPLETE / FROZEN / PASS / 0 BLOCKER; A+B+C+D individually frozen; next gate is Whole-IM-13 Completion / Regression / Freeze only.
