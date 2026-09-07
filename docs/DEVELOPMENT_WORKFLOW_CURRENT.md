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
- IM-13B – Deterministic SaveGame Validation Contract: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**

## 2. Frozen CR-32 boundary

CR-32 remains fully frozen. Navigation, Path/Wear, Movement, Traffic, Reservation, Deadlock and Recovery ownership are unchanged. `wearCostPerUnit = 0.01` and the existing deterministic pathfinder/route ownership remain authoritative.

## 3. IM-13 binding boundary

IM-13 is persistence only. It may capture, serialize, validate and later restore existing authoritative runtime state but must not become a gameplay owner.

Binding principles:

- persist authoritative state; recompute derived/transient views,
- preserve Stable IDs and allocator continuity,
- persistence-relevant state includes World/Map identity, domain stores, Gold balance and CR-32 PATH/ROAD wear,
- capture only at a completed deterministic simulation-step boundary,
- version payloads from the first schema,
- reject invalid schemas/references/state deterministically,
- no SaveGame UI, cloud sync, multiplayer sync, new gameplay rules or ownership changes in this foundation.

## 4. IM-13A frozen contract

IM-13A defines the canonical snapshot/capture boundary:

- `kind: savegame-snapshot`,
- `schemaVersion: 1`,
- completed simulation-step capture boundary with non-negative `stepIndex`,
- World state plus World Stable-ID allocator snapshot,
- Map identity, default tile, dimensions and stable cell IDs,
- all CoreDomainStores state plus per-domain Stable-ID allocator snapshots,
- non-physical Gold state,
- CR-32B PATH/ROAD wear entries sorted by stable `cellId`,
- deterministic canonical JSON serialization,
- derived Population, Camera/Render state, route/pathfinder results and Restore are not part of the snapshot truth.

IM-13A passed frozen CR-32 regression, IM-13A self-test, CI, real iPhone browser evidence with synchronized visible/build identity and 0 blockers, and is frozen at `fadacda7f728f57b3b97cbb1771284e5d609d805`.

## 5. IM-13B implemented contract

IM-13B adds a separate side-effect-free validator for the frozen IM-13A schemaVersion-1 payload without changing the frozen IM-13A capture/serialization owner.

Implemented validation:

- required SaveGame kind, schema version and completed-step capture metadata,
- required World/Map/Domain/Gold/Wear sections,
- valid and globally unique persisted Stable IDs,
- allocator continuity: each allocator next-sequence must remain beyond every occupied ID sequence it owns,
- Map identity, dimensions, stable cell membership, cell -> map and cell -> tile reference integrity,
- exact four CoreDomainStores and their item-kind/ID consistency,
- persisted domain Stable-ID references are checked for dangling targets while external `definitionId` values remain outside SaveGame ownership,
- Gold remains `gold-economy-state`, non-negative and explicitly non-physical,
- CR-32 wear remains PATH/ROAD only, references saved map cells, has non-negative integer counters and `usageCount === wearUnits`, and agrees with the saved cell tile traversal type,
- deterministic validation results contain stable sorted error code/path pairs,
- invalid payloads are rejected as `INVALID`; no repair/defaulting/coercion is performed,
- validator does not mutate the supplied payload or any runtime owner.

IM-13B includes Node regression coverage for valid Capture -> Serialize -> Parse -> Validate and targeted invalid cases for schema, duplicate Stable ID, dangling tile/domain/wear references, allocator reuse risk, negative Gold and inconsistent wear. Browser evidence is synchronized to build identity `IM-13B-SAVEGAME-VALIDATION-CONTRACT`.

Explicitly not introduced:

- Restore/Hydration or runtime-state mutation,
- Save Slots, file/storage adapters or UI,
- autosave,
- cloud or multiplayer synchronization,
- historical schema migration,
- new gameplay behavior or ownership changes.

## 6. Current gate

IM-13B is implemented but not frozen. Required before freeze:

- frozen CR-32 regression PASS,
- frozen IM-13A regression PASS,
- IM-13B self-test PASS,
- CI PASS,
- real browser/device evidence with correct IM-13B visible/build identity,
- 0 BLOCKER.

The next permissible step is exclusively **IM-13B Verification / Regression / Freeze Gate**. IM-13C / Restore remains locked and is not automatically authorized.

## 7. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-13B validation implemented; verification/freeze pending; IM-13C Restore remains locked.
