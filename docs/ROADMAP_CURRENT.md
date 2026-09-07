# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13A FROZEN / IM-13B IMPLEMENTATION-AUTHORIZED  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-13-savegame-foundation`  
**Whole-block base:** frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**. CR-32 – Path / Wear Integration Foundation is the direct frozen predecessor of IM-13.

IM-13A – SaveGame Snapshot Contract is also **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `fadacda7f728f57b3b97cbb1771284e5d609d805`, marker `frozen/im-13a-savegame-snapshot-contract`.

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

Frozen scope:

- canonical `savegame-snapshot` payload,
- `schemaVersion: 1`,
- explicit completed simulation-step capture boundary,
- deterministic World + Stable-ID allocator snapshot,
- deterministic Map identity/cell snapshot,
- CoreDomainStores + allocator snapshots,
- Gold economy state,
- CR-32B PATH/ROAD wear state,
- canonical deterministic JSON serialization,
- Node self-test and browser evidence surface.

Explicitly not implemented in IM-13A:

- Restore execution,
- save-slot/storage UI,
- cloud or multiplayer synchronization,
- historical schema migration,
- new gameplay behavior,
- persistence of derived Population, route/pathfinder, Render or Camera state as competing truth.

Freeze marker: `frozen/im-13a-savegame-snapshot-contract` @ `fadacda7f728f57b3b97cbb1771284e5d609d805`.

## 5. IM-13B – Deterministic SaveGame Validation Contract

Status: **CONTRACT CONFIRMED / IMPLEMENTATION-AUTHORIZED / NOT YET IMPLEMENTED**.

Binding scope:

- validate only the frozen IM-13A `savegame-snapshot` schemaVersion 1 payload,
- validate schema structure and completed-step capture metadata,
- validate Stable-ID uniqueness and saved allocator consistency/continuity,
- validate persisted reference integrity and reject dangling references,
- validate authoritative Gold state,
- validate CR-32 PATH/ROAD wear state and counters,
- produce deterministic validation success/failure for identical input,
- reject malformed or inconsistent saves rather than silently repairing them,
- remain strictly side-effect-free and mutate no authoritative runtime owner.

Explicitly excluded from IM-13B:

- Restore/Hydration,
- runtime-state mutation,
- save slots, storage/file adapters or UI,
- autosave,
- cloud or multiplayer synchronization,
- historical schema migration,
- new gameplay logic or ownership changes.

## 6. Current gate

The next permissible implementation step is exclusively **IM-13B – Deterministic SaveGame Validation Contract**.

IM-13C / Restore is not automatically authorized. It remains blocked until IM-13B has been implemented, regressed, verified and frozen with PASS / 0 BLOCKER.

IM-14 UI/Mobile and IM-15 Guidance/Inspector remain later migration blocks.

---

**Updated:** 2026-09-07 — IM-13A frozen; IM-13B contract confirmed and explicitly implementation-authorized; implementation not yet started.
