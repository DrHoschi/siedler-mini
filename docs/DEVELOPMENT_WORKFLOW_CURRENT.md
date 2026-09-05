# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-25-buildingstock-production-foundation`
- Current immutable gameplay baseline: **CR-25B – Deterministic BuildingStock Mutation**
- CR-24 – Construction Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current system block: **CR-25 – BuildingStock / Production Foundation**
- CR-25A – BuildingStock Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-25B – Deterministic BuildingStock Mutation: **PASS / FROZEN / 0 BLOCKER**
- Current sub-block: **CR-25C – Production -> BuildingStock Contract**
- CR-25C status: **IMPLEMENTED / NOT FROZEN**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | COMPLETE / FROZEN | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24 – Construction Foundation | COMPLETE / FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-25A – BuildingStock Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 5 | CR-25B – Deterministic BuildingStock Mutation | PASS / FROZEN / 0 BLOCKER | Regression only |
| 6 | CR-25C – Production -> BuildingStock Contract | IMPLEMENTED / NOT FROZEN | Focused verification / freeze gate only |
| 7 | CR-25 system-block completion gate | BLOCKED | Only after CR-25C freeze |

## 3. Frozen CR-25A / CR-25B boundary

CR-25A owns immutable BuildingStock entry values with stable Building/ResourceType identity and non-negative safe-integer quantity.

CR-25B owns deterministic `add` / `remove` value mutation, preserves identity and immutability, rejects over-withdrawal, invalid mutation amounts and Safe-Integer overflow.

## 4. CR-25C implemented boundary

CR-25C adds only minimal deterministic Production -> BuildingStock behavior:

- one production definition belongs to one stable `building:` ID,
- non-empty deterministic `inputs[]` and `outputs[]`,
- every production entry uses one stable `resource-type:` ID and positive safe-integer quantity,
- all required inputs are validated before any result is produced,
- insufficient input rejects the complete production attempt,
- input quantities are consumed through frozen CR-25B `remove`,
- output quantities are added through frozen CR-25B `add`,
- absent output stock begins from a CR-25A zero-quantity value,
- same ResourceType may appear once in inputs and once in outputs and resolves deterministically,
- the returned stock list is immutable and sorted by ResourceType,
- supplied stock values are never mutated.

## 5. Explicit exclusions

CR-25C contains no:

- production duration/ticks/timers/automatic repetition,
- active/running/paused production state,
- workforce/profession assignment,
- storage capacity or slots,
- transport generation/execution,
- construction material consumption,
- SaveGame ownership,
- rendering/animation/UI/Inspector/balancing.

## 6. Next allowed action

Run focused **CR-25C Verification / Freeze Gate** against frozen CR-25B and the new Production -> BuildingStock contract.

Only after **PASS / 0 BLOCKER** may CR-25C receive an immutable frozen marker. Then run the whole **CR-25 completion/regression/freeze gate** before defining or implementing a new CR system block.

Do not start any later system block while CR-25C is `IMPLEMENTED / NOT FROZEN`.

## 7. Branch simplification rule

CR-25 continues on the single development branch `feature/cr-25-buildingstock-production-foundation`.

A completed sub-block may receive a `frozen/...` branch solely as an immutable marker. Do not create extra temporary, implementation, final or gate branches unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 after CR-25C implementation. Current next activity: **CR-25C focused verification / freeze gate**.
