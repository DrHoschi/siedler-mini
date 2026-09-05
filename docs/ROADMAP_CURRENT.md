# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – Post-CR22  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `maintenance/post-cr22-project-control-sync`  
**Frozen gameplay baseline:** **CR-22 – Building Ownership / Lifecycle Foundation**  
**Frozen implementation branch:** `frozen/cr-22c-building-registration-world-ownership-integration`  
**Frozen implementation SHA:** `d507bf0797b8b4be4090cbca0d74cf20760500b5`

## 1. Authority

This file is the current implementation-priority roadmap for the clean modular rebuild. Repository state, frozen CR evidence and this file outrank chat memory.

The old game on `main` remains historical functional and visual reference only. It is not an architecture baseline or integration target. Target: functional parity or better, never legacy-code parity.

IM numbers remain higher-level product/migration capability areas. CR numbers are the actual modular system blocks. They are not a 1:1 numbering scheme.

## 2. Current frozen line

CR-00 through CR-21 remain frozen predecessor foundations. The latest completed system block is:

### CR-22 – Building Ownership / Lifecycle Foundation — PASS / FROZEN / 0 BLOCKER

- **CR-22A – Building Identity & Ownership Contract — FROZEN**
  - stable `BuildingId`
  - building-definition reference
  - stable Building owner anchor
- **CR-22B – Building Lifecycle State Contract — FROZEN**
  - existential lifecycle `EXISTS -> RETIRED`
  - `RETIRED` terminal
  - no Construction semantics
- **CR-22C – Building Registration & World Ownership Integration — FROZEN**
  - register the Building owner in the existing Building DomainStore
  - deterministic lookup
  - duplicate rejection
  - controlled removal without automatic lifecycle transition

CR-22 deliberately does not contain residents, housing capacity, workforce, professions, construction, production, BuildingStock, storage, population growth or related timers.

CR-22 advances **IM-01 Public Owner Boundaries & Runtime Contracts** and **IM-04 BuildingStore Ownership Consolidation**.

## 3. Product-capability direction

The authoritative product chain remains:

`HQ -> Häuser -> Bewohner -> Produktion -> lokaler Bestand -> Transport -> HQ/Baustelle -> Bau -> Expansion`

The capability priority established before CR-22 remains valid. CR-22 completed priority 1. Therefore the next priority is now:

1. ~~Building ownership / lifecycle foundation~~ — **CR-22 COMPLETE / FROZEN**
2. **Person / Resident / Housing foundation — NEXT** — advances IM-05 + IM-10
3. Construction foundation — advances IM-07
4. BuildingStock / Production foundation — advances IM-08
5. Integrated workforce / job eligibility — advances the non-transport part of IM-06
6. Game-facing logistics/navigation integration — advances IM-09 + IM-11
7. Visible world/render integration
8. SaveGame owner snapshots / Continue — IM-13
9. Mobile UI runtime integration — IM-14
10. Path/Wear presentation — IM-12
11. Guidance + Inspector / diagnostics / balancing — IM-15
12. Architecture closure + V1 Golden Path — finish IM-16 + IM-17

The exact future CR title is defined only when its scope contract is written. This roadmap fixes priority and dependency, not premature CR internals.

## 4. Next system-block planning boundary

The next system block must address **Person / Resident / Housing foundation** and advance IM-05 + IM-10.

Required capability area from the reconciled roadmap:

- real stable Person/Resident identity,
- Home / housing relationship,
- housing capacity,
- resident lifecycle / controlled resident creation rules,
- later compatibility with specialists/workforce and founder/start roster.

This does **not** mean all of those capabilities belong in the first sub-step. The next CR must again be split into small contracts before implementation.

The following remain outside the initial planning boundary unless explicitly introduced by a later sub-block:

- profession assignment,
- worker/job eligibility,
- tools or clothing acquisition,
- production,
- construction execution,
- BuildingStock,
- transport integration,
- detailed birth/child simulation or balancing timers,
- UI/rendering.

The previously discussed design direction remains compatible with this roadmap: housing may later provide a bounded resident population, and residents may later become workers through explicit workforce/profession systems. CR-22 Buildings are now the stable owners those relationships can reference.

## 5. Inspector / diagnostics timing

Inspector and balancing diagnostics remain later capabilities, not prerequisites for the next gameplay owner. Automated tests/freeze gates remain executable evidence; a later Inspector may display snapshots, metrics and diagnostics but must never become a gameplay owner.

## 6. Branch / source-of-truth rules

- `main` remains historical old-game reference.
- `frozen/cr-22c-building-registration-world-ownership-integration` is the current immutable gameplay baseline.
- Project-control synchronization occurs on `maintenance/post-cr22-project-control-sync`.
- Do not start the next feature CR until this project-control synchronization is reviewed and accepted.
- The next feature CR must branch from the accepted synchronized baseline, not from an obsolete CR-22A/B/C working branch.
- Browser/device text, docs, CI naming and actual branch state must stay synchronized.

---

**Updated:** 2026-09-05 after CR-22A/B/C formal freeze. Next roadmap capability: **Person / Resident / Housing foundation (IM-05 + IM-10)**.
