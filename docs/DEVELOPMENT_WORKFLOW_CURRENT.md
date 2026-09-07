# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-31-navigation-integration-foundation`
- Frozen whole-CR predecessor: **CR-30 – Housing / Population / Gold Integration Foundation**
- CR-30 freeze marker: `frozen/cr-30-housing-population-gold-integration-foundation`
- CR-30 frozen commit: `2e9208614a5cfd80abc47e39ccf236b80315ace8`
- CR-31 – Navigation Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-31A – World-backed Traversability Source Contract: **IMPLEMENTED / AUTOMATED VERIFIED / BROWSER VERIFIED / ACCEPTED / PASS / 0 BLOCKER / FREEZE GATE NEXT / NOT YET FROZEN**
- CR-31B / CR-31C: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**
- Current allowed action: CR-31A verification/freeze gate only; CR-31B remains locked until CR-31A is frozen.

## 2. CR-31 repository reconciliation result

The frozen CR-30 repository already contains the navigation/route/traffic foundations that CR-31 must reuse rather than rebuild.

Existing authoritative building blocks include `MapStructure`, `TraversabilityContract`, `BlockedCellSource`, deterministic grid/cost pathfinding, road preference, obstacle-aware routing and the frozen occupancy/reservation/waiting/deadlock/recovery chain.

The integration gap is between the real CR-28–30 world/domain state and the existing traversability consumer boundary. CR-31 introduces no replacement pathfinder or traffic owner.

## 3. CR-31A – World-backed Traversability Source Contract

**IMPLEMENTED / AUTOMATED VERIFIED / BROWSER VERIFIED / ACCEPTED / PASS / 0 BLOCKER / FREEZE GATE NEXT / NOT YET FROZEN**.

Implementation:

- `src/transport/world-backed-traversability-source.js`
- `src/dev/cr-31a-self-test.node.js`

Implemented boundary:

- `MapStructure` remains the spatial boundary,
- `TraversabilityContract` remains the `TRAVERSABLE` / `BLOCKED` semantic contract,
- the source exposes the existing downstream-compatible `stateAt`, `isTraversable` and `entries` surface,
- real existing Buildings in lifecycle state `EXISTS` are treated as static world occupancy,
- each real Building world position is deterministically projected into its containing map cell using the map origin and cell size,
- multiple Buildings in one cell still create only one blocked-cell truth,
- retired Buildings no longer contribute static blocking,
- Persons do not become static traversability owners,
- cells outside `MapStructure` remain invalid,
- identical real world/domain state produces identical sorted blocked-cell evidence,
- the existing `ObstacleAwareRoutingIntegration` can consume the new source unchanged,
- no new reachability search, route algorithm, path cost, Road Preference, Wear, traffic/reservation/deadlock/recovery ownership or movement was added.

Browser evidence setup:

- visible/build identity is synchronized to `CR-31A – World-backed Traversability Source Contract`,
- `RuntimeConfig.build = CR-31A-WORLD-BACKED-TRAVERSABILITY-SOURCE-CONTRACT`,
- the existing CR-30 browser miniworld remains visible,
- its 3 real existing Buildings produce 3 static `BLOCKED` cells,
- CR-30 Population 3 and Gold Balance 3 remain preserved and visible as predecessor evidence.

Automated verification:

- first CI run `34086953706` correctly exposed an obsolete predecessor-gate coupling: the frozen CR-30 completion gate asserted that the *current* page must still carry CR-30 identity. CR-30A/B/C themselves passed; this was not a CR-31A domain failure.
- the CR-30 frozen contract/test files were not modified. CI was corrected to regress frozen CR-29 + CR-30A + CR-30B + CR-30C directly, while the historical CR-30 completion-page identity check remains frozen for its original gate.
- GitHub Actions run `34087031469` on commit `a5b0a6dd2e65fdd7359ed2071321b02677b99215`: **SUCCESS / PASS / 0 BLOCKER**.
- regression chain includes baseline CI, CR-24C, CR-28, CR-29, CR-30A/B/C and CR-31A direct verification.

Real browser/device acceptance evidence (2026-09-07, iPhone Safari / GitHub Pages):

- top runtime status visibly shows `READY`,
- visible heading is `CR-31A – World-backed Traversability Source Contract`,
- evidence panel visibly shows `CR-31A ACTIVE`,
- panel confirms `3 static BLOCKED cells aus realen Buildings`,
- panel confirms free cells `TRAVERSABLE`,
- predecessor evidence remains `CR-30 Population 3 / Gold 3 erhalten`,
- panel confirms `3 Buildings / 3 Persons sichtbar`,
- rendered world visibly contains three building squares and three person markers,
- no stale CR-30 completion-gate identity is presented as current build.

Result: **BROWSER ACCEPTANCE PASS / 0 BLOCKER**. This evidence authorizes the CR-31A freeze gate; it does not yet authorize CR-31B implementation.

## 4. CR-31B / CR-31C

### CR-31B – Deterministic World Reachability Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May later consume frozen CR-31A traversability and existing deterministic routing primitives to answer whether two valid world positions are connected/reachable. It must not yet alter movement or introduce Path/Wear.

### CR-31C – Runtime Entity Navigation Validation Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May later allow real runtime Persons/Carriers to validate existing positions/targets against the frozen navigation truth. Existing route/movement/traffic owners remain authoritative.

## 5. Current CR-31A gate

Automated verification and real browser/device verification are both PASS / 0 BLOCKER. The next and only allowed step is the **CR-31A Verification / Freeze Gate**: regress the accepted CR-31A implementation against the frozen predecessor line, confirm visible/build identity consistency, and freeze CR-31A only on PASS / 0 BLOCKER.

CR-31B remains locked until that freeze is complete.

## 6. Locked later work

Path/Wear remains after CR-31. SaveGame remains IM-13, UI/Mobile IM-14, Guidance/Inspector IM-15.

## 7. Permanent visible CR / build identity synchronization rule

Every browser/device-verifiable CR/substep must update all applicable visible/build identity surfaces in the same implementation step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-07 — CR-31A automated regression PASS / 0 BLOCKER and real iPhone Safari/GitHub Pages evidence accepted PASS / 0 BLOCKER; CR-31A Verification / Freeze Gate is now the sole next action.