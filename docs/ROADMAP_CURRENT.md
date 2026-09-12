# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 through IM-18 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-19 IN PROGRESS; IM-19A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-19B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-19C IMPLEMENTED / NOT FROZEN  
**Repository:** `DrHoschi/siedler-mini`  
**Frozen IM-18 Whole-Block head:** `2d068aa357ec5d1fe8f53eb867037021d04caddf`  
**Frozen IM-18 Whole-Block marker:** `frozen/im-18-operational-building-workforce-production-integration`  
**Current Whole-Block branch:** `feature/im-19-population-housing-gold-economy-integration`

## 1. Frozen line

CR-25 through CR-32 and IM-13 through IM-18 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen IM-17 Whole-Block:
- `frozen/im-17-economic-construction-integration` @ `53de400c2ffe57addf832b599b906b3d5b473385`

Frozen IM-18 substeps:

- IM-18A – Operational Building Admission Contract @ `01ad19b2064887b131b4bdd1dd7157f0a4f6724c`
- IM-18B – Workforce Requirement / Eligibility Contract @ `42e64722b34ed7d516735111c5c4ce573631d59a`
- IM-18C – Deterministic Workforce Assignment Integration @ `195299b0fb7098806be88b7c0b3a577ca737ecb6`
- IM-18D – Production Requirement / Recipe Integration @ `2e5d4fc53295a7abee92b0f9190a6bac1b5e31fe`
- IM-18E – Operational Production Execution @ `9d1a3bb165564b29ad7ad1a5ee8619ed2d131c20`
- IM-18F – Input Consumption / Output Settlement @ `6cfe680eb8b66c8015026629a7200483ae4c3bdd`
- IM-18G – Player Operational State Projection @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`

Frozen IM-18 Whole-Block:
- `frozen/im-18-operational-building-workforce-production-integration` @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`

Frozen IM-19A:
- `frozen/im-19a-residential-building-admission-contract` @ `b528081409407ad531a450e5deb832ee7a0031e7`

Frozen IM-19B:
- `frozen/im-19b-housing-capacity-occupancy-integration` @ `3ba5a17761ac7f8bce3f01a49cbaef515728c355`

## 2. Binding ownership after IM-18

- Frozen IM-17 remains the economic construction authority from Player commit through material demand, delivery-driven construction progress and exactly-once completion.
- Existing Building lifecycle remains separate from Building Construction state and from operational admission.
- IM-18A consumes existing construction completion and Building lifecycle; it does not create a second Building or completion authority.
- Existing Person workforce profiles and Workforce assignment-state contracts remain authoritative. IM-18B/C only define requirement, eligibility and deterministic assignment integration.
- Existing production BuildingStock recipe remains authoritative. IM-18D binds assigned operational workforce to that existing recipe for the same Building.
- Existing BuildingStock remains production input/output inventory authority. IM-18E evaluates availability; IM-18F mutates stock through existing mutation contracts.
- IM-18F protects production settlement from duplicate application by settlement ID.
- IM-18G is Player-facing projection only and owns no Building, workforce, recipe, production, stock or settlement truth.
- Existing Runtime, Resource, Transport, Scheduler, SaveGame, Selection and Camera boundaries remain authoritative.
- IM-15 Inspector remains observer/guidance except its already frozen diagnostic action allowlist.

## 3. IM-18 – Operational Building / Workforce / Production Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Definition baseline:** frozen IM-17 @ `53de400c2ffe57addf832b599b906b3d5b473385`.

**Frozen Whole-Block head:** `2d068aa357ec5d1fe8f53eb867037021d04caddf`.

**Frozen marker:** `frozen/im-18-operational-building-workforce-production-integration`.

### Whole-Block flow

`frozen IM-17 completed Building → operational admission → workforce requirement/eligibility → deterministic workforce assignment → existing production recipe integration → input readiness evaluation → deterministic BuildingStock settlement → read-only Player operational-state projection`.

The complete flow is covered by frozen IM-18A through IM-18G without introducing a second Building, Person, Workforce, Recipe, Production or BuildingStock authority.

### IM-18A – Operational Building Admission Contract

Requires construction completion for the same stable Building and Building lifecycle `EXISTS` before the Building can enter the operational chain.

### IM-18B – Workforce Requirement / Eligibility Contract

Defines worker count, specialization and required capabilities for an operational Building; eligibility consumes only existing workforce profiles and assignment state.

### IM-18C – Deterministic Workforce Assignment Integration

Assigns the deterministic stable-ID-first subset of eligible free persons through existing Workforce assignment state. Insufficient eligible workforce is rejected.

### IM-18D – Production Requirement / Recipe Integration

Requires successfully assigned workforce and reuses the existing production BuildingStock recipe for the same Building.

### IM-18E – Operational Production Execution

Evaluates actual BuildingStock input availability and yields `READY` or `BLOCKED_INPUT`. Production cannot execute with insufficient input.

### IM-18F – Input Consumption / Output Settlement

