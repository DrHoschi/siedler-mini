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
- IM-13B – Deterministic SaveGame Validation Contract: **IMPLEMENTATION-AUTHORIZED / NOT YET IMPLEMENTED**

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

## 5. IM-13B binding contract and authorization

IM-13B – Deterministic SaveGame Validation Contract is fachlich confirmed and explicitly implementation-authorized.

Its scope is limited to deterministic, side-effect-free validation of the frozen IM-13A schemaVersion-1 snapshot:

- validate `kind`, `schemaVersion`, capture boundary and required top-level sections,
- validate Stable-ID uniqueness and allocator continuity/consistency,
- validate reference integrity across persisted World/Map/Domain/Wear state,
- reject dangling references deterministically,
- validate authoritative Gold state as non-negative and non-physical,
- validate CR-32 PATH/ROAD wear entries, non-negative integer counters and `usageCount === wearUnits`,
- deterministic identical input -> identical validation result/failure,
- no silent repair, coercion, fallback/defaulting or best-effort acceptance,
- validation must not mutate WorldStore, MapStructure, DomainStores, Gold, Wear or any other runtime owner.

Explicitly excluded from IM-13B:

- Restore/Hydration or any runtime-state mutation,
- Save Slots, file/storage adapters or UI,
- autosave,
- cloud or multiplayer synchronization,
- historical schema migration,
- new gameplay behavior or ownership changes.

Authorization status: **IM-13B IMPLEMENTATION-AUTHORIZED / NOT YET IMPLEMENTED**.

## 6. Current gate

The next permissible implementation step is exclusively **IM-13B – Deterministic SaveGame Validation Contract** within the confirmed boundary above.

IM-13C or any Restore implementation is not automatically authorized by this IM-13B authorization and may not begin before IM-13B implementation, regression, verification and freeze.

## 7. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-13A frozen; IM-13B contract confirmed and implementation-authorized; implementation not yet started.
