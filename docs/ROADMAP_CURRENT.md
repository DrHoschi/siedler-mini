# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – Post-CR25 planning  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-25-buildingstock-production-foundation`  
**Frozen gameplay baseline:** **CR-25 – BuildingStock / Production Foundation**

## 1. Authority

This file is the current implementation-priority roadmap for the clean modular rebuild. Repository state, frozen CR evidence and this file outrank chat memory.

The old game on `main` remains historical functional and visual reference only. It is not an architecture baseline or integration target. Target: functional parity or better, never legacy-code parity.

IM numbers remain higher-level product/migration capability areas. CR numbers are the actual modular system blocks. They are not a 1:1 numbering scheme.

## 2. Current frozen line

CR-00 through CR-24 remain frozen predecessor foundations.

### CR-25 – BuildingStock / Production Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER

CR-25 advances **IM-08** and is fully frozen:

- **CR-25A – BuildingStock Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-25B – Deterministic BuildingStock Mutation — PASS / FROZEN / 0 BLOCKER**
- **CR-25C – Production -> BuildingStock Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-25 whole-system Completion / Regression / Freeze Gate — PASS / 0 BLOCKER**

The complete device/browser system gate passed on 2026-09-05.

## 3. Frozen CR-25 capability

CR-25 provides:

- immutable local BuildingStock entry values,
- deterministic add/remove mutation,
- guards against invalid mutation, over-withdrawal and Safe-Integer overflow,
- minimal deterministic Production -> BuildingStock input/output execution,
- atomic rejection when required local input is insufficient,
- immutable deterministic stock results.

CR-25 intentionally does not own production timing/state, workforce/professions, storage capacity/slots, transport execution, construction-material integration, SaveGame ownership, rendering/animation, UI/Inspector or balancing.

## 4. Product-capability direction

The authoritative product chain remains:

`HQ -> Häuser -> Bewohner -> Produktion -> lokaler Bestand -> Transport -> HQ/Baustelle -> Bau -> Expansion`

Current capability priority after CR-25:

1. ~~Building ownership / lifecycle foundation~~ — **CR-22 COMPLETE / FROZEN**
2. ~~Person / Resident / Housing foundation~~ — **CR-23 COMPLETE / FROZEN**
3. ~~Construction foundation~~ — **CR-24 COMPLETE / FROZEN** — advances IM-07
4. ~~BuildingStock / Production foundation~~ — **CR-25 COMPLETE / FROZEN** — advances IM-08
5. Integrated workforce / job eligibility — advances the non-transport part of IM-06
6. Game-facing logistics/navigation integration — advances IM-09 + IM-11
7. Visible world/render integration
8. SaveGame owner snapshots / Continue — IM-13
9. Mobile UI runtime integration — IM-14
10. Path/Wear presentation — IM-12
11. Guidance + Inspector / diagnostics / balancing — IM-15
12. Architecture closure + V1 Golden Path — finish IM-16 + IM-17

Population / Resident Creation remains deferred and must build on frozen CR-23 housing capacity rather than modifying CR-23.

## 5. Next-system planning boundary

No new CR number/title is authorized yet.

The next step is repository-based planning against the remaining IM/product requirements. The next system block must preserve all frozen ownership boundaries, especially:

- CR-22 Building identity/lifecycle/registration,
- CR-23 Person/Home/housing capacity/derived occupancy,
- CR-24 construction state/progress/completion,
- CR-25 BuildingStock and minimal Production -> BuildingStock behavior.

The exact next CR title and A/B/C decomposition must be explicitly accepted before implementation or branch creation.

## 6. Next allowed action

Reconcile the live repository against the remaining capability priorities, with particular attention to the next product dependency after frozen BuildingStock/Production. Define the smallest coherent next system boundary and its scope/non-scope. Do not create a new development branch until that boundary is accepted.

## 7. Branch / source-of-truth rules

- `main` remains historical old-game reference.
- `feature/cr-25-buildingstock-production-foundation` remains CR-25 development history.
- The whole CR-25 frozen marker is the new immutable gameplay baseline.
- Frozen sub-block/system branches are immutable markers only.
- A future system block receives one development branch after explicit boundary acceptance.

---

**Updated:** 2026-09-05 after CR-25 device/browser whole-system Completion / Regression / Freeze Gate: **PASS / 0 BLOCKER**. Current next step: **next-system planning / IM ↔ CR reconciliation**.
