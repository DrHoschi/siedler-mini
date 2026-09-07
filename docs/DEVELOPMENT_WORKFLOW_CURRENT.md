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

## 2. Frozen CR-32 boundary

CR-32 remains fully frozen. Navigation, Path/Wear, Movement, Traffic, Reservation, Deadlock and Recovery ownership are unchanged. `wearCostPerUnit = 0.01` and the existing deterministic pathfinder/route ownership remain authoritative.

## 3. IM-13 binding boundary

IM-13 is persistence only. It may capture, serialize, validate and restore existing authoritative runtime state but must not become a gameplay owner.

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

IM-13A is frozen at `fadacda7f728f57b3b97cbb1771284e5d609d805`.

## 5. IM-13B frozen contract

IM-13B provides deterministic side-effect-free validation of the frozen IM-13A schemaVersion-1 payload before any restore mutation.

Frozen validation includes schema/capture metadata, globally unique Stable IDs, allocator continuity, World/Map/Domain references, Gold and CR-32 PATH/ROAD wear consistency, deterministic sorted INVALID errors, and no silent repair/defaulting/coercion.

IM-13B is frozen at `0a4b225d86e239cc2b2d80c20166faafe483aa20` with frozen predecessor regression PASS, IM-13B regression PASS, GitHub Actions CI success, real iPhone/Safari PASS evidence and 0 blockers.

## 6. IM-13C frozen contract

IM-13C implements controlled deterministic restoration only after the frozen IM-13B validator returns `VALID`.

Frozen restore behavior:

- restore validates before constructing replacement owners and rejects invalid payloads before replacement state exists,
- restore is all-or-nothing and prepares a complete replacement authoritative owner set before commit,
- WorldStore restores saved World state plus Stable-ID allocator continuity without replaying mutations or changing saved revision truth,
- MapStructure restores saved Map identity/default tile/dimensions/cell IDs and coordinate lookup without creating competing Tile/Map/Cell identities,
- DomainStore/CoreDomainStores restore exact saved items, relationships, revisions and allocator next-sequences without mutation replay,
- GoldEconomyOwner restores directly from saved balance without economy settlement,
- WorldBackedPathClassificationSource is rebuilt from restored World/Map truth,
- DeterministicPathUsageWearIntegration restores exact saved PATH/ROAD wear entries without recalculation or traversal-class mutation,
- all persisted Stable IDs remain exact and later allocations continue from saved allocator state without collision or reuse,
- deterministic round-trip proof is Capture A -> Serialize/Parse -> IM-13B VALID -> Restore B -> Capture B with canonical snapshot identity,
- rejected restore leaves the previously active World/Domain/Gold runtime state unchanged,
- Save Slots/UI, LocalStorage/file-system adapters, autosave, cloud/multiplayer sync, historical schema migration, compression/encryption and new gameplay rules remain outside IM-13C.

Verification evidence:

- frozen CR-32 regression: PASS,
- frozen IM-13A regression: PASS,
- frozen IM-13B regression: PASS,
- IM-13C self-test / round-trip regression: PASS,
- GitHub Actions CI run `34143896461`, job `101811630247` / `Clean Runtime + CR/IM Regression`: SUCCESS,
- real iPhone/Safari evidence on 2026-09-07 at 18:50 local: runtime `READY`, visible identity `IM-13C – Deterministic SaveGame Restore Contract`, overall PASS, `IM-13B VALID vor Restore`, `Capture A → Restore B → Capture B IDENTISCH`, Stable IDs/Allocator PASS, Gold 3, Wear PASS, invalid restore REJECTED and previous runtime state unchanged PASS,
- visible/build identity synchronized to `IM-13C-SAVEGAME-RESTORE-CONTRACT`,
- blockers: 0.

## 7. Current gate

**IM-13C is COMPLETE / FROZEN / PASS / 0 BLOCKER.**

No later SaveGame/storage/UI/schema-migration block is automatically authorized by this freeze. The next permissible step is only the explicit reconciliation of whether IM-13 itself is complete at A+B+C or whether another narrowly scoped SaveGame foundation substep is required. IM-14 UI/Mobile and IM-15 Guidance/Inspector remain locked.

## 8. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — IM-13C COMPLETE / FROZEN / PASS / 0 BLOCKER; later persistence/UI/migration work remains locked.
