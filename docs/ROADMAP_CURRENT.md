# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13A IMPLEMENTED / VERIFICATION PENDING  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-13-savegame-foundation`  
**Whole-block base:** frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**. CR-32 – Path / Wear Integration Foundation is the direct frozen predecessor of IM-13.

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

Status: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**.

Implemented scope:

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

## 5. Current gate

The next permissible step is only **IM-13A Verification / Regression / Freeze Gate**. Required: frozen CR-32 regression PASS, IM-13A regression PASS, CI PASS, real browser/device evidence with synchronized IM-13A identity, and 0 BLOCKER.

No later IM-13 substep is authorized before IM-13A freeze. IM-14 UI/Mobile and IM-15 Guidance/Inspector remain later migration blocks.

---

**Updated:** 2026-09-07 — IM-13A SaveGame Snapshot Contract implemented; verification/freeze pending.
