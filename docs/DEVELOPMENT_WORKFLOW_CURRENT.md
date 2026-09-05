# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development/control branch: `feature/cr-25-buildingstock-production-foundation`
- Current immutable gameplay baseline: **CR-25 – BuildingStock / Production Foundation**
- CR-24 – Construction Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-25A – BuildingStock Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-25B – Deterministic BuildingStock Mutation: **PASS / FROZEN / 0 BLOCKER**
- CR-25C – Production -> BuildingStock Contract: **PASS / FROZEN / 0 BLOCKER**
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current activity: **NEXT SYSTEM BLOCK PLANNING ONLY**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | COMPLETE / FROZEN | Regression only |
| 2 | CR-23 – Person / Resident / Housing Foundation | COMPLETE / FROZEN | Regression only |
| 3 | CR-24 – Construction Foundation | COMPLETE / FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-25A – BuildingStock Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 5 | CR-25B – Deterministic BuildingStock Mutation | PASS / FROZEN / 0 BLOCKER | Regression only |
| 6 | CR-25C – Production -> BuildingStock Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 7 | CR-25 whole-system Completion / Regression / Freeze Gate | PASS / 0 BLOCKER | CR-25 frozen |
| 8 | Next CR system block | PLANNING ONLY | Reconcile live roadmap and define exact boundary before implementation |

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

The complete device/browser CR-25 Completion / Regression / Freeze Gate passed with **PASS / 0 BLOCKER** on 2026-09-05.

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

Do not begin implementation of a new CR yet.

Reconcile `docs/ROADMAP_CURRENT.md` and the live repository against the remaining IM/product capability priorities, then define the minimal next system boundary, exact CR title and any A/B/C decomposition. Only after explicit acceptance may a new development branch be created from the frozen CR-25 baseline.

## 6. Branch simplification rule

The completed CR-25 implementation remains on `feature/cr-25-buildingstock-production-foundation` as development history.

Frozen branches are immutable markers only. Do not create extra temporary, implementation, final or gate working branches unless a concrete technical risk requires isolation.

A future system block gets one development branch only after its boundary has been explicitly accepted.

---

**Updated:** 2026-09-05 after device/browser CR-25 whole-system Completion / Regression / Freeze Gate: **PASS / 0 BLOCKER**. Current next activity: **next-system planning / IM ↔ CR reconciliation only**.
