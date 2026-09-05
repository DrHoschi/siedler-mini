# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – Post-CR24  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-24-construction-foundation`  
**Frozen gameplay baseline:** **CR-24 – Construction Foundation**  
**Frozen implementation branch:** `frozen/cr-24c-construction-completion-boundary`  
**Frozen implementation SHA:** `c3986fbd810b1150d10d0945ed2f27c77c3eaa63`

## 1. Authority

This file is the current implementation-priority roadmap for the clean modular rebuild. Repository state, frozen CR evidence and this file outrank chat memory.

The old game on `main` remains historical functional and visual reference only. It is not an architecture baseline or integration target. Target: functional parity or better, never legacy-code parity.

IM numbers remain higher-level product/migration capability areas. CR numbers are the actual modular system blocks. They are not a 1:1 numbering scheme.

## 2. Current frozen line

CR-00 through CR-23 remain frozen predecessor foundations. The latest completed system block is:

### CR-24 – Construction Foundation — PASS / FROZEN / 0 BLOCKER

- **CR-24A – Building Construction State Contract — FROZEN**
  - construction-specific state is strictly separate from CR-22 Building lifecycle `EXISTS -> RETIRED`
  - allowed states: `PENDING`, `IN_PROGRESS`, `COMPLETED`
  - stable `buildingId`, immutable and deterministic contract values
- **CR-24B – Deterministic Construction Progress / Transition Contract — FROZEN**
  - progress range `0.0 .. 1.0`
  - `PENDING` = `0.0`, `IN_PROGRESS` = `0 < progress < 1`, `COMPLETED` = `1.0`
  - forward-only progression; no regression, no `PENDING -> COMPLETED` skip
  - `COMPLETED` is terminal
- **CR-24C – Construction Completion Boundary — FROZEN**
  - `constructionComplete = false` for `PENDING` and `IN_PROGRESS`
  - `constructionComplete = true` only for `COMPLETED` with `progress = 1.0`
  - completion is deterministically derived, not independently stored
  - completion itself activates no downstream gameplay system

CR-24 deliberately contains no material consumption, builders/work-time behavior, detailed construction phases, production, resident/housing activation, workforce/profession assignment, BuildingStock/storage, transport generation/execution, demolition/destruction, rendering/animation or UI logic.

CR-24 advances **IM-07 – Construction Foundation** while preserving the frozen CR-22 Building lifecycle and CR-23 Person / Resident / Housing contracts unchanged.

## 3. Product-capability direction

The authoritative product chain remains:

`HQ -> Häuser -> Bewohner -> Produktion -> lokaler Bestand -> Transport -> HQ/Baustelle -> Bau -> Expansion`

Current capability priority:

1. ~~Building ownership / lifecycle foundation~~ — **CR-22 COMPLETE / FROZEN**
2. ~~Person / Resident / Housing foundation~~ — **CR-23 COMPLETE / FROZEN**
3. ~~Construction foundation~~ — **CR-24 COMPLETE / FROZEN** — advances IM-07
4. **BuildingStock / Production foundation — NEXT** — advances IM-08
5. Integrated workforce / job eligibility — advances the non-transport part of IM-06
6. Game-facing logistics/navigation integration — advances IM-09 + IM-11
7. Visible world/render integration
8. SaveGame owner snapshots / Continue — IM-13
9. Mobile UI runtime integration — IM-14
10. Path/Wear presentation — IM-12
11. Guidance + Inspector / diagnostics / balancing — IM-15
12. Architecture closure + V1 Golden Path — finish IM-16 + IM-17

Population / Resident Creation remains a deferred capability that may be scheduled when dependency and gameplay priority justify it. It must build on frozen CR-23 housing capacity rather than modifying CR-23.

The exact future CR title is defined only when its scope contract is written. This roadmap fixes priority and dependency, not premature CR internals.

## 4. Next system-block planning boundary

The next prioritized capability area is **BuildingStock / Production Foundation**, advancing IM-08.

No CR-25 implementation is authorized merely by this roadmap synchronization. The next step is planning: inspect the existing IM-08/product requirements and define the minimal next CR boundary before creating new code.

The planning must preserve these frozen ownership boundaries:

- CR-22 owns Building identity/lifecycle/registration,
- CR-23 owns Person/Home/housing capacity and derived occupancy,
- CR-24 owns construction state/progress/completion only.

The next block may establish the minimal modular ownership/contracts required for local BuildingStock and/or Production, but their exact A/B/C decomposition must be decided explicitly before implementation.

The following remain outside scope until explicitly introduced by the planned block or a later CR:

- automatic population creation / Household / BirthTimer,
- profession/workforce assignment,
- transport execution changes,
- movement/pathfinding changes,
- demolition/destruction,
- rendering/animation,
- balancing/UI/Inspector.

## 5. Inspector / diagnostics timing

Inspector and balancing diagnostics remain later capabilities, not prerequisites for BuildingStock / Production. Automated tests/freeze gates remain executable evidence; a later Inspector may display snapshots, metrics and diagnostics but must never become a gameplay owner.

## 6. Branch / source-of-truth rules

- `main` remains historical old-game reference.
- `frozen/cr-24c-construction-completion-boundary` is the current immutable gameplay baseline at `c3986fbd810b1150d10d0945ed2f27c77c3eaa63`.
- `feature/cr-24-construction-foundation` contains the completed CR-24 working line and synchronized control documents.
- Do not start CR-25 code until the BuildingStock / Production Foundation scope is explicitly planned and accepted.
- Continue the simplified branch policy: one development branch per system block; `frozen/...` branches are immutable completion markers, not additional working branches.
- Browser/device text, docs, CI naming and actual branch state must stay synchronized.

---

**Updated:** 2026-09-05 after CR-24A/B/C formal freeze. Next roadmap capability: **BuildingStock / Production Foundation (IM-08)**.
