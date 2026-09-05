# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-25C active  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-25-buildingstock-production-foundation`  
**Frozen gameplay baseline:** **CR-25B – Deterministic BuildingStock Mutation**

## 1. Authority

This file is the current implementation-priority roadmap for the clean modular rebuild. Repository state, frozen CR evidence and this file outrank chat memory.

The old game on `main` remains historical functional and visual reference only. It is not an architecture baseline or integration target. Target: functional parity or better, never legacy-code parity.

IM numbers remain higher-level product/migration capability areas. CR numbers are the actual modular system blocks. They are not a 1:1 numbering scheme.

## 2. Current frozen line

CR-00 through CR-24 remain frozen predecessor foundations.

### CR-24 – Construction Foundation — PASS / FROZEN / 0 BLOCKER

CR-24 establishes construction state/progress/completion only and remains unchanged by CR-25.

### CR-25A – BuildingStock Contract — PASS / FROZEN / 0 BLOCKER

CR-25A establishes the immutable descriptive local BuildingStock entry contract.

### CR-25B – Deterministic BuildingStock Mutation — PASS / FROZEN / 0 BLOCKER

CR-25B adds deterministic add/remove mutation on top of CR-25A while preserving Building/ResourceType identity and immutability. Over-withdrawal, invalid mutation amounts and Safe-Integer overflow are rejected.

## 3. Current system block

### CR-25 – BuildingStock / Production Foundation — ACTIVE

CR-25 advances **IM-08** and is implemented sequentially on one development branch.

- **CR-25A – BuildingStock Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-25B – Deterministic BuildingStock Mutation — PASS / FROZEN / 0 BLOCKER**
- **CR-25C – Production -> BuildingStock Contract — IMPLEMENTED / NOT FROZEN**
  - one production definition belongs to one stable Building,
  - deterministic non-empty input/output resource-quantity lists,
  - all inputs validated before execution,
  - insufficient input rejects the entire attempt,
  - consume inputs through frozen CR-25B remove,
  - add outputs through frozen CR-25B add,
  - create zero stock for previously absent output ResourceTypes,
  - immutable deterministic result ordering,
  - no production timing/workforce/transport behavior.

After CR-25C passes its own freeze gate, the complete CR-25 A/B/C system block still requires one combined completion/regression/freeze gate before another CR begins.

## 4. Product-capability direction

The authoritative product chain remains:

`HQ -> Häuser -> Bewohner -> Produktion -> lokaler Bestand -> Transport -> HQ/Baustelle -> Bau -> Expansion`

Current capability priority:

1. ~~Building ownership / lifecycle foundation~~ — **CR-22 COMPLETE / FROZEN**
2. ~~Person / Resident / Housing foundation~~ — **CR-23 COMPLETE / FROZEN**
3. ~~Construction foundation~~ — **CR-24 COMPLETE / FROZEN** — advances IM-07
4. **BuildingStock / Production foundation — CR-25 ACTIVE** — advances IM-08
5. Integrated workforce / job eligibility — advances the non-transport part of IM-06
6. Game-facing logistics/navigation integration — advances IM-09 + IM-11
7. Visible world/render integration
8. SaveGame owner snapshots / Continue — IM-13
9. Mobile UI runtime integration — IM-14
10. Path/Wear presentation — IM-12
11. Guidance + Inspector / diagnostics / balancing — IM-15
12. Architecture closure + V1 Golden Path — finish IM-16 + IM-17

Population / Resident Creation remains deferred and must build on frozen CR-23 housing capacity rather than modifying CR-23.

## 5. CR-25 ownership boundary

The active block preserves these frozen ownership boundaries:

- CR-22 owns Building identity/lifecycle/registration,
- CR-23 owns Person/Home/housing capacity and derived occupancy,
- CR-24 owns construction state/progress/completion only,
- existing resource definitions own stable `resource-type:` identity,
- CR-25A owns immutable BuildingStock entry values,
- CR-25B owns deterministic stock add/remove mutation behavior.

CR-25C adds minimal Production -> BuildingStock input/output execution only. The following remain outside CR-25C:

- automatic population creation / Household / BirthTimer,
- profession/workforce assignment,
- production timing/ticks/state,
- storage capacity/slots,
- transport execution changes,
- construction material consumption,
- movement/pathfinding changes,
- demolition/destruction,
- SaveGame ownership,
- rendering/animation,
- balancing/UI/Inspector.

## 6. Next allowed action

Run the focused **CR-25C Verification / Freeze Gate**. Only after **PASS / 0 BLOCKER** may CR-25C receive its immutable frozen marker. Then run the full **CR-25 completion/regression/freeze gate** before planning a new system block.

## 7. Branch / source-of-truth rules

- `main` remains historical old-game reference.
- `feature/cr-25-buildingstock-production-foundation` remains the single CR-25 development branch.
- Do not create separate A/B/C working branches under normal conditions.
- Frozen markers may be created only after the corresponding verification gate passes.

---

**Updated:** 2026-09-05 after CR-25C Production -> BuildingStock implementation. Current next step: **CR-25C verification / freeze gate**.
