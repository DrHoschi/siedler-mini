# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-25 completion gate active  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-25-buildingstock-production-foundation`  
**Frozen gameplay baseline:** **CR-25C – Production -> BuildingStock Contract**

## 1. Authority

This file is the current implementation-priority roadmap for the clean modular rebuild. Repository state, frozen CR evidence and this file outrank chat memory.

The old game on `main` remains historical functional and visual reference only. It is not an architecture baseline or integration target. Target: functional parity or better, never legacy-code parity.

IM numbers remain higher-level product/migration capability areas. CR numbers are the actual modular system blocks. They are not a 1:1 numbering scheme.

## 2. Current frozen line

CR-00 through CR-24 remain frozen predecessor foundations.

### CR-25A – BuildingStock Contract — PASS / FROZEN / 0 BLOCKER

Immutable local BuildingStock entry contract.

### CR-25B – Deterministic BuildingStock Mutation — PASS / FROZEN / 0 BLOCKER

Deterministic add/remove mutation with identity/immutability preservation and guards against invalid mutation, over-withdrawal and overflow.

### CR-25C – Production -> BuildingStock Contract — PASS / FROZEN / 0 BLOCKER

Minimal deterministic production input/output execution on local BuildingStock. Device/browser Verification / Freeze Gate passed with **PASS / 0 BLOCKER** on 2026-09-05.

## 3. Current system block

### CR-25 – BuildingStock / Production Foundation — COMPLETE_NOT_FROZEN

CR-25 advances **IM-08**.

- **CR-25A – BuildingStock Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-25B – Deterministic BuildingStock Mutation — PASS / FROZEN / 0 BLOCKER**
- **CR-25C – Production -> BuildingStock Contract — PASS / FROZEN / 0 BLOCKER**
- **CR-25 whole-system Completion / Regression / Freeze Gate — ACTIVE**

A new CR system block must not begin until this whole-block gate passes.

## 4. Product-capability direction

The authoritative product chain remains:

`HQ -> Häuser -> Bewohner -> Produktion -> lokaler Bestand -> Transport -> HQ/Baustelle -> Bau -> Expansion`

Current capability priority:

1. ~~Building ownership / lifecycle foundation~~ — **CR-22 COMPLETE / FROZEN**
2. ~~Person / Resident / Housing foundation~~ — **CR-23 COMPLETE / FROZEN**
3. ~~Construction foundation~~ — **CR-24 COMPLETE / FROZEN** — advances IM-07
4. **BuildingStock / Production foundation — CR-25 COMPLETE_NOT_FROZEN** — advances IM-08
5. Integrated workforce / job eligibility — advances the non-transport part of IM-06
6. Game-facing logistics/navigation integration — advances IM-09 + IM-11
7. Visible world/render integration
8. SaveGame owner snapshots / Continue — IM-13
9. Mobile UI runtime integration — IM-14
10. Path/Wear presentation — IM-12
11. Guidance + Inspector / diagnostics / balancing — IM-15
12. Architecture closure + V1 Golden Path — finish IM-16 + IM-17

The exact next CR title and decomposition remain undefined until CR-25 is fully frozen and the next system boundary is planned against the live repository.

## 5. CR-25 ownership boundary

- CR-25A owns immutable BuildingStock entry values.
- CR-25B owns deterministic stock add/remove mutation.
- CR-25C owns minimal deterministic Production -> BuildingStock input/output execution.

CR-25 contains no production timing/state, workforce/professions, capacity/slots, transport execution, construction-material integration, SaveGame ownership, rendering/animation, UI/Inspector or balancing.

## 6. Next allowed action

Run the complete **CR-25 A/B/C Completion / Regression / Freeze Gate** against the frozen predecessor line and the entire CR-25 contract chain.

Only at **PASS / 0 BLOCKER** may CR-25 become **COMPLETE / FROZEN**. After that, reconcile IM ↔ CR against the live repository and plan the next system block before creating any new implementation branch.

## 7. Branch / source-of-truth rules

- `main` remains historical old-game reference.
- `feature/cr-25-buildingstock-production-foundation` remains the single CR-25 development branch through the whole-system gate.
- Frozen sub-block branches are immutable markers only.
- Do not create a next-system development branch before CR-25 whole-block freeze and explicit next-boundary acceptance.

---

**Updated:** 2026-09-05 after CR-25C device/browser Verification / Freeze Gate: **PASS / 0 BLOCKER**. Current next step: **CR-25 whole-system completion / regression / freeze gate**.
