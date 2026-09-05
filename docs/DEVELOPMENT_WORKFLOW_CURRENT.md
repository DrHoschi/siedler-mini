# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-25-buildingstock-production-foundation`
- Current immutable gameplay baseline: **CR-25C – Production -> BuildingStock Contract**
- CR-24 – Construction Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current system block: **CR-25 – BuildingStock / Production Foundation**
- CR-25A – BuildingStock Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-25B – Deterministic BuildingStock Mutation: **PASS / FROZEN / 0 BLOCKER**
- CR-25C – Production -> BuildingStock Contract: **PASS / FROZEN / 0 BLOCKER**
- Current gate: **CR-25 system-block completion / regression / freeze gate**
- CR-25 status: **COMPLETE_NOT_FROZEN**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | COMPLETE / FROZEN | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24 – Construction Foundation | COMPLETE / FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-25A – BuildingStock Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 5 | CR-25B – Deterministic BuildingStock Mutation | PASS / FROZEN / 0 BLOCKER | Regression only |
| 6 | CR-25C – Production -> BuildingStock Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 7 | CR-25 system-block completion gate | ACTIVE | Run combined A/B/C regression/freeze gate |
| 8 | Next CR system block | BLOCKED | Only after CR-25 whole-block freeze |

## 3. Frozen CR-25 contract boundary

CR-25A owns immutable BuildingStock entry values with stable Building/ResourceType identity and non-negative safe-integer quantity.

CR-25B owns deterministic `add` / `remove` value mutation, preserves identity and immutability, rejects over-withdrawal, invalid mutation amounts and Safe-Integer overflow.

CR-25C owns the minimal deterministic Production -> BuildingStock boundary:

- one production definition belongs to one stable Building,
- deterministic non-empty input/output resource-quantity lists,
- all inputs validated before execution,
- insufficient input rejects the entire attempt,
- inputs consumed through frozen CR-25B remove,
- outputs added through frozen CR-25B add,
- absent output stock starts from a CR-25A zero-quantity value,
- immutable deterministic result ordering,
- no production timing/workforce/transport behavior.

## 4. Explicit frozen exclusions

CR-25 as a whole contains no:

- production duration/ticks/timers/automatic repetition,
- active/running/paused production state,
- workforce/profession assignment,
- storage capacity or slots,
- transport generation/execution,
- construction material consumption,
- SaveGame ownership,
- rendering/animation/UI/Inspector/balancing.

## 5. Next allowed action

Run the complete **CR-25 A/B/C Completion / Regression / Freeze Gate**.

The gate must regress the frozen CR-24 predecessor, CR-25A, CR-25B and CR-25C together and verify that the CR-25 scope boundary remains clean.

Only after **PASS / 0 BLOCKER** may CR-25 as a whole become **COMPLETE / FROZEN** and a new CR system block be planned.

## 6. Branch simplification rule

CR-25 remains on the single development branch `feature/cr-25-buildingstock-production-foundation`.

Frozen branches are immutable markers only. Do not create extra temporary, implementation, final or gate working branches unless a concrete technical risk requires isolation.

---

**Updated:** 2026-09-05 after device/browser CR-25C Verification / Freeze Gate: **PASS / 0 BLOCKER**. Current next activity: **CR-25 whole-system completion / regression / freeze gate**.
