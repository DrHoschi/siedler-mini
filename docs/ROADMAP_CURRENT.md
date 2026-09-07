# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13A/B/C FROZEN / IM-13D IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-13-savegame-foundation`  
**Whole-block base:** frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**. CR-32 – Path / Wear Integration Foundation is the direct frozen predecessor of IM-13.

IM-13A – SaveGame Snapshot Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `fadacda7f728f57b3b97cbb1771284e5d609d805`, marker `frozen/im-13a-savegame-snapshot-contract`.

IM-13B – Deterministic SaveGame Validation Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `0a4b225d86e239cc2b2d80c20166faafe483aa20`, marker `frozen/im-13b-deterministic-savegame-validation-contract`.

IM-13C – Deterministic SaveGame Restore Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `21aa0a3e42f84cb713bc681467cd3a0b075f2bff`, marker `frozen/im-13c-deterministic-savegame-restore-contract`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame**,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

## 3. IM-13 – Deterministic SaveGame Snapshot / Restore Foundation

Status: **IMPLEMENTATION-AUTHORIZED / IN PROGRESS**.

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

## 7. IM-13 Whole-Block Reconciliation result

A+B+C close the persistence core but do not activate the restored replacement owner set inside the running runtime composition. Therefore the final reconciled Foundation substep is **IM-13D – Deterministic Restored Runtime Activation & Derived Rebinding Contract**. No further IM-13 Foundation substep is currently planned after D.

## 8. IM-13D – Deterministic Restored Runtime Activation & Derived Rebinding Contract

Status: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**.

Implemented scope:

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

Implemented regression target:

`active Runtime A -> Capture A -> Serialize/Parse -> IM-13B VALID -> IM-13C Restore B -> IM-13D Activate B -> active Runtime B -> Capture B`

with canonical Capture A/Capture B identity and explicit B-owner, Traversability, Navigation, Reachability, Render Projection and failed-activation checks.

Visible/build identity is now `IM-13D-RESTORED-RUNTIME-ACTIVATION-CONTRACT` with matching IM-13D browser surface.

Explicitly excluded remain Save Slots/storage adapters, LocalStorage/file system, save/load UI, autosave, cloud/multiplayer synchronization, historical schema migration beyond schemaVersion 1, compression/encryption, new gameplay rules, IM-14 UI/Mobile and IM-15 Guidance/Inspector.

## 9. Current gate

The next permissible step is exclusively **IM-13D Verification / Regression / Freeze Gate**.

IM-13 Whole-Block Completion / Regression / Freeze Gate remains locked until IM-13D is verified and frozen. After a successful IM-13D freeze, the next permissible step is directly the IM-13 Whole-Block Completion / Regression / Freeze Gate; no additional IM-13 Foundation substep is currently planned.

No later SaveGame/storage/UI/schema-migration step is automatically authorized.

---

**Updated:** 2026-09-07 — IM-13D implemented; verification pending; Whole-IM-13 freeze remains locked.
