# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – CR-31 WHOLE FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Completed control branch:** `feature/cr-31-navigation-integration-foundation`  
**Latest whole-CR freeze:** **CR-31 – Navigation Integration Foundation**  
**CR-31 whole freeze marker:** `frozen/cr-31-navigation-integration-foundation` @ `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`

## 1. Frozen line

CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.  
CR-30 – Housing / Population / Gold Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2e9208614a5cfd80abc47e39ccf236b80315ace8`.  
CR-31A – World-backed Traversability Source Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `39b43015721a5de2b4d63b221558431205767037`.  
CR-31B – Deterministic World Reachability Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `68ecf9a031d6d63da5dbb7cd24d558f1a1e89391`.  
CR-31C – Runtime Entity Navigation Validation Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `2886839edddcf636fc347a0e25d1e9b40ff16d85`.  
CR-31 – Navigation Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – represented by frozen CR-31,
- **next: Path/Wear**, exact CR structure not yet authorized,
- IM-13 – SaveGame,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

## 3. CR-31 – Navigation Integration Foundation

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

CR-31 now freezes the full navigation integration boundary:

- CR-31A: real existing Buildings drive static `TRAVERSABLE` / `BLOCKED` truth,
- CR-31B: valid real world positions can be tested deterministically for reachability through that truth using the existing deterministic search primitive,
- CR-31C: real runtime Person/Carrier positions and targets are validated against the same frozen navigation truth without moving them or taking over route/traffic ownership.

Whole-gate evidence:

- dedicated whole gate `src/dev/cr-31-freeze-gate.node.js`,
- GitHub Actions run `34100391182` on `f4fba712cd88dc83e616c0c4f360a2a016e5dff2` = **SUCCESS / PASS / 0 BLOCKER**,
- accepted real iPhone/Safari completion-gate screenshot = **PASS / 0 BLOCKER**,
- visible evidence confirmed CR-31A + CR-31B + CR-31C together, Person/Carrier `TARGET_REACHABLE`, `2/2 runtime entities VALID`, CR-31B `REACHABLE`, 3 static BLOCKED cells, CR-30 Population 3 / Gold 3 and 3 Buildings / 3 Persons.

Freeze marker: `frozen/cr-31-navigation-integration-foundation` @ `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`.

## 4. Next system block

The next migration area in the binding order is **Path/Wear**. This is now unblocked by the CR-31 freeze, but no concrete Path/Wear CR is automatically implementation-authorized.

The next permissible step is to determine the exact Path/Wear system boundary against frozen CR-31, inventory any existing path/wear ownership already present in the repository, and only then define/authorize the next whole CR and its A/B/C structure.

SaveGame, UI/Mobile and Guidance/Inspector remain later in the agreed order and must not be moved forward.

---

**Updated:** 2026-09-07 — CR-31 whole completion/regression/freeze gate PASS / 0 BLOCKER; whole CR-31 frozen at `f4fba712cd88dc83e616c0c4f360a2a016e5dff2`; Path/Wear is the next planning boundary.