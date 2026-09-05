# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-25B active  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-25-buildingstock-production-foundation`  
**Frozen gameplay baseline:** **CR-25A – BuildingStock Contract**

## 1. Authority

This file is the current implementation-priority roadmap for the clean modular rebuild. Repository state, frozen CR evidence and this file outrank chat memory.

The old game on `main` remains historical functional and visual reference only. It is not an architecture baseline or integration target. Target: functional parity or better, never legacy-code parity.

IM numbers remain higher-level product/migration capability areas. CR numbers are the actual modular system blocks. They are not a 1:1 numbering scheme.

## 2. Current frozen line

CR-00 through CR-24 remain frozen predecessor foundations.

### CR-24 – Construction Foundation — PASS / FROZEN / 0 BLOCKER

CR-24 establishes construction state/progress/completion only and remains unchanged by CR-25.

### CR-25A – BuildingStock Contract — PASS / FROZEN / 0 BLOCKER

CR-25A establishes the immutable descriptive local BuildingStock entry contract:

- one stable `building:` ID,
- one stable `resource-type:` ID,
- non-negative safe-integer `quantity`, default `0`,
- deterministic immutable value,
- no mutation, capacity, production, workforce or transport behavior.

## 3. Current system block

### CR-25 – BuildingStock / Production Foundation — ACTIVE

CR-25 advances **IM-08** and is implemented sequentially on one development branch.

- **CR-25A – BuildingStock Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-25B – Deterministic BuildingStock Mutation — IMPLEMENTED / NOT FROZEN**
  - controlled `add` and `remove` operations,
  - each operation returns a new immutable CR-25A-compatible stock value,
  - stable Building/ResourceType identities are preserved,
  - over-withdrawal and Safe-Integer overflow are rejected,
  - negative stock cannot be produced,
  - no production behavior.
- **CR-25C – Production -> BuildingStock Contract — PLANNED**
  - minimal deterministic input/output integration on top of BuildingStock,
  - must not begin before CR-25B is frozen.

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
- CR-25A owns the immutable BuildingStock entry value contract.

CR-25B adds mutation behavior only. The following remain outside CR-25B:

- automatic population creation / Household / BirthTimer,
- profession/workforce assignment,
- production recipes/execution/timing,
- storage capacity/slots,
- transport execution changes,
- construction material consumption,
- reservation policy,
- movement/pathfinding changes,
- demolition/destruction,
- SaveGame ownership,
- rendering/animation,
- balancing/UI/Inspector.

## 6. Next allowed action

Run the focused **CR-25B Verification / Freeze Gate**. Only after **PASS / 0 BLOCKER** may CR-25B receive its immutable frozen marker and CR-25C become the next permitted implementation step.

## 7. Branch / source-of-truth rules

- `main` remains historical old-game reference.
- `feature/cr-25-buildingstock-production-foundation` remains the single CR-25 development branch.
- Do not create separate A/B/C working branches under normal conditions.
- Frozen markers may be created only after the corresponding verification gate passes.

---

**Updated:** 2026-09-05 after CR-25B Deterministic BuildingStock Mutation implementation. Current next step: **CR-25B verification / freeze gate**.
