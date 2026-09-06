# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-30-housing-population-gold-integration-foundation`
- Frozen predecessor: **CR-29 – Camera & World View Foundation**
- Frozen predecessor marker: `frozen/cr-29-camera-world-view-foundation`
- Frozen predecessor commit: `560334f6481aef0398b699d21100d0079ea429f1`
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-30 – Housing / Population / Gold Integration Foundation: **AUTHORIZED / ACTIVE / NOT FROZEN**
- Current authorized substep: **CR-30A – Home & Housing Capacity Contract**
- Next allowed action: implement and directly verify **CR-30A only** on the current whole-CR branch. CR-30B/C are planned but not yet implementation-authorized.

## 2. Why CR-30 is next

The binding migration order places **IM-10 – Housing / Population / Gold Integration** after IM-09 Logistics & Reservation Migration and before Navigation, Path/Wear, SaveGame, UI and Inspector work.

CR-25 through CR-27 established the BuildingStock / Workforce / Logistics boundary. CR-28 and CR-29 were the deliberately inserted visible-world and camera/view foundations. The next selected system block now returns to the unresolved IM-10 runtime boundary.

CR-23A already established stable real Person/Resident identity, while home, housing, capacity, occupancy and related housing/population state remained outside that contract. CR-30 extends that frozen identity boundary rather than duplicating it.

SaveGame, UI/Mobile and Guidance/Inspector remain later roadmap work and are not pulled forward by CR-30.

## 3. CR-30 – Housing / Population / Gold Integration Foundation

Guiding question:

> How are already-real persons controlled into residents of real houses, population derived from those real residents, and the non-physical gold economy built on that truth?

Whole-CR branch:

`feature/cr-30-housing-population-gold-integration-foundation`

Created directly from frozen CR-29 commit:

`560334f6481aef0398b699d21100d0079ea429f1`

### CR-30A – Home & Housing Capacity Contract

**AUTHORIZED / ACTIVE / NOT FROZEN**.

Scope:

- a Building may for the first time expose an explicit housing function,
- housing has a defined capacity,
- a real Person may have at most one unambiguous Home relationship,
- Home/Housing data must preserve stable Building and Person identity,
- the contract must make invalid capacity/home relationships rejectable and deterministic,
- no existing frozen gameplay owner may silently gain a second source of truth.

Explicit non-scope:

- no automatic resident creation,
- no automatic housing assignment policy beyond the minimal contract operations needed to establish/validate a Home relation,
- no derived Population integration yet,
- no free-slot resident generation,
- no Gold,
- no SaveGame/restore behavior,
- no UI/Inspector work,
- no Navigation/Path/Wear changes,
- no BuildingStock, Workforce, Logistics, camera or render ownership changes.

### CR-30B – Deterministic Housing & Population Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Planned boundary: existing real Persons are assigned to housing in a controlled deterministic way; Population is derived only from valid real residents; only genuinely remaining free housing capacity may create general residents. No random specialists and no second Population truth.

### CR-30C – Gold Economy Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Planned boundary: Gold is owned by a clear economy owner and derived/generated from real valid residents. Gold remains explicitly non-physical and must not be inserted into BuildingStock or Logistics. No restore surcharge/additional restore tax.

### CR-30 Completion / Regression / Freeze Gate

After A+B+C are complete, regress CR-30 as a whole against the frozen predecessor line. Only **PASS / 0 BLOCKER** may freeze CR-30 and authorize selection of a successor system block.

## 4. Frozen predecessor boundary that CR-30 must preserve

CR-29 presentation chain remains frozen:

`gameplay/world owners -> CR-28A immutable projection -> CR-28B deterministic world render commands -> CR-29A immutable camera/view state -> CR-29B deterministic screen-space projection -> CR-29C controlled camera-only input -> Canvas`

CR-30 must not alter camera/view ownership, world-to-screen projection, pan/zoom behavior, or write presentation state back into gameplay owners.

CR-25/26/27 ownership boundaries for BuildingStock, Workforce and Logistics remain frozen unless an explicitly authorized CR-30 contract requires a read-only relationship. Gold must not become a physical stock/logistics resource.

## 5. Permanent visible CR / build identity synchronization rule

This rule is mandatory for every future CR or substep that changes, deploys, tests or presents a visible browser/test page.

Before a browser/device gate, before declaring a visible substep PASS, and again before a whole-CR Freeze Gate, verify that the deployed page visibly identifies the **current authorized CR/substep** and does not retain stale identity from a predecessor.

The check covers all applicable visible/build identity surfaces, including document/page title, visible heading, explanatory/diagnostic copy, runtime/test-status text, accessibility labels, build/version badges, cache-busting/version identifiers and any other visible string naming an earlier CR/substep.

A stale predecessor label is a **visible verification defect** and must be corrected before the relevant browser/device verification or Freeze Gate is complete.

For CR-30A, if the existing browser/test page is touched or used as CR-30A evidence, its visible identity must be synchronized to **CR-30A – Home & Housing Capacity Contract** as part of CR-30A completion work.

## 6. Standard whole-CR workflow

1. Keep all normal CR-30A/B/C work on the current whole-CR branch.
2. Implement only the currently authorized substep and its direct tests.
3. Do not smuggle later B/C behavior into A.
4. Advance to the next substep only after the current substep is explicitly reviewed/accepted.
5. After the final substep, run the whole-CR Completion / Regression / Freeze Gate.
6. Only PASS / 0 BLOCKER may produce a frozen CR-30 marker.
7. No successor CR is implicitly authorized by CR-30 completion.

---

**Updated:** 2026-09-06 — CR-30 explicitly selected from the current migration roadmap, whole-CR branch created from exact frozen CR-29 commit `560334f6481aef0398b699d21100d0079ea429f1`, and control advanced to CR-30A only.