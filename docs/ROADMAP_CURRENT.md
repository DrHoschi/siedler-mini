# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13A FROZEN / IM-13B FROZEN / IM-13C IMPLEMENTATION-AUTHORIZED  
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

- separate validation of the frozen IM-13A schemaVersion-1 payload,
- schema/capture validation,
- Stable-ID uniqueness and allocator continuity,
- World/Map/Domain reference integrity,
- Gold and CR-32 wear validation,
- deterministic INVALID results without silent repair,
- strict side-effect-free behavior.

Freeze gate evidence includes frozen predecessor regressions, IM-13B regression, GitHub Actions CI success and real iPhone/Safari PASS evidence with synchronized build identity.

Freeze marker: `frozen/im-13b-deterministic-savegame-validation-contract` @ `0a4b225d86e239cc2b2d80c20166faafe483aa20`.

## 6. IM-13C – Deterministic SaveGame Restore Contract

Status: **CONTRACT CONFIRMED / IMPLEMENTATION-AUTHORIZED / NOT YET IMPLEMENTED**.

Binding scope:

- accept restore input only after frozen IM-13B returns `VALID`,
- restore is atomic/all-or-nothing and must not expose partial active state,
- reconstruct a complete replacement set of authoritative World/Map, CoreDomainStores, Gold and CR-32 PATH/ROAD wear owners from the frozen IM-13A snapshot truth,
- preserve all saved Stable IDs exactly,
- restore allocator continuity without ID reuse/collision,
- avoid constructor side effects that create competing map/tile/cell or domain identities,
- preserve persisted relationships and references,
- restore Gold without economy settlement side effects,
- restore Wear without recalculation or traversal-class mutation,
- recompute derived/transient Population, navigation/pathfinding/cost views, render/camera/evidence only from restored authoritative owners,
- deterministic round-trip proof: Capture A -> Serialize/Parse -> IM-13B VALID -> Restore B -> Capture B must reproduce canonically identical authoritative snapshot truth under the defined restore evidence boundary,
- restore failure leaves the previously active runtime state unchanged.

Explicitly excluded from IM-13C:

- Save Slots, LocalStorage/file-system adapters or save/load UI,
- autosave,
- cloud or multiplayer synchronization,
- historical schema migration beyond schemaVersion 1,
- compression/encryption,
- new gameplay rules or ownership changes,
- IM-14 UI/Mobile and IM-15 Guidance/Inspector work.

## 7. Current gate

The next permissible implementation step is exclusively **IM-13C – Deterministic SaveGame Restore Contract** within the confirmed and authorized boundary above.

No later persistence/UI/migration step is automatically authorized by this IM-13C authorization.

---

**Updated:** 2026-09-07 — IM-13A and IM-13B frozen; IM-13C contract confirmed and explicitly implementation-authorized; implementation not yet started.