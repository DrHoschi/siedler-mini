# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – Post-CR23  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `maintenance/post-cr23-project-control-sync`  
**Frozen gameplay baseline:** **CR-23 – Person / Resident / Housing Foundation**  
**Frozen implementation branch:** `frozen/cr-23c-housing-capacity-occupancy-foundation`  
**Frozen implementation SHA:** `1a3a01c0973cd21c0375c8bc308311a774e30120`

## 1. Authority

This file is the current implementation-priority roadmap for the clean modular rebuild. Repository state, frozen CR evidence and this file outrank chat memory.

The old game on `main` remains historical functional and visual reference only. It is not an architecture baseline or integration target. Target: functional parity or better, never legacy-code parity.

IM numbers remain higher-level product/migration capability areas. CR numbers are the actual modular system blocks. They are not a 1:1 numbering scheme.

## 2. Current frozen line

CR-00 through CR-22 remain frozen predecessor foundations. The latest completed system block is:

### CR-23 – Person / Resident / Housing Foundation — PASS / FROZEN / 0 BLOCKER

- **CR-23A – Person / Resident Identity Contract — FROZEN**
  - stable semantic Person/Resident identity
  - uses the existing stable `unit:` ID basis
  - minimal current existence state `EXISTS`
- **CR-23B – Resident ↔ Home Assignment Contract — FROZEN**
  - explicit Person → Home Building relationship
  - `UNASSIGNED` or `ASSIGNED`
  - exactly one `homeBuildingId` source of truth on the Person-side contract
- **CR-23C – Housing Capacity & Occupancy Foundation — FROZEN**
  - Building-scoped housing `capacity >= 0`
  - `occupancy` derived deterministically from CR-23B `ASSIGNED` Home references
  - `availableSlots = capacity - occupancy`
  - exact capacity allowed; overflow rejected
  - no independent mutable resident list or occupancy counter

CR-23 deliberately does not contain Household/family simulation, automatic resident creation, BirthTimer, population growth/regeneration, profession/workforce, tools/clothing, production, BuildingStock/storage, construction execution, transport or movement.

The previously listed broader Person/Resident/Housing capability area included resident lifecycle / controlled resident creation rules as a future compatibility requirement. That capability was intentionally **not implemented in CR-23A/B/C** and is now explicitly **DEFERRED** to a later Population / Resident Creation block. It is not an open CR-23 blocker and must not be silently added to CR-23 after freeze.

CR-23 advances **IM-05 + IM-10** by establishing stable person identity, Home ownership relation, housing capacity and occupancy consistency.

## 3. Product-capability direction

The authoritative product chain remains:

`HQ -> Häuser -> Bewohner -> Produktion -> lokaler Bestand -> Transport -> HQ/Baustelle -> Bau -> Expansion`

Current capability priority:

1. ~~Building ownership / lifecycle foundation~~ — **CR-22 COMPLETE / FROZEN**
2. ~~Person / Resident / Housing foundation~~ — **CR-23 COMPLETE / FROZEN**
3. **Construction foundation — NEXT** — advances IM-07
4. BuildingStock / Production foundation — advances IM-08
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

The next system block must address **Construction Foundation** and advance IM-07.

The planning goal is to establish the minimal modular contract for a Building to move through a construction process without changing the already frozen existential Building lifecycle from CR-22B.

Potential capability area to plan, not yet implement:

- construction-specific state/phase contract separate from Building `EXISTS -> RETIRED`,
- controlled construction progress/phase transition rules,
- deterministic completion boundary that yields a completed usable Building state,
- later compatibility with construction material demand / delivery and builders.

The first Construction sub-step must again be narrowly scoped before implementation.

The following remain outside the initial Construction planning boundary unless explicitly introduced by a later sub-block:

- residents / housing changes,
- population creation,
- profession/workforce assignment,
- production,
- BuildingStock/storage ownership,
- transport execution changes,
- rendering/animation,
- demolition/destruction unless separately defined,
- balancing/UI/Inspector.

## 5. Inspector / diagnostics timing

Inspector and balancing diagnostics remain later capabilities, not prerequisites for Construction. Automated tests/freeze gates remain executable evidence; a later Inspector may display snapshots, metrics and diagnostics but must never become a gameplay owner.

## 6. Branch / source-of-truth rules

- `main` remains historical old-game reference.
- `frozen/cr-23c-housing-capacity-occupancy-foundation` is the current immutable gameplay baseline.
- Project-control synchronization occurs on `maintenance/post-cr23-project-control-sync`.
- Do not start the next feature CR until this project-control synchronization is reviewed and accepted.
- The next feature CR must branch from the accepted synchronized baseline, not from obsolete CR-23 working branches.
- Browser/device text, docs, CI naming and actual branch state must stay synchronized.

---

**Updated:** 2026-09-05 after CR-23A/B/C formal freeze. Next roadmap capability: **Construction Foundation (IM-07)**.
