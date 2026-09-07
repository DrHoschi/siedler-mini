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
- IM-13D – Deterministic Restored Runtime Activation & Derived Rebinding Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-13D freeze marker: `frozen/im-13d-deterministic-restored-runtime-activation-derived-rebinding-contract`

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

## 7. IM-13D frozen contract

IM-13D is the final reconciled IM-13 Foundation substep. It makes only an already successful IM-13C `RESTORED` state B the new active runtime truth and rebinds dependent transient/derived integrations without duplicating or altering IM-13C restore logic.

Frozen behavior:

- `RestoredRuntimeActivationContract` accepts only IM-13C `RESTORED` results,
- active World/Map/CoreDomainStores/Gold/Path-Classification/Path-Wear owners are published as one active composition,
- B-derived World-backed Traversability is constructed before publish,
- Reachability and Runtime Entity Navigation validation closures are rebound to B,
- Render Projection is rebound to B Map/Domain truth and the browser render path follows the active composition,
- Population remains explicitly derived/non-persisted and activation performs no population mutation,
- Gold and Wear are adopted without settlement or recalculation,
- Camera remains independent non-persisted view state,
- failed publish leaves the prior active composition unchanged,
- raw snapshots and non-RESTORED inputs are rejected for activation.

Verified end-to-end regression:

`active Runtime A -> Capture A -> Serialize/Parse -> IM-13B VALID -> IM-13C Restore B -> IM-13D Activate B -> active Runtime B -> Capture B`

with canonical Capture A/Capture B identity and explicit B-owner, Traversability, Navigation, Reachability, Render Projection and failed-activation checks.

Verification evidence:

- implementation head before freeze: `caae631f8985a7100d13adc31f5d0c489cb0307d`,
- CI Baseline run `34148749832`: **SUCCESS**,
- GitHub Pages deployment for the same head: **SUCCESS**,
- real iPhone/Safari evidence on 2026-09-07: READY; visible IM-13D identity; PASS; IM-13C RESTORED B ACTIVATED; Active World/Map/Domains = B PASS; Traversability B PASS; Navigation B PASS; Render Projection B PASS; Capture A -> Activate B -> Capture B IDENTISCH; Population derived/non-persisted PASS; Gold/Wear unchanged PASS; failed activation keeps A PASS; Save-Slots/Storage/UI not introduced,
- full diff against frozen IM-13C contains only IM-13D activation/rebinding, evidence, regression, visible/build identity and control-document changes,
- result: **PASS / 0 BLOCKER**.

Explicitly excluded and still absent: Save Slots, storage adapters, LocalStorage/file system, save/load UI, autosave, cloud/multiplayer synchronization, historical schema migration beyond schemaVersion 1, compression/encryption, new gameplay rules, IM-14 UI/Mobile and IM-15 Guidance/Inspector.

## 8. Current gate

**IM-13D is COMPLETE / FROZEN / PASS / 0 BLOCKER.**

No further IM-13 Foundation substep is planned after D. The next exclusively permissible step is now the **IM-13 Whole-Block Completion / Regression / Freeze Gate** across frozen IM-13A + B + C + D and the original binding IM-13 Foundation contract.

IM-13 as a whole is **not yet frozen**. IM-14 UI/Mobile, IM-15 Guidance/Inspector, Save-Slots/Storage, autosave, cloud/multiplayer sync and schema migration remain locked until the Whole-IM-13 gate is separately authorized and successfully completed.

## 9. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-13D verified and frozen at PASS / 0 BLOCKER; next gate is Whole-IM-13 Completion / Regression / Freeze only; later persistence/UI/migration work remains locked.
