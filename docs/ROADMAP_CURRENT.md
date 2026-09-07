# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13A FROZEN / IM-13B COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-13-savegame-foundation`  
**Whole-block base:** frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**. CR-32 – Path / Wear Integration Foundation is the direct frozen predecessor of IM-13.

IM-13A – SaveGame Snapshot Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `fadacda7f728f57b3b97cbb1771284e5d609d805`, marker `frozen/im-13a-savegame-snapshot-contract`.

IM-13B – Deterministic SaveGame Validation Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER**. Freeze marker: `frozen/im-13b-deterministic-savegame-validation-contract`, pointing exactly to the final documented IM-13B freeze head.

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

Freeze marker: `frozen/im-13a-savegame-snapshot-contract` @ `fadacda7f728f57b3b97cbb1771284e5d609d805`.

## 5. IM-13B – Deterministic SaveGame Validation Contract

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen scope:

- a separate validator for the frozen IM-13A `savegame-snapshot` schemaVersion 1 payload,
- schema structure and completed-step capture metadata validation,
- global persisted Stable-ID uniqueness and allocator continuity validation,
- World/Map identity, dimensions, cell membership and map/tile reference validation,
- exact CoreDomainStores structure, item identity/kind consistency and persisted Stable-ID reference integrity,
- authoritative Gold validation,
- CR-32 PATH/ROAD wear reference, counter and traversal-type consistency validation,
- deterministic sorted validation error code/path results,
- malformed/inconsistent saves return `INVALID` without silent repair or coercion,
- validation is side-effect-free and does not mutate the supplied payload or authoritative runtime owners,
- Node regression coverage and browser evidence with visible/build identity `IM-13B-SAVEGAME-VALIDATION-CONTRACT`.

Freeze gate evidence:

- frozen CR-32 regression PASS,
- frozen IM-13A regression PASS,
- IM-13B regression PASS,
- GitHub Actions CI run `34137143168`: SUCCESS,
- real iPhone/Safari evidence on 2026-09-07: runtime READY and synchronized IM-13B PASS surface, including valid schemaVersion 1, deterministic INVALID cases for malformed schema/negative Gold/Wear inconsistency, side-effect-free PASS, unchanged IM-13A snapshot and Restore still absent,
- 0 BLOCKER.

Explicitly excluded from IM-13B:

- Restore/Hydration,
- runtime-state mutation,
- save slots, storage/file adapters or UI,
- autosave,
- cloud or multiplayer synchronization,
- historical schema migration,
- new gameplay logic or ownership changes.

Freeze marker: `frozen/im-13b-deterministic-savegame-validation-contract` — exact final documented IM-13B freeze head.

## 6. Current gate

IM-13B is frozen. **IM-13C / Restore remains NOT AUTHORIZED.**

The next permissible step after this freeze is exclusively the fachliche definition and boundary reconciliation of IM-13C on top of frozen IM-13A + IM-13B. No Restore implementation is automatically authorized by the IM-13B freeze.

IM-14 UI/Mobile and IM-15 Guidance/Inspector remain later migration blocks.

---

**Updated:** 2026-09-07 — IM-13B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-13C Restore remains not authorized.