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
- IM-13A – SaveGame Snapshot Contract: **IMPLEMENTED / VERIFICATION PENDING / NOT FROZEN**

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

## 4. IM-13A implemented contract

IM-13A introduces only the canonical snapshot/capture boundary:

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

IM-13A also has Node self-test coverage and a browser evidence overlay with synchronized visible/build identity `IM-13A-SAVEGAME-SNAPSHOT-CONTRACT`.

## 5. Current gate

IM-13A is not frozen yet. Required before freeze:

- complete frozen CR-32 regression PASS,
- IM-13A self-test PASS,
- CI PASS,
- real browser/device evidence with correct IM-13A visible identity,
- 0 BLOCKER.

No Restore implementation or later IM-13 substep may begin before IM-13A freeze.

## 6. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-13A snapshot contract implemented; verification/freeze pending.
