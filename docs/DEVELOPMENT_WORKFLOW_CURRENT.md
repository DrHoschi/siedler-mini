# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-30-housing-population-gold-integration-foundation`
- Frozen whole-CR predecessor: **CR-29 – Camera & World View Foundation** @ `560334f6481aef0398b699d21100d0079ea429f1`
- CR-30 – Housing / Population / Gold Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-30A – Home & Housing Capacity Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `f74d6bc1399212650c11196f8f098a419eda6cbf`
- CR-30B – Deterministic Housing & Population Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `e00fb5bbbde6f7f6e72b81ac77a44f0a263834a5`
- CR-30C – Gold Economy Integration: **IMPLEMENTED / DIRECT VERIFICATION IN PROGRESS / NOT FROZEN**
- Next allowed action: complete automated + browser/device verification of **CR-30C only**. Do not execute the whole-CR Completion/Freeze Gate yet.

## 2. Frozen CR-30A / CR-30B source truth

CR-30A remains authoritative for Housing capacity and one-Home invariants. CR-30B remains authoritative for deterministic Housing/Population integration and produces the immutable `derived-population` truth from real valid assigned Persons. No independent mutable Population counter/store exists.

CR-30C may consume that derived Population truth but must not replace, duplicate or mutate it.

## 3. CR-30C – Gold Economy Integration

**IMPLEMENTED / DIRECT VERIFICATION IN PROGRESS / NOT FROZEN**.

Ownership inventory result:

- no pre-existing Gold/economy owner exists in the active runtime tree,
- `src/resources/*` is physical resource infrastructure and is not reused for Gold,
- `CoreDomainStores.resources` and Logistics/Transport jobs remain physical-world stores and must remain untouched by Gold,
- frozen CR-30B `derived-population` is the sole resident source for Gold derivation.

Implemented boundary:

- exactly one explicit `GoldEconomyOwner` owns mutable Gold balance,
- Gold state is explicitly marked `physical: false`,
- Gold income is derived only from a valid immutable `derived-population` contract,
- `goldPerResident` must be supplied explicitly as a non-negative safe integer; CR-30C does not silently choose a game-balance default,
- deriving income alone is pure and does not mutate balance,
- applying/settling income mutates only the Gold owner,
- no Resource-store record is created for Gold,
- no Logistics/Transport job is created for Gold,
- Population receives no Gold/balance field and remains a separate frozen truth,
- no SaveGame/restore surcharge or restore behavior is introduced.

Implementation:

- `src/domain/gold-economy-owner.js`
- `src/dev/cr-30c-self-test.node.js`
- CI chain extended to run frozen predecessors + CR-30A + CR-30B + CR-30C direct test.

Visible/browser evidence page:

- all visible/build identity surfaces are synchronized to `CR-30C – Gold Economy Integration`,
- the preserved CR-30B browser scenario still has Population 3 / 3 Buildings / 3 Persons,
- browser evidence uses an explicitly named **test/evidence rate** `1 Gold / Resident` only to make the arithmetic visible; this is not a hidden production balance default,
- expected visible result: Population 3, Gold Rate 1/Resident, Gold Income 3, Gold Balance 3, `NON-PHYSICAL`, 3 Buildings / 3 Persons visible.

Explicit non-scope remains:

- no SaveGame/restore implementation,
- no UI/Inspector feature work,
- no Navigation/Path/Wear changes,
- no physical Gold stock or cargo,
- no change to BuildingStock/Workforce/Logistics ownership,
- no second Population truth,
- no whole-CR freeze until CR-30C itself is accepted.

## 4. Current CR-30C gate

Automated verification must pass the full frozen regression including the new CR-30C self-test. After that, real browser/device evidence must confirm the synchronized CR-30C identity and expected Gold values while the frozen visible world/camera remains intact.

Only after **PASS / 0 BLOCKER** may CR-30C be accepted/frozen. The CR-30 Completion / Regression / Freeze Gate is a separate later action and is not yet authorized for execution.

## 5. Permanent visible CR / build identity synchronization rule

Before a browser/device gate, before declaring a visible substep PASS, and again before a whole-CR Freeze Gate, verify every applicable visible/build identity surface against the current authorized CR/substep. A stale predecessor label is a verification defect.

---

**Updated:** 2026-09-06 — CR-30C Gold owner implemented with explicit non-physical ownership and derived-population input; visible identity synchronized; direct automated/browser verification remains the active gate.
