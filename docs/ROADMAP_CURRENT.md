# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-30 FROZEN / CR-31 ACTIVE / CR-31A AUTOMATED PASS / BROWSER GATE PENDING  
**Repository:** `DrHoschi/siedler-mini`  
**Current control branch:** `feature/cr-31-navigation-integration-foundation`  
**Latest whole-CR freeze:** **CR-30 – Housing / Population / Gold Integration Foundation**  
**Latest whole-CR freeze marker:** `frozen/cr-30-housing-population-gold-integration-foundation` @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-30 – Housing / Population / Gold Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- **Navigation – now represented by CR-31**,
- later Path/Wear,
- IM-13 – SaveGame,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

## 3. CR-31 – Navigation Integration Foundation

Status: **ACTIVE / NOT FROZEN**.

Frozen CR-30 already contains MapStructure, Traversability, deterministic routing, Road Preference, obstacle-aware routing and the traffic/reservation/deadlock/recovery chain. CR-31 therefore integrates the real world with those owners rather than rebuilding them.

### CR-31A – World-backed Traversability Source Contract

Status: **IMPLEMENTED / AUTOMATED VERIFIED / PASS / 0 BLOCKER / BROWSER GATE PENDING / NOT FROZEN**.

Implemented capability:

- `WorldBackedTraversabilitySource` projects real existing Building world positions into their containing `MapStructure` cells,
- existing Buildings in lifecycle state `EXISTS` produce static `BLOCKED` cells,
- retired Buildings do not block,
- free cells remain `TRAVERSABLE`,
- Persons do not become static traversal owners,
- outside-map cells remain invalid,
- output is deterministic and downstream-compatible with existing obstacle-aware routing through `stateAt` / `isTraversable`,
- no new routing algorithm, reachability algorithm, Road Preference, Wear, traffic, reservation or movement behavior was introduced.

Verification:

- direct test: `src/dev/cr-31a-self-test.node.js`,
- first CI run `34086953706` exposed only the historical CR-30 completion-page identity assertion being unsuitable as a successor regression; CR-30A/B/C themselves passed,
- frozen CR-30 test code remained unchanged,
- successor CI now regresses CR-29 + CR-30A/B/C directly before CR-31A,
- Actions run `34087031469` on `a5b0a6dd2e65fdd7359ed2071321b02677b99215` = **SUCCESS / PASS / 0 BLOCKER**.

Visible evidence is synchronized to CR-31A. The deployed browser miniworld should show 3 static BLOCKED cells from the 3 existing real Buildings while preserving CR-30 Population 3 / Gold 3 and the visible 3 Buildings / 3 Persons.

### CR-31B – Deterministic World Reachability Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May consume frozen CR-31A plus existing deterministic routing primitives to answer whether two valid world positions are connected/reachable. No Path/Wear or movement integration yet.

### CR-31C – Runtime Entity Navigation Validation Integration

Status: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

May validate existing real Person/Carrier positions and targets against the frozen navigation truth while keeping earlier route/movement/traffic owners intact.

## 4. Current next step

Perform real browser/device verification of **CR-31A – World-backed Traversability Source Contract** only. Required visible evidence: CR-31A title/heading, runtime READY, `CR-31A ACTIVE`, 3 static BLOCKED cells from real Buildings, free cells TRAVERSABLE, CR-30 Population 3 / Gold 3 preserved, and 3 Buildings / 3 Persons visible. CR-31B remains locked until CR-31A is explicitly accepted/frozen.

---

**Updated:** 2026-09-07 — CR-31A implementation and automated regression PASS / 0 BLOCKER; browser/device verification is the sole next gate.