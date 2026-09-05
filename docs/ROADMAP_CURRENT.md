# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-25A active  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-25-buildingstock-production-foundation`  
**Frozen gameplay baseline:** **CR-24 – Construction Foundation**  
**Frozen implementation branch:** `frozen/cr-24c-construction-completion-boundary`  
**Frozen implementation SHA:** `c3986fbd810b1150d10d0945ed2f27c77c3eaa63`

## 1. Authority

This file is the current implementation-priority roadmap for the clean modular rebuild. Repository state, frozen CR evidence and this file outrank chat memory.

The old game on `main` remains historical functional and visual reference only. It is not an architecture baseline or integration target. Target: functional parity or better, never legacy-code parity.

IM numbers remain higher-level product/migration capability areas. CR numbers are the actual modular system blocks. They are not a 1:1 numbering scheme.

## 2. Current frozen line

CR-00 through CR-24 are the current frozen predecessor foundations.

### CR-24 – Construction Foundation — PASS / FROZEN / 0 BLOCKER

CR-24 establishes construction state/progress/completion only and remains unchanged by CR-25.

## 3. Current system block

### CR-25 – BuildingStock / Production Foundation — ACTIVE

CR-25 advances **IM-08** and is implemented sequentially on one development branch.

- **CR-25A – BuildingStock Contract — IMPLEMENTED / NOT FROZEN**
  - one immutable stock entry belongs to one stable `building:` ID,
  - references one stable `resource-type:` ID,
  - stores a non-negative safe-integer `quantity`, default `0`,
  - introduces no stock mutation, storage capacity or production behavior.
- **CR-25B – Deterministic BuildingStock Mutation — PLANNED**
  - controlled addition/removal of stock only,
  - must not begin before CR-25A is accepted/frozen.
- **CR-25C – Production -> BuildingStock Contract — PLANNED**
  - minimal deterministic input/output integration on top of BuildingStock,
  - must not begin before CR-25B.

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

The active block must preserve these frozen ownership boundaries:

- CR-22 owns Building identity/lifecycle/registration,
- CR-23 owns Person/Home/housing capacity and derived occupancy,
- CR-24 owns construction state/progress/completion only,
- existing resource definitions own stable `resource-type:` identity.

CR-25A adds only descriptive local stock state. The following remain outside CR-25A:

- automatic population creation / Household / BirthTimer,
- profession/workforce assignment,
- production execution,
- transport execution changes,
- movement/pathfinding changes,
- demolition/destruction,
- rendering/animation,
- balancing/UI/Inspector.

## 6. Next allowed action

CR-25A must now undergo focused verification/regression. Only after **PASS / 0 BLOCKER** may it receive its immutable frozen marker and CR-25B become the next permitted implementation step.

## 7. Branch / source-of-truth rules

- `main` remains historical old-game reference.
- `frozen/cr-24c-construction-completion-boundary` remains the immutable predecessor gameplay baseline.
- `feature/cr-25-buildingstock-production-foundation` is the single CR-25 development branch.
- Do not create separate A/B/C working branches under normal conditions.
- Frozen markers may be created only after the corresponding verification gate passes.

---

**Updated:** 2026-09-05 after CR-25A BuildingStock Contract implementation. Current next step: **CR-25A verification / freeze gate**.
