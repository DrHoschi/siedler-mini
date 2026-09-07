# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-block branch: `feature/im-13-savegame-foundation`
- Whole-block branch base: frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`
- Frozen predecessor: **CR-32 – Path / Wear Integration Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current migration block: **IM-13 – Deterministic SaveGame Snapshot / Restore Foundation**
- IM-13: **IMPLEMENTATION-AUTHORIZED / IN PROGRESS**
- IM-13A – SaveGame Snapshot Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-13A freeze marker: `frozen/im-13a-savegame-snapshot-contract` @ `fadacda7f728f57b3b97cbb1771284e5d609d805`
- IM-13B – Deterministic SaveGame Validation Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-13B freeze marker: `frozen/im-13b-deterministic-savegame-validation-contract` @ `0a4b225d86e239cc2b2d80c20166faafe483aa20`
- IM-13C – Deterministic SaveGame Restore Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-13C freeze marker: `frozen/im-13c-deterministic-savegame-restore-contract` @ `21aa0a3e42f84cb713bc681467cd3a0b075f2bff`
- IM-13D – Deterministic Restored Runtime Activation & Derived Rebinding Contract: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**

## 2. Frozen CR-32 boundary

CR-32 remains fully frozen. Navigation, Path/Wear, Movement, Traffic, Reservation, Deadlock and Recovery ownership are unchanged. `wearCostPerUnit = 0.01` and the existing deterministic pathfinder/route ownership remain authoritative.

## 3. IM-13 binding boundary

IM-13 is persistence only. It may capture, serialize, validate, restore and activate existing authoritative runtime state but must not become a gameplay owner.

Binding principles:

- persist authoritative state; recompute derived/transient views,
- preserve Stable IDs and allocator continuity,
- persistence-relevant state includes World/Map identity, domain stores, Gold balance and CR-32 PATH/ROAD wear,
- capture only at a completed deterministic simulation-step boundary,
- version payloads from the first schema,
- reject invalid schemas/references/state deterministically,
- no SaveGame UI, storage adapters, cloud sync, multiplayer sync, new gameplay rules or ownership changes in this foundation.

## 4. IM-13A frozen contract

IM-13A defines the canonical schemaVersion-1 snapshot/capture boundary for World/Map, CoreDomainStores plus allocators, Gold and CR-32 PATH/ROAD wear with deterministic canonical serialization. Derived Population, Camera/Render state and route/pathfinder results are not persisted.

IM-13A is frozen at `fadacda7f728f57b3b97cbb1771284e5d609d805`.

## 5. IM-13B frozen contract

IM-13B provides deterministic side-effect-free validation of the frozen IM-13A payload before restore mutation, including schema/capture metadata, globally unique Stable IDs, allocator continuity, World/Map/Domain references, Gold and CR-32 PATH/ROAD wear consistency, deterministic INVALID errors and no silent repair/defaulting/coercion.

IM-13B is frozen at `0a4b225d86e239cc2b2d80c20166faafe483aa20`.

## 6. IM-13C frozen contract

IM-13C reconstructs a complete authoritative replacement state only after IM-13B returns `VALID`. Restore is all-or-nothing and preserves exact World/Map/Tile/Cell/domain Stable IDs, saved revisions, allocator continuity, Gold and CR-32 wear without mutation replay, economy settlement or wear recalculation. The deterministic round-trip proof is Capture A -> Serialize/Parse -> IM-13B VALID -> Restore B -> Capture B with canonical snapshot identity.

IM-13C is frozen at `21aa0a3e42f84cb713bc681467cd3a0b075f2bff` with CI and real iPhone/Safari PASS evidence and 0 blockers.

## 7. IM-13D implemented contract

IM-13D is the final reconciled IM-13 Foundation substep. IM-13C reconstructs authoritative state B; IM-13D makes only an already successful IM-13C `RESTORED` state B the new active runtime truth and rebinds dependent transient/derived integrations. IM-13D does not duplicate or alter IM-13C restore logic.

Implemented behavior:

- `RestoredRuntimeActivationContract` accepts only IM-13C `RESTORED` results,
- active World/Map/CoreDomainStores/Gold/Path-Classification/Path-Wear owners are published as one active composition,
- B-derived World-backed Traversability is constructed before publish,
- Reachability and Runtime Entity Navigation validation closures are rebound to B,
- Render Projection is rebound to B Map/Domain truth,
- the browser runtime render owner is switched by one composition publish hook so subsequent render/pan/zoom reads B,
- Population is explicitly non-persisted/derived and activation performs no population mutation,
- Gold and Wear are adopted from IM-13C without settlement or recalculation,
- Camera remains independent non-persisted view state,
- failed publish leaves the prior active composition unchanged,
- raw snapshots and non-RESTORED inputs are rejected for activation.

Required implementation regression is encoded as:

`active Runtime A -> Capture A -> Serialize/Parse -> IM-13B VALID -> IM-13C Restore B -> IM-13D Activate B -> active Runtime B -> Capture B`

with canonical Capture A/Capture B identity plus explicit B-owner, Traversability, Navigation, Reachability, Render Projection and failed-activation checks.

Explicitly excluded remain Save Slots, storage adapters, save/load UI, autosave, cloud/multiplayer sync, historical schema migration, compression/encryption, new gameplay rules, IM-14 UI/Mobile and IM-15 Guidance/Inspector.

## 8. Current gate

**IM-13D is IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN.**

The next permissible step is exclusively IM-13D Verification / Regression / Freeze Gate. IM-13 Whole-Block Completion / Regression / Freeze Gate remains locked until IM-13D is verified and frozen. No further IM-13 Foundation substep is currently planned after D.

No later SaveGame/storage/UI/schema-migration block is automatically authorized. IM-14 UI/Mobile and IM-15 Guidance/Inspector remain locked.

## 9. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-13D implemented; verification pending; Whole-IM-13 freeze and later persistence/UI/migration work remain locked.