On successful execution, consumes real recipe inputs and adds real outputs through existing BuildingStock mutation authority. Duplicate settlement IDs are rejected.

### IM-18G – Player Operational State Projection

Projects authoritative operational state only, including missing workforce, waiting for inputs, production readiness and settled production. UI remains read-only.

## 4. IM-19 – Population / Housing / Gold Economy Integration

**Status:** IN PROGRESS

**Definition baseline:** frozen IM-18 @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`.

**Whole-Block branch:** `feature/im-19-population-housing-gold-economy-integration`.

### IM-19A – Residential Building Admission Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `b528081409407ad531a450e5deb832ee7a0031e7`  
**Marker:** `frozen/im-19a-residential-building-admission-contract`

Consumes frozen IM-18A operational admission, existing Building identity and the existing `building-housing` capability. Admission requires matching stable `buildingId` and positive existing housing capacity. No occupancy, resident assignment, population or Gold mutation is introduced.

Implementation head `c46ef9a7739fee8a82397f4c6b605c1a7a94dc94` passed its first regression/device gate. Final exact-head CI and Pages then succeeded on `b528081409407ad531a450e5deb832ee7a0031e7`; the frozen IM-19A marker was created and verified identical.

### IM-19B – Housing Capacity / Occupancy Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `3ba5a17761ac7f8bce3f01a49cbaef515728c355`  
**Marker:** `frozen/im-19b-housing-capacity-occupancy-integration`

Connects an admitted residential Building to the existing `HousingCapacityOccupancy` authority and derives existing occupancy, available slots and `AVAILABLE/FULL` state. Existing `resident-home-assignment` contracts are input only; IM-19B creates no assignment and no Population or Gold truth.

Final evidence: CI `34682616074` SUCCESS and Pages `34682615729` SUCCESS on exact frozen head `3ba5a17761ac7f8bce3f01a49cbaef515728c355`. Device evidence was **iPhone/Safari only**. Earlier steering text that also mentioned iPad evidence was incorrect and is corrected here. The narrow iPhone layout/overlap remains NON-BLOCKING for IM-19B because no CSS/layout file changed in the IM-19B diff.

### IM-19C – Resident → Housing Assignment Integration

**Status:** IMPLEMENTED / NOT FROZEN

**Definition baseline:** frozen IM-19B @ `3ba5a17761ac7f8bce3f01a49cbaef515728c355`.

Consumes existing stable `person-resident-identity` contracts and frozen-IM-19B Housing integration states. Candidate persons and Housing are ordered deterministically by stable ID; persons that already have an active home are preserved and never reassigned. New home assignments are created only through the existing `HousingHomeCapacityIntegrationContract.assignHome(...)` authority and never exceed existing Housing capacity.

IM-19C creates no new Person/Resident, derives no Population, changes no Workforce state and touches no Gold state.

### Whole-Block question

`How are real completed/operational Buildings connected to the existing Housing, Population and non-physical Gold model so that residents, available population and Gold economy become gameplay-effective without duplicating Building, Person, Workforce, Housing, Population, Production or Gold authority?`

### Defined sequence

1. **IM-19A – Residential Building Admission Contract**  
   Admit only suitable existing real Buildings to the existing Housing system. No occupancy assignment, population mutation or Gold flow.

2. **IM-19B – Housing Capacity / Occupancy Integration**  
   Connect admitted residential Buildings to existing Housing capacity/occupancy authority.

3. **IM-19C – Resident → Housing Assignment Integration**  
   Deterministically connect existing stable Resident/Person identities to available Housing while keeping Housing and Workforce independent.

4. **IM-19D – Authoritative Population Projection**  
   Derive population from authoritative resident/housing state rather than maintaining a second mutable Player population total.

5. **IM-19E – Gold Economy Admission / Flow Integration**  
   Connect the existing non-physical Gold model to explicitly admitted real economic events. Gold remains non-physical and is not BuildingStock.

6. **IM-19F – Operational Economy → Gold Settlement**  
   Apply defined economic events to authoritative Gold state without expanding into taxes, wages or trade.

7. **IM-19G – Player Population / Housing / Gold Projection**  
   Read-only Player projection of actual population, housing capacity/occupancy and Gold state.

## 5. IM-19 exclusions

IM-19 does not include taxes, marketplace/trade, wages, needs/happiness, births, deaths, aging, migration, demolition, upgrades, a new production subsystem, new routing/transport authority, SaveGame rearchitecture, Inspector editor authority or legacy `main` gameplay reuse.

## 6. Current gate

**IM-18 = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19 = IN PROGRESS.**

**IM-19A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19C = IMPLEMENTED / NOT FROZEN.**

The next permissible step is exclusively IM-19C Completion / Regression / Device / Freeze Gate. IM-19D is not authorized before IM-19C is frozen.

---

**Updated:** 2026-09-12 — IM-19B synchronized as COMPLETE / FROZEN / PASS / 0 BLOCKER with iPhone/Safari-only device evidence; IM-19C implemented against frozen IM-19B and remains NOT FROZEN.