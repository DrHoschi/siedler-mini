# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-30-housing-population-gold-integration-foundation`
- Frozen whole-CR predecessor: **CR-29 – Camera & World View Foundation** @ `560334f6481aef0398b699d21100d0079ea429f1`
- CR-30A – Home & Housing Capacity Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `f74d6bc1399212650c11196f8f098a419eda6cbf`
- CR-30B – Deterministic Housing & Population Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `e00fb5bbbde6f7f6e72b81ac77a44f0a263834a5`
- CR-30C – Gold Economy Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `7248b7ad0cc20b60f5919a422a261ab7cd2221d8`
- CR-30 – Housing / Population / Gold Integration Foundation: **WHOLE-CR AUTOMATED GATE PASS / BROWSER GATE PENDING / NOT FROZEN**
- Current allowed action: real browser/device verification of the **CR-30 Completion / Regression / Freeze Gate** only.

## 2. Frozen CR-30 source truth

CR-30A owns Housing capacity and one-Home invariants. CR-30B owns deterministic Housing/Population integration and the immutable `derived-population` truth from valid real housed Persons. CR-30C owns exactly one non-physical Gold balance and consumes only that derived Population truth.

No independent mutable Population counter/store exists. Gold is not Resource/BuildingStock state, not Logistics cargo and not a TransportJob.

## 3. CR-30 Completion / Regression / Freeze Gate

**AUTOMATED PASS / 0 BLOCKER — REAL BROWSER/DEVICE GATE PENDING — WHOLE CR-30 NOT YET FROZEN**.

Whole-gate implementation:

- `src/dev/cr-30-freeze-gate.node.js` runs frozen CR-29 plus CR-30A, CR-30B and CR-30C together,
- CI additionally runs the existing baseline, CR-24C and CR-28 gates before the CR-30 whole gate,
- visible page/build identity is synchronized to `CR-30 Completion / Regression / Freeze Gate`,
- `RuntimeConfig.build = CR-30-COMPLETION-FREEZE-GATE`,
- stale `CR-30C ACTIVE` runtime evidence is rejected by the whole-gate test.

Automated evidence:

- GitHub Actions run `34061733270` on commit `67bf665b9cf0acf94c0ec1f70ca01a39322fefb5`: **SUCCESS / PASS / 0 BLOCKER**,
- chain: `npm run ci` + CR-24C + CR-28 + CR-30 whole gate,
- CR-30 whole gate internally covers frozen CR-29 + CR-30A + CR-30B + CR-30C,
- Housing/Home, derived Population and non-physical Gold invariants therefore passed together with the frozen world/camera regression.

Remaining mandatory final evidence before whole-CR freeze:

- real iPad/Safari or equivalent browser/device verification of the deployed completion-gate page,
- visible title/heading/status identify the CR-30 Completion / Regression / Freeze Gate,
- runtime is READY,
- evidence still shows Population 3, 3 Home Assignments, Gold Income 3, Gold Balance 3, NON-PHYSICAL and preserved 3 Buildings / 3 Persons,
- no stale CR-30A/B/C identity is presented as the current build.

Only after this real browser gate is accepted at **PASS / 0 BLOCKER** may the whole-CR freeze marker be created.

## 4. Locked later work

Navigation, Path/Wear, SaveGame, UI/Mobile and Inspector remain locked until whole CR-30 is frozen. A successful CR-30 freeze does not implicitly authorize any successor CR.

## 5. Permanent visible CR / build identity synchronization rule

Before a browser/device gate, before declaring a visible substep PASS, and again before a whole-CR Freeze Gate, verify every applicable visible/build identity surface against the current authorized CR/substep/gate. A stale predecessor label is a verification defect.

---

**Updated:** 2026-09-06 — CR-30 automated whole-block Completion / Regression / Freeze Gate passed at `67bf665b9cf0acf94c0ec1f70ca01a39322fefb5` / Actions run `34061733270`; real browser/device gate is the sole remaining blocker before whole CR-30 freeze.
