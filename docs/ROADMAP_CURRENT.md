# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13A FROZEN / IM-13B FROZEN / IM-13C IMPLEMENTED / VERIFICATION PENDING  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-13-savegame-foundation`  
**Whole-block base:** frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**. CR-32 – Path / Wear Integration Foundation is the direct frozen predecessor of IM-13.

IM-13A – SaveGame Snapshot Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `fadacda7f728f57b3b97cbb1771284e5d609d805`, marker `frozen/im-13a-savegame-snapshot-contract`.

IM-13B – Deterministic SaveGame Validation Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `0a4b225d86e239cc2b2d80c20166faafe483aa20`, marker `frozen/im-13b-deterministic-savegame-validation-contract`.

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

Freeze marker: `frozen/im-13a-savegame-snapshot-contract` @ `fadacda7f728f57b3b97cbb1771284e5d609d805`.

## 5. IM-13B – Deterministic SaveGame Validation Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen scope: deterministic side-effect-free validation of the frozen IM-13A payload, including schema/capture, Stable-ID uniqueness, allocator continuity, World/Map/Domain references, Gold and CR-32 wear consistency, with deterministic INVALID results and no silent repair.

Freeze marker: `frozen/im-13b-deterministic-savegame-validation-contract` @ `0a4b225d86e239cc2b2d80c20166faafe483aa20`.

## 6. IM-13C – Deterministic SaveGame Restore Contract

Status: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**.

Implemented scope:

- restore input is first passed through frozen IM-13B validation; invalid input is `REJECTED` before replacement state construction,
- complete replacement authoritative World/Map, CoreDomainStores, Gold and CR-32 PATH/ROAD wear owners are prepared before commit,
- additive restore initialization paths avoid replay side effects and preserve saved store revisions,
- World/Map restore preserves exact World/Map/Tile/Cell Stable IDs and reconstructs map coordinate lookup without generating competing identities,
- Domain restore preserves exact items, relationships, revisions and per-domain Stable-ID allocator next-sequences,
- Gold restores directly from saved balance without settlement,
- world-backed path classification is rebuilt from restored World/Map truth,
- CR-32 wear restores saved entries without recalculation or traversal-class mutation,
- allocator continuity is restored from saved allocator snapshots so later allocations continue without collision or reuse,
- deterministic Node round-trip regression proves Capture A -> Serialize/Parse -> IM-13B VALID -> Restore B -> Capture B canonical identity,
- invalid restore regression verifies that existing World/Domain/Gold owners remain unchanged,
- browser evidence surface and build identity are synchronized to `IM-13C-SAVEGAME-RESTORE-CONTRACT`.

Explicitly excluded from IM-13C:

- Save Slots, LocalStorage/file-system adapters or save/load UI,
- autosave,
- cloud or multiplayer synchronization,
- historical schema migration beyond schemaVersion 1,
- compression/encryption,
- new gameplay rules or ownership changes,
- IM-14 UI/Mobile and IM-15 Guidance/Inspector work.

## 7. Current gate

The next permissible step is exclusively **IM-13C Verification / Regression / Freeze Gate**.

Required before freeze: frozen CR-32 regression PASS, frozen IM-13A regression PASS, frozen IM-13B regression PASS, IM-13C round-trip regression PASS, CI PASS, real browser/device evidence with synchronized IM-13C identity and 0 BLOCKER.

No later persistence/UI/schema-migration step is automatically authorized.

---

**Updated:** 2026-09-07 — IM-13C restore implemented; verification/freeze pending; later persistence/UI/migration work remains locked.
