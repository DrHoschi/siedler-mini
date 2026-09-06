# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-28-visible-world-runtime-integration-foundation`
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-28A – Game-State Render Projection Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-28B – Deterministic World Canvas Rendering: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-28C – Live Runtime -> Render Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Next allowed action: **select/authorize the next system block from the roadmap; no CR-29 implementation is implicitly authorized**

## 2. Frozen predecessor and CR-28 lineage

CR-27 frozen marker:

`frozen/cr-27-game-facing-logistics-integration-foundation`

CR-27 baseline commit:

`c821784264c846d00f15f018011eb13f817d13b5`

CR-28 was created directly from that immutable CR-27 baseline and implemented sequentially on one whole-CR branch.

The CR-28 whole-system frozen marker is created only at the final documented branch HEAD after the final CI verification of this freeze state.

## 3. CR-28 frozen result

### CR-28A – Game-State Render Projection Contract

**COMPLETE / FROZEN / PASS / 0 BLOCKER**.

- renderer-neutral read-only projection for Map, Buildings and Persons,
- stable identities and deterministic ordering,
- explicit visible fields only,
- deep immutable and alias-free output,
- no gameplay write-back.

### CR-28B – Deterministic World Canvas Rendering

**COMPLETE / FROZEN / PASS / 0 BLOCKER**.

- consumes CR-28A projection only,
- deterministic immutable render commands,
- visible world ground/grid/Building/Person representation,
- explicit deterministic Canvas role styles,
- same projection/options -> same ordered Canvas call/style sequence,
- no gameplay mutation.

### CR-28C – Live Runtime -> Render Integration

**COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen browser path:

`current Map/Building/Person owners -> read-only snapshots -> CR-28A projection -> CR-28B deterministic rendering -> Canvas`.

The obsolete CR-16A browser test-shell composition was removed from `src/main.js`. Current owner changes become visible only by taking a new projection/render pass; rendering remains non-authoritative.

Real iPhone Safari verification on 2026-09-06 confirmed visible green ground, grid, three distinguishable Buildings and three distinguishable Persons. The earlier black-Canvas blocker is CLOSED.

## 4. Whole-system Completion / Regression / Freeze Gate

Final gate implementation:

- `src/dev/cr-28-freeze-gate.node.js`
- `docs/CR-28_COMPLETION_REGRESSION_FREEZE_GATE.md`

The CI freeze command is:

`npm run ci && node src/dev/cr-24c-freeze-gate.node.js && node src/dev/cr-28-freeze-gate.node.js`

GitHub Actions run `34046869483` on commit `990920805b92e1faf645d7c057abd83092eee4b4` completed the frozen regression plus CR-28A/B/C whole-system gate successfully: **PASS / 0 BLOCKER**.

A final CI run is required after this documentation freeze state is committed; the CR-28 marker must point only to that final CI-verified HEAD.

## 5. Frozen CR-28 invariants

- gameplay/source state remains authoritative and read-only to projection/rendering,
- CR-28A projection is deeply immutable and alias-free,
- CR-28B render commands are deeply immutable,
- Map/Buildings/Persons coverage and ordering are deterministic,
- stable identities are preserved,
- same projection/options produce the same render-command and Canvas-call/style sequence,
- renderer owns no gameplay state and has no write-back path,
- current owner changes become visible only via a new snapshot/projection/render pass,
- browser-visible world/grid/Buildings/Persons are required evidence,
- frozen CR-27 ownership invariants remain unchanged.

## 6. Frozen CR-28 non-scope

CR-28 introduces no:

- Save/Load/Continue ownership,
- Gameplay HUD,
- Build menu,
- Inspector,
- touch controls,
- new camera mechanics,
- mandatory new assets,
- new pathfinding/movement/traffic behavior,
- BuildingStock/Workforce/Logistics ownership changes,
- production/construction/simulation semantics.

## 7. Next allowed action

CR-28 is **COMPLETE / FROZEN / PASS / 0 BLOCKER** after final CI verification and creation of its frozen marker.

The next development block must be selected explicitly from the current implementation roadmap and created from the frozen CR-28 marker. **Do not begin CR-29 or any other new implementation merely because CR-28 froze.**

---

**Updated:** 2026-09-06 for final **CR-28 – Visible World Runtime Integration Foundation Completion / Regression / Freeze Gate** state.
