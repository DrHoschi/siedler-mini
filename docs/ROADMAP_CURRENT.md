# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

## IM-21B completion / freeze — 2026-09-22

- **IM-21B – Selection / Context Panel Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER.**
- Verified product/test head: `5d9e77592a435118a5fc9e385a73b8c44ba34cc9`.
- Freeze marker: `frozen/im-21b-selection-context-panel-integration`.
- Scope is limited to the authorized responsive Selection/Context integration plus the separately authorized one-file IM-20G predecessor testbuild-identity correction; existing gameplay, Placement, Camera, SaveGame and Inspector authorities remain unchanged.
- Exact-head evidence: CI Baseline #5713 SUCCESS; Development Testbuild #68 SUCCESS; Pages #7541 SUCCESS; frozen predecessor regression through IM-20G and IM-21A PASS; IM-21B self-test PASS with no gameplay mutation, no invented blocking reason, Placement/Selection arbitration and hidden-context touch isolation.
- Real iPhone/iOS Safari evidence: portrait + landscape; Building and Person selection; stable PEEK/STANDARD/EXPANDED disclosure; close/build-surface arbitration; drag/pan/zoom preserve the current selection and do not create accidental replacement selections; responsive panel remains visible and operable.
- IM-21C, IM-21D, IM-21E, IM-21F and IM-21G remain separate successor scope; **IM-21C is not authorized by this freeze**.

## Current authoritative status — 2026-09-22

- Frozen predecessor: **IM-20 – Authoritative SaveGame / Continue Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER** @ `58e55466e3c1ccc60342c5bc82747d47e7629db0`.
- **IM-21 – Responsive Player / Game UI Integration: IN PROGRESS.**
- **IM-21A – Responsive Game Shell / HUD Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER @ `0962d3ad531ba093c22b1194388c005518a9493f`.**
- **IM-21B – Selection / Context Panel Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER; verified product/test head `5d9e77592a435118a5fc9e385a73b8c44ba34cc9`; marker `frozen/im-21b-selection-context-panel-integration`.**
- Verified product/test head: `791f56254db59aeb502291738ae62d8b2ea9f0c6`.
- Completion evidence: real iPhone/iOS Safari responsive-shell/HUD and RUNNING↔PAUSED verification; PAUSED authoritative construction mutation guard verified; CI Baseline #5696 SUCCESS; Development Testbuild #51 SUCCESS; Pages #7524 SUCCESS.
- IM-21A owns presentation/integration only: responsive Player shell, compact Wood/Stone/Gold/Population HUD, existing camera/touch continuity, temporary Build workspace and Runtime play/pause control. Existing gameplay authorities remain unchanged.
- IM-21C Build Catalog / Placement Player UX Integration, IM-21D Work Area Player UX Integration, IM-21E Economy / Settlement Overview Integration, IM-21F System Menu / Save / Help / Guidance Integration and IM-21G Responsive V1 Player Interaction / Device Verification are **not implemented by the IM-21B freeze**.
- Older IM-20/IM-20G status lines below that still describe intermediate states are superseded by this current-status record.

## IM-21B – Selection / Context Panel Integration — Definition

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Definition baseline:** frozen IM-21A @ `0962d3ad531ba093c22b1194388c005518a9493f`, marker `frozen/im-21a-responsive-game-shell-hud-integration`.

### Objective

Integrate the already frozen IM-14D World Selection and existing Player/read-model projections into the responsive S2D-04 `PEEK → STANDARD → EXPANDED` Context Panel model without creating a second Selection, gameplay-status or mutation authority.

IM-21B answers for a selected world object:

1. What is it?
2. What is its primary current status?
3. If it is blocked, what existing authoritative/read-model state explains the block?
4. Which actions are already genuinely supported and meaningful for the Player?

### Existing authority consumed

- Frozen IM-14D remains Selection authority for Building/Person hit testing, tap-vs-drag separation, multi-touch guard, empty-world clear and read-only selection-context projection.
- Frozen IM-14E remains camera-input authority for pan/pinch-zoom on the shared WORLD input.
- Existing Building, Construction, Operational, Housing, Workforce, Stock/Transport, Person/Resident and related Player projections remain the only allowed gameplay/read-model truth.
- Frozen IM-20E Continue continues to clear transient Selection.
- IM-21A responsive shell/HUD remains unchanged as the base Player surface.

### Context Panel contract

- Supported initial selection kinds: `building` and `person`; no new selectable entity class is introduced.
- Smartphone selection opens `PEEK`; `STANDARD` and `EXPANDED` are transient UI presentation states only.
- Building context is keyed by stable `buildingId`; Person context by stable Person/Resident identity.
- Main status follows frozen S2D-04 precedence: critical/invalid → deliberate Player state → blocking prerequisite → active transition → normal active operation → neutral waiting.
- Blocking reasons are displayed only from existing authoritative/read-model sources; the UI must not guess.
- Existing details may be progressively disclosed, but the Context Panel is not an Inspector and owns no gameplay truth.
- Immediate IM-21B actions are Selection/Panel actions: expand/collapse/minimize/close and free-world clear. No unsupported Building Pause/Resume, Demolition, Work Area mutation or other command is invented.
- Selected-object world feedback may be rendered read-only.
- Missing/deleted selected objects clear fail-closed to no selection.
- Context/Selection remains transient and is not persisted as authoritative SaveGame state.

### Input / working-surface arbitration

Selection and Placement currently share the frozen unified WORLD input. IM-21B must ensure active Placement targeting does not simultaneously produce normal Selection/Context changes while leaving frozen placement evaluation/commit semantics untouched.

On iPhone, world + compact HUD + sparse world feedback remain the base surface and only one additional primary working surface may be active. Context Panel therefore cannot compete with Build Catalog / Placement controls, later Work Area, Economy Overview or System Menu. Hidden/minimized Context UI must leave no invisible touch interception surface.

### Verification requirements for later implementation

Later IM-21B implementation must prove Building/Person selection, free-world close, drag/pinch selection guards, stable identity across PEEK/STANDARD/EXPANDED, UI-vs-WORLD input isolation, fail-closed removal handling, Continue cleanup, Placement/Context arbitration and zero unauthorized gameplay mutation. Real-device verification must at least cover iPhone portrait and landscape; the full iPhone → iPad → desktop matrix remains IM-21G.

### Explicit non-scope

No IM-21C Build Catalog / Placement Player UX, no IM-21D Work Area editor, no IM-21E Economy Overview, no IM-21F System Menu / Save / Help / Guidance, no new gameplay owner, no Inspector rebuild and no legacy-main gameplay/UI reuse as authority.

### Current gate

**IM-21B Completion / Evidence / Freeze Gate: PASS / 0 BLOCKER / FROZEN.**

The frozen IM-21B scope is complete. IM-21C remains unauthorized and requires its own separate gate.


**Status:** CURRENT – IM-14 through IM-19 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-20 IN PROGRESS; IM-20A–E COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-20F COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-20G DEFINED / NOT IMPLEMENTED
**Repository:** `DrHoschi/siedler-mini`  
**Frozen IM-20C baseline head:** `ce84bacef4d2802f045ce522e7f7140b7b173fd8`
**Frozen IM-20C marker:** `frozen/im-20c-deterministic-validation-restore-integration`
**Current Whole-Block branch:** `feature/im-20-authoritative-savegame-continue-integration`

## 1. Frozen line

CR-25 through CR-32, IM-13 through IM-19 and IM-20A–E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

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

Frozen IM-20D:
- `frozen/im-20d-derived-state-rebinding-after-continue` @ final freeze-gate head

Frozen IM-20E:
- `frozen/im-20e-browser-save-reload-continue-lifecycle-integration` @ final freeze-gate head

Frozen IM-18 Whole-Block:
- `frozen/im-18-operational-building-workforce-production-integration` @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`

Frozen IM-19A:
- `frozen/im-19a-residential-building-admission-contract` @ `b528081409407ad531a450e5deb832ee7a0031e7`

Frozen IM-19B:
- `frozen/im-19b-housing-capacity-occupancy-integration` @ `3ba5a17761ac7f8bce3f01a49cbaef515728c355`

Frozen IM-19C:
- `frozen/im-19c-resident-housing-assignment-integration` @ `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`

Frozen IM-19D:
- `frozen/im-19d-authoritative-population-projection` @ `0847d27b60f13a99cb76d220b56b58107e832950`

Frozen IM-19E:
- `frozen/im-19e-gold-economy-admission-flow-integration` @ `8284c48b3e6b8c75709a58951acacbc59dd81184`

Frozen IM-19F:
- `frozen/im-19f-operational-economy-gold-settlement` @ `90d1b093fe1b99b048ea68529b9b0af731b11456`

Frozen IM-19G:
- `frozen/im-19g-player-population-housing-gold-projection` @ `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`

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

**Status:** WHOLE-BLOCK RECONCILIATION PASS / FREEZE AUTHORIZATION PENDING

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

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`  
**Marker:** `frozen/im-19c-resident-housing-assignment-integration`

**Definition baseline:** frozen IM-19B @ `3ba5a17761ac7f8bce3f01a49cbaef515728c355`.

Consumes existing stable `person-resident-identity` contracts and frozen-IM-19B Housing integration states. Candidate persons and Housing are ordered deterministically by stable ID; persons that already have an active home are preserved and never reassigned. New home assignments are created only through the existing `HousingHomeCapacityIntegrationContract.assignHome(...)` authority and never exceed existing Housing capacity.

IM-19C creates no new Person/Resident, derives no Population, changes no Workforce state and touches no Gold state.

Final evidence: real **iPhone/Safari** device PASS plus CI `34686333542` SUCCESS and Pages `34686333201` SUCCESS on exact frozen head `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`. No iPad evidence is claimed for IM-19C.

### IM-19D – Authoritative Population Projection

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `0847d27b60f13a99cb76d220b56b58107e832950`  
**Marker:** `frozen/im-19d-authoritative-population-projection`

**Definition baseline:** frozen IM-19C @ `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`.

Projects Population read-only from frozen-IM-19C active Resident→Home assignments plus existing `person-resident-identity` contracts. Only existing Residents with an authoritative active home in frozen-IM-19B Housing are counted. The projected count must equal authoritative Housing occupancy; inconsistent identity/assignment/occupancy truth is rejected instead of repaired.

The projection includes immutable trace entries `personId → homeBuildingId → COUNTED` as a future read-only diagnostics source for the Inspector. **No Inspector UI/visualization is implemented in IM-19D.** No Person creation, Housing mutation, Home assignment mutation, Workforce mutation or Gold mutation is added.

Freeze-gate correction: the first IM-19D device evidence showed the correct build identity but the visible Population still came from the older CR-30B `housingPopulation.population` runtime path. This was a BLOCKER. The current branch now creates the real frozen-IM-19A→B→C residential assignment chain in the baseline composition, exposes `CleanRuntime.populationProjection`, and makes HUD + read-only Inspector consume that IM-19D projection. Existing Gold continues to use its prior owner/path; IM-19E is not pre-implemented. The corrected deployment has now passed the fresh real **iPhone/Safari TESTBUILD 2** re-test. The screenshots visibly confirm `IM-19D-AUTHORITATIVE-POPULATION-PROJECTION-TESTBUILD-2`, `READY`, Population `3` in HUD and Inspector, and `IM-19D · TESTBUILD 2` on the lower surface. CI `34687205200` and Pages `34687204928` both succeeded on exact implementation head `149f37fbdc2aa3d1f05301a38ee3eb9452abec40`. A final documentation-only exact-head CI + Pages verification is required before the frozen IM-19D marker is created.

### IM-19E – Gold Economy Admission / Flow Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `8284c48b3e6b8c75709a58951acacbc59dd81184`  
**Marker:** `frozen/im-19e-gold-economy-admission-flow-integration`

**Definition baseline:** frozen IM-19D @ `0847d27b60f13a99cb76d220b56b58107e832950`.

Admits only `POPULATION_INCOME` from frozen-IM-19D authoritative Population into the existing non-physical `GoldEconomyOwner` derivation path. The derived amount is read-only at this stage: admission must leave the existing Gold balance unchanged.

No `applyIncome`, Gold settlement, settlement ID or balance-after state is part of IM-19E. Those remain IM-19F scope. Taxes, trade, wages and physical/BuildingStock Gold remain excluded.

Regression/device evidence on implementation head `9319c87192532bc2dae92015b7dabfa190d48e19`: CI `34689680807` SUCCESS and Pages `34689680511` SUCCESS. Real Safari device evidence confirms `READY`, exact IM-19E TESTBUILD 1 identity, correct title and frozen predecessor regression PASS. Final documentation-only exact-head CI + Pages verification is required before creating the frozen IM-19E marker.

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

### IM-19F – Operational Economy → Gold Settlement

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `90d1b093fe1b99b048ea68529b9b0af731b11456`  
**Marker:** `frozen/im-19f-operational-economy-gold-settlement`

**Definition baseline:** frozen IM-19E @ `8284c48b3e6b8c75709a58951acacbc59dd81184`.

Consumes an admitted `POPULATION_INCOME` flow and mutates the existing non-physical `GoldEconomyOwner` exactly once. Settlement checks the admitted Gold `stateBefore` against the current owner state, uses the existing `applyIncome(...)` authority, records an explicit settlement ID and rejects duplicate IDs before a second mutation.

The active baseline visible Gold path is now IM-19D authoritative Population → IM-19E Admission → IM-19F Settlement. The older CR-30C direct settlement is no longer the active Runtime shortcut.

No taxes, marketplace/trade, wages or physical/BuildingStock Gold are introduced.

Regression/device evidence on implementation head `dc89ab2f0a681292299d8c99f7613d81b55443cd`: CI `34690758162` SUCCESS and Pages `34690757726` SUCCESS. Real Safari evidence confirms `READY`, exact IM-19F TESTBUILD 1 identity, correct title, Population `3`, Gold `3`, lower IM-19F TESTBUILD 1 surface and predecessor regression PASS. Source verification confirms that visible Gold is sourced from the IM-19F settlement `stateAfter` and the old direct CR-30C settlement shortcut is no longer active. Final exact-head CI `34691298234` and Pages `34691298046` succeeded on `90d1b093fe1b99b048ea68529b9b0af731b11456`; the frozen IM-19F marker was created and verified identical.

7. **IM-19G – Player Population / Housing / Gold Projection**  
   Read-only Player projection of actual population, housing capacity/occupancy and Gold state.

### IM-19G – Player Population / Housing / Gold Projection

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`  
**Marker:** `frozen/im-19g-player-population-housing-gold-projection`

**Definition baseline:** frozen IM-19F @ `90d1b093fe1b99b048ea68529b9b0af731b11456`.

Read-only Player projection of authoritative IM-19D Population, frozen IM-19B/IM-19C Housing capacity/occupancy and frozen IM-19F Gold state. Population must equal Housing occupancy, Housing aggregate capacity invariants must hold, and IM-19F `stateAfter` must match the current non-physical Gold owner state.

The Player surface exposes Population, Housing occupancy/capacity and Gold only. It owns no gameplay mutation authority and introduces no further Economy system or Inspector system graph.

Regression/device evidence on implementation head `5fba2eb728adf1195473b28e578087fc37de2204`: CI `34697541542` SUCCESS and Pages `34697541497` SUCCESS. Real Safari device evidence on both iPhone and iPad confirms `READY`, exact IM-19G TESTBUILD 1 identity, correct title, Population `3`, Gold `3`, and `Siedlung · Bevölkerung 3 · Wohnen 3/3 · Gold 3`. Exact-head CI and Pages passed at the freeze gate; the IM-19G frozen marker was created and verified identical. This final steering-only synchronization is re-verified before advancing the marker to the final consistent head.

### IM-19 Whole-Block Completion / Reconciliation

**Status:** PASS / 0 BLOCKER / WHOLE-BLOCK FREEZE AUTHORIZATION PENDING

**Baseline:** frozen IM-18 Whole-Block @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`  
**Reconciled A–G head:** `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`

Reconciliation confirms the complete defined chain:

`Residential Admission → Housing Capacity/Occupancy → Resident→Housing Assignment → Authoritative Population → Gold Flow Admission → Gold Settlement → Player Population/Housing/Gold Projection`.

All A–G markers exist and are frozen, the Whole-Block branch is identical to frozen IM-19G, the line is 90 commits ahead / 0 behind from frozen IM-18, and final CI `34698054759` plus Pages `34698054480` succeeded on the reconciled head. The diff remains within the defined IM-19 scope and does not add taxes, trade, wages, needs/happiness, lifecycle simulation, SaveGame rearchitecture, new transport/production authority or the Inspector system graph.

A separate explicit Whole-Block Freeze Authorization / Freeze Decision is required before a Whole-Block frozen marker is created.

### Future Inspector – Whole Clean-Runtime Rebuild Chain (NON-SCOPE)

Later Inspector visualization should cover the **entire CR/IM Clean-Runtime rebuild graph** with sequential steps, branches, ownership boundaries and frozen gates. Individual gameplay traces such as the IM-19D Resident→Home count trace are only subordinate evidence and are not the intended scope of the overall chain view. No Inspector graph UI is implemented in IM-19G.

## 5. IM-19 exclusions

IM-19 does not include taxes, marketplace/trade, wages, needs/happiness, births, deaths, aging, migration, demolition, upgrades, a new production subsystem, new routing/transport authority, SaveGame rearchitecture, Inspector editor authority or legacy `main` gameplay reuse.

## 6. IM-20 – Authoritative SaveGame / Continue Integration

**Status:** COMPLETE / PASS / 0 BLOCKER — WHOLE-BLOCK FREEZE PENDING

**Definition baseline:** frozen IM-19 Whole-Block @ `f9c9202014deded496d96adfb96a430a230f06f2`.  
**Branch:** `feature/im-20-authoritative-savegame-continue-integration`.

### IM-20A – Persistent State Inventory & SaveGame Schema Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Marker:** `frozen/im-20a-persistent-state-inventory-savegame-schema-contract`

IM-20A inventories the frozen-IM19 runtime state and classifies every covered state as `PERSIST` or `REBUILD_DERIVE`. It defines target SaveGame schema V2 as **DEFINED_NOT_ACTIVE** while leaving the active IM-13 snapshot/validation schema on V1.

Persisted-authority coverage includes existing IM-13 World/Map/CoreDomain/Gold/PathWear state plus post-IM13 ResourceDemands/Claims, construction progress, local BuildingStock, BuildingStock transport reservations, Workforce assignments, Resident→Home assignments and production/Gold exactly-once settlement fences.

Derived/rebuilt state includes Housing occupancy, Population, operational/readiness projections, Player projections, transient transport/navigation/runtime bindings, scheduler registrations and presentation/Inspector state.

No snapshot capture, restore, browser storage or Continue lifecycle is changed by IM-20A.

### IM-20B – Post-IM13 Authoritative Snapshot Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Marker:** `frozen/im-20b-post-im13-authoritative-snapshot-integration`

**Baseline:** frozen IM-20A @ `045a056535604b7adcaeb658212da403f532b4f9`.

Adds schema V2 capture-only integration over the frozen IM-13 V1 snapshot. Existing V1 capture remains untouched. V2 adds only the IM-20A-authorized post-IM13 authoritative sections for ResourceDemands/Claims, construction progress, local BuildingStock, BuildingStock transport reservations, Workforce assignments, Resident→Home assignments and production/Gold settlement fences.

Derived demand progress fields are not persisted. Population, Housing projection, operational/readiness projections, UI/Inspector state, routes/caches and other `REBUILD_DERIVE` state remain absent from the V2 snapshot.

No V2 validation, V2 restore, browser storage or Continue lifecycle is introduced by IM-20B.

Freeze evidence: implementation CI `34702294625` SUCCESS on `d04acc61f7bfca07b23c912f16fad1edf40038a4`; finalization CI `34702517357` SUCCESS and Pages `34702517124` SUCCESS on `e9b1df016ecf0ce64510e7f8dcafae1bbcb35993`; marker `frozen/im-20b-post-im13-authoritative-snapshot-integration` created and verified identical at freeze time.

### IM-20B – Build Identity Reconciliation / Correction

**Status:** PASS / 0 BLOCKER / FROZEN STATE CORRECTED

A post-freeze verification found stale predecessor identity surfaces even though the IM-20B SaveGame implementation itself was correct:

- `RuntimeConfig.build` still identified IM-19G;
- runtime verification text/title/surface note still identified IM-19G;
- the static `index.html` fallback still identified IM-16G;
- Safari could therefore load/display predecessor identity through stale cache keys.

Correction scope is intentionally limited to:
- `src/runtime/config.js`
- `src/main.js`
- `index.html`

Corrected visible build identity:
`IM-20B-POST-IM13-AUTHORITATIVE-SNAPSHOT-INTEGRATION-TESTBUILD-1`

Required cache invalidation was applied to the changed `main.js` entry and `RuntimeConfig` import only. Functional predecessor-specific data attributes and cache keys for unchanged modules remain untouched.

Corrected code head:
`aeebbe487429eb9889412ec36179c44a51268a1a`

Verification:
- CI `34703598385` — SUCCESS
- Pages `34703597830` — SUCCESS
- diff against the prior frozen IM-20B head contains only the three identity files above
- no SaveGame contract, capture semantics, validation, restore, browser storage, Continue lifecycle, gameplay authority or layout behavior changed.

The IM-20B frozen marker remains the authoritative ref and is fast-forwarded only after this final steering synchronization also passes exact-head verification.

### IM-20B – Snapshot Completeness Reconciliation / Correction

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

The IM-20C restore preflight found that the previously frozen IM-20B V2 snapshot did not yet contain every authoritative definition source required to reconstruct the post-IM13 runtime without guessing.

Completeness reconciliation result:

- **Resource Type Definitions — PERSIST REQUIRED**  
  `ResourceState` owns a separate authoritative definition store outside `CoreDomainStores`. V2 now captures definition state plus the real `resource-type` StableIdAllocator continuation through read-only `definitionSnapshot()` / `definitionIdSnapshot()`.

- **Housing Capabilities — PERSIST REQUIRED**  
  Building housing capacity is a separate `building-housing` capability input and is not stored in the Building DomainStore. V2 now captures `buildingId + capacity`.

- **Person Workforce Profiles — PERSIST REQUIRED**  
  Specialization/capabilities are required to rebuild workforce eligibility but are not stored in the Unit DomainStore. V2 now captures normalized Person workforce profiles.

- **Building Workforce Requirements — PERSIST REQUIRED**  
  Count/specialization/capability requirements are separate operational inputs and cannot be reconstructed from Workforce assignment state alone. V2 now captures the definition form without persisting derived OperationalAdmission.

- **Production Recipes — PERSIST REQUIRED**  
  Inputs/outputs are separate production definitions and are not stored in BuildingStock or the Building DomainStore. V2 now captures normalized production recipes.

Not duplicated:
- `EconomicConstructionRequirementContract` remains **REBUILD / DERIVE** because its authoritative quantity/reference truth already exists in persisted `ResourceDemand`.
- Building identity/lifecycle remain in `domains.buildings`.
- Person identity and Carrier data remain in `domains.units`.
- Population/Housing occupancy, workforce eligibility, production readiness and Player/Inspector projections remain derived and are not persisted as second truth.

Corrected V2 definition source boundary:
- `authoritative.definitions.resourceTypes`
- `authoritative.definitions.housingCapabilities`
- `authoritative.definitions.workforceProfiles`
- `authoritative.definitions.workforceRequirements`
- `authoritative.definitions.productionRecipes`

The frozen IM-20A inventory contract is not rewritten retroactively. IM-20B carries this explicit completeness amendment discovered by restore preflight.

Build identity for the corrected snapshot:
`IM-20B-POST-IM13-AUTHORITATIVE-SNAPSHOT-INTEGRATION-TESTBUILD-2`

Real-device evidence before this correction:
- the supplied screenshots both came from **iPhone / Safari**;
- one screenshot used reduced page zoom to make the whole development UI readable;
- they verified TESTBUILD 1 build identity only and are **not iPad evidence**.

Hard boundary remains:
- V2 capture = implemented and completeness-corrected;
- V2 validation = not implemented;
- V2 restore = not implemented;
- Derived-State Rebinding = not implemented;
- browser Save/Reload/Continue = not implemented;
- IM-20C+ = not implemented.

Correction evidence: CI `34705200714` SUCCESS and Pages `34705200407` SUCCESS on corrected head `6480d00941b688437976b5b5c88899fef79faa15`; frozen marker `frozen/im-20b-post-im13-authoritative-snapshot-integration` was fast-forwarded and verified identical at that correction head.

### IM-20C – Deterministic Validation & Restore Integration

**Status:** IMPLEMENTED / NOT FROZEN

**Baseline:** corrected frozen IM-20B @ `a3a5d2f5fafa1885fea7be489ea601680c432e25`.

IM-20C validates the complete schema-V2 SaveGame deterministically before commit and restores new standalone authoritative owner instances only after a full validation PASS.

Validation covers V1 base sections plus all corrected IM-20B persisted definitions/state and their cross-owner invariants. Invalid V2 payloads are rejected fail-closed without producing a runtime state.

Restore reconstructs frozen V1 World/Map/CoreDomain/Gold/PathWear owners plus Resource definitions/allocator, Claims, Demands, Housing capabilities, Workforce profiles/requirements/assignments, Production recipes, Construction progress, BuildingStocks/reservations, Home assignments and production/Gold settlement fences.

Canonical Capture→Validate→Restore→Capture identity and allocator continuity are part of the IM-20C self-test.

Visible build:
`IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-3`

No Derived-State Rebinding, runtime activation, browser storage or Save/Reload/Continue lifecycle is introduced in IM-20C.

### IM-20C – Verification Surface Ownership Correction

**Status:** IMPLEMENTED / DEVICE RE-TEST PENDING / NOT FROZEN

Real iPhone/Safari evidence on IM-20C TESTBUILD 1 showed a contradictory visible state:

- Inspector/Runtime build identity correctly showed `IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-1`;
- IM-20C title and explanatory text were correct;
- the shared verification output nevertheless displayed `IM-16G — FAIL · selfTest=true · buildIdentity=false`.

Root cause: frozen predecessor browser-evidence scripts still wrote directly to the shared `#test-status` surface. In particular `src/im16g-runtime-evidence.js` required the historical IM-16G build identity and overwrote the current IM-20C status. `src/im17-whole-block-runtime-evidence.js` could also race for the same visible surface.

Correction boundary:
- predecessor evidence still executes for regression/console evidence on compatible successor builds;
- IM-16G and IM-17 predecessor scripts may write `#test-status` only when they own their exact historical build;
- successor builds retain ownership of their current visible verification surface;
- no IM-20C validation/restore semantics changed;
- no Derived-State Rebinding, runtime activation, browser storage, Continue lifecycle or IM-20D+ capability added.

Corrected visible build identity:
`IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-3`

Files in this correction:
- `src/im16g-runtime-evidence.js`
- `src/im17-whole-block-runtime-evidence.js`
- `src/runtime/config.js`
- `src/main.js`
- `index.html`

The next permissible action remains exclusively **IM-20C Completion / Regression / Device / Freeze Gate**. A new real iPhone/Safari check must confirm TESTBUILD 2 and absence of the stale IM-16G visible FAIL before IM-20C may freeze.

### IM-20C – Predecessor Verification Surface Ownership Correction 2

**Status:** IMPLEMENTED / AUTOMATED REGRESSION PASS / DEVICE RE-TEST PENDING / NOT FROZEN

Real-device TESTBUILD 2 evidence removed the stale IM-16G FAIL, but exposed the same shared-surface ownership defect one layer earlier: the visible IM-20C verification card was overwritten by frozen IM-15 Inspector/Guidance modules, ending with:

`IM-15 – COMPLETE / FROZEN / PASS / 0 BLOCKER — Guidance / Inspector Whole Block ...`

Root cause:
- IM-15A Inspector Runtime Observation,
- IM-15B Structured Runtime Diagnostics,
- IM-15C World Diagnostic Overlay,
- IM-15D Controlled Diagnostic Actions,
- IM-15E / IM-15 Whole-Block Simulation Observation

all still wrote directly to shared `#test-status` whenever their controller activated.

Correction:
- all IM-15A–E predecessor capabilities continue to initialize and operate unchanged;
- they may own/write the shared visible verification surface only while the active build belongs to IM-15;
- on successor hosts such as IM-20C they remain functional but do not overwrite successor verification evidence;
- the previously corrected IM-16G and IM-17 predecessor evidence ownership rule remains in force.

No SaveGame validation/restore semantics, runtime authority, Inspector behavior, Derived-State Rebinding, activation, browser storage or Continue capability changed.

Corrected visible identity:
`IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-3`

Corrected code head:
`41dc32495fe3098fa8bb23053eea088784a80fad`

Automated evidence:
- CI `34746060489` — SUCCESS
- `Run IM-20C + frozen predecessor regression` — SUCCESS
- Pages `34746060336` — SUCCESS

Freeze remains blocked pending a new real-device TESTBUILD 3 check confirming that the IM-20C verification surface is no longer replaced by IM-15/16/17 predecessor status.

### IM-20C – Completion / Regression / Device / Freeze Gate

**Status:** PASS / 0 BLOCKER / FINAL MARKER PENDING

Final real-device evidence on **iPhone / Safari** confirms TESTBUILD 3 after both predecessor verification-surface ownership corrections:

- visible build: `IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-3`;
- title remains `IM-20C – Deterministic Validation & Restore Integration`;
- current verification card remains owned by IM-20C;
- no stale IM-15, IM-16G or IM-17 predecessor status is visible;
- Runtime = `READY`;
- Population = `3`;
- Gold = `3`;
- Housing = `3/3`;
- visible projection reports `3 Buildings / 3 Persons`.

Automated evidence on the current pre-finalization head:
- CI `34746139822` — SUCCESS;
- `Run IM-20C + frozen predecessor regression` — SUCCESS;
- Pages `34746139270` — SUCCESS.

Scope diff against frozen IM-20B is ahead-only / 0 behind and limited to IM-20C validation/restore, restore-only Owner support, IM-20C tests/CI/build identity, steering documentation, and the necessary predecessor verification-surface ownership fixes. No IM-20D+ capability is present.

Freeze evidence: final gate documentation head `a5f720ca870617e5ae611fec5ea50846588272ff` passed CI `34748598823` with the full IM-20C + frozen predecessor regression. Marker `frozen/im-20c-deterministic-validation-restore-integration` was created on that exact head and verified identical / 0 ahead / 0 behind. Real iPhone/Safari TESTBUILD 3 evidence confirms correct IM-20C visible verification ownership with READY, Population 3, Gold 3, Housing 3/3 and 3 Buildings / 3 Persons.

### IM-20B/C – Rebinding Prerequisite Continuity Correction

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

IM-20D preflight against frozen IM-20C exposed three non-derivable continuity gaps. Persisting only the previous owner state was insufficient to reconstruct these relationships without guessing:

1. workforce `assignmentId ↔ buildingId`;
2. carrier `jobId ↔ unitId`;
3. active `TransportExecutionContract` state (`TO_PICKUP / PICKED_UP / TO_DROPOFF / DELIVERED`).

The V2 persistence boundary is therefore corrected with three authoritative continuity sections:

- `authoritative.workforceBindings[]` — `workforce-building-binding { assignmentId, buildingId }`;
- `authoritative.carrierBindings[]` — `carrier-job-binding { jobId, unitId }`;
- `authoritative.transportExecutions[]` — existing `transport-execution { jobId, unitId, state }`.

Validation is fail-closed:
- every ASSIGNED workforce assignment must resolve to exactly one workforce-building binding;
- workforce bindings may not reference unknown Buildings or orphan assignment IDs;
- carrier bindings require a PENDING TransportJob and an OCCUPIED matching carrier Unit;
- one carrier Unit may not own two active job bindings;
- every OCCUPIED carrier must have a persisted job binding;
- persisted transport execution must match the same jobId↔unitId carrier binding;
- post-IM13 TransportJobs resolve claimId/demandId against V2 authoritative ResourceClaims/ResourceDemands and are revalidated through the existing TransportJobContract.

Restore behavior:
- frozen V1 SaveGame contracts remain unchanged;
- the IM-20C V2 adapter restores World/Map/Gold/Wear through the frozen V1 owner path;
- after successful V2 validation, CoreDomainStores including Jobs are restored from the original V2 snapshot with allocator continuity, avoiding the older V1-only dangling-reference interpretation for post-IM13 Claim/Demand links;
- the three new continuity arrays are restored immutable;
- no derived rebinding, activation, scheduler registration, browser storage or Continue lifecycle is introduced.

Regression evidence on code head `90931a8410cf43254193839fe893ed744c1104c8`:
- CI `34753225971` — SUCCESS;
- Pages `34753225982` — SUCCESS;
- IM-20B capture test — PASS;
- IM-20C V2 validation/restore canonical roundtrip — PASS;
- missing workforce binding, carrier/execution mismatch and execution-without-binding are rejected fail-closed;
- full frozen predecessor regression remains green.

Scope diff from prior frozen IM-20C is ahead-only / 0 behind and limited to the six SaveGame/test files required by this correction. No IM-20D+ implementation exists.

Corrected freeze evidence: steering-document head `c77840995fd7b7a06d9b14d392fe9dcd0ffda134` passed CI `34753353620`. Both existing frozen markers were fast-forwarded to that exact head and verified identical / 0 ahead / 0 behind against the Whole-Block branch.

### IM-20D – Derived-State Rebinding after Continue

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-20d-derived-state-rebinding-after-continue`

**Baseline:** corrected frozen IM-20C @ `ce84bacef4d2802f045ce522e7f7140b7b173fd8`.

The new IM-20D rebinding integration consumes only an IM-20C `RESTORED` result and derives a candidate graph against those restored B owners. It reconstructs completion/operational evidence, Housing occupancy, Population, workforce assignment projections, production readiness, Player and Inspector read models, Carrier assignment continuity, preserved TransportExecution state, fresh navigation/render sources and a deterministic but uninstalled scheduler plan.

The continuity correction is consumed directly:
- `assignment:00000001 ↔ building:00000002` rebuilds the operational workforce projection without choosing a new Person;
- `transport-job:00000001 ↔ unit:00000001` rebuilds CarrierAssignmentService linkage;
- `TO_DROPOFF` remains `TO_DROPOFF` and yields the explicit recovery action `CONTINUE_TO_DROPOFF`.

No authoritative mutation occurs during Rebind. Home assignments are not regenerated, construction completion is not replayed, production/Gold settlements are not replayed, route caches start empty and Gold projection uses the restored current state plus the full fence set without inventing a last-settlement event. An inconsistent derived graph is rejected fail-closed and Capture→Restore→Rebind→Capture remains canonically identical.

Visible build:
`IM-20D-DERIVED-STATE-REBINDING-AFTER-CONTINUE-TESTBUILD-1`

Local evidence: `npm run ci` PASS / 0 BLOCKER and `node src/dev/im-20d-self-test.node.js` PASS.

Remote implementation evidence: head `1dea166edc10460ef17080c4b95264815a513aec`; CI `34767700678` SUCCESS including the full IM-20D + frozen predecessor regression; Pages `34767700128` SUCCESS. The documentation/evidence head `d1ebc1204257516709c51effcf17543befa02262` passed CI `34767886051` with the same IM-20D + frozen predecessor regression. The diff from corrected frozen IM-20C is ahead-only / 0 behind and limited to the 12 IM-20D implementation, test, build-identity, CI and steering-document files.

Real Safari device evidence confirms PASS on both iPhone and iPad: `READY`, exact `IM-20D-DERIVED-STATE-REBINDING-AFTER-CONTINUE-TESTBUILD-1`, correct IM-20D title, Population `3`, Gold `3`, Housing `3/3`, lower IM-20D TESTBUILD 1 surface, and no visible IM-20C cache regression.

No Runtime activation/publication, Scheduler installation, browser storage, Save/Reload/Continue lifecycle, exactly-once recovery reconciliation or IM-20E+ capability is included or authorized.

### IM-20E – Browser Save / Reload / Continue Lifecycle Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-20e-browser-save-reload-continue-lifecycle-integration`

**Definition baseline:** frozen IM-20D @ `7758bff83164c90793dacc75d437b2d9f3d64c66`.

IM-20E is the first real browser lifecycle integration over the frozen IM-20A–D chain:

`completed simulation step → canonical V2 capture → single technical browser save → browser reload → IM-20C validation/restore → IM-20D rebinding → atomic activation/scheduler installation → Continue`.

Definition:
- capture only at a confirmed completed-step boundary; never mid-step;
- one stable same-origin technical `localStorage` entry containing the canonical serialized V2 payload, with no second gameplay authority and no partial overwrite on write failure;
- after reload, parse, full IM-20C validation/restore and full IM-20D rebinding complete before any candidate is published;
- Continue accepts only an IM-20D `REBOUND` result and atomically publishes the restored owners and derived projections, installs the deterministic IM-20D scheduler plan, resets camera/selection and only then starts or resumes Runtime/Scheduler;
- duplicate or partial scheduler installation rejects or rolls back; every parse/validation/restore/rebind/install/publish failure preserves the previous active composition and scheduler state;
- no construction, production, delivery or Gold settlement replay and no guessed Workforce/Carrier/TransportExecution identity;
- only minimal technical Save/Continue verification access is allowed, not a final player-facing Save menu.

Acceptance requires canonical pre-Save/post-Continue identity, real reload persistence, fail-closed invalid-storage and activation failures, preserved workforce/carrier/execution continuity, rebuilt transient state, activation-before-start ordering and full IM-20D plus frozen predecessor regression.

IM-20E may execute only the normal continuation actions already resolved by IM-20D. Crash-window settlement reconciliation, new exactly-once/recovery fences, ambiguous-state repair, replay reconciliation and new recovery decisions remain exclusively IM-20F.

Non-scope: multi-slot Save UI, cloud save, multiplayer synchronization, autosave, legacy-main migration, final Save-menu/wireframe or responsive UI redesign, Economy expansion, Inspector system graph, IM-20F Exactly-once & Recovery Reconciliation and IM-20G Player/Device Verification.

Completion evidence: verified head `991cc28e3c5146e7dada0093569ecc7801b01572` passed the complete local IM-20E and frozen-predecessor regression. Manually started exact-head CI run `35200717289` and rerun job `105157412546` completed SUCCESS, including `Run IM-20E + frozen predecessor regression`. Exact-head Pages run `35200717307` completed SUCCESS, and the live source exposed TESTBUILD 2. Freeze-documentation head `1d0523da21329b0293bef879d22e1c9ab4a4fb11` then passed CI `35211582967` and Pages `35211582955`, both SUCCESS. The diff against frozen IM-20D is ahead-only / 0 behind and restricted to the authorized IM-20E scope. The prior Pages-source, normal transport continuation, atomic rollback and acceptance-test blockers are corrected. No IM-20F+ capability is included.

### IM-20F – Exactly-once & Recovery Reconciliation

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Definition baseline:** frozen IM-20E @ `84945407ef40cfc31fe4dc56f11823e591e9fac2`.

IM-20F reconciles only persisted crash-window states that cannot be continued unambiguously by frozen IM-20E. Restored `DELIVERED` execution remains behind `AWAIT_IM20F_COMPLETION_RECONCILIATION` until the authoritative Claim/Demand/Resource, Job, execution, Carrier and binding state yields exactly one valid decision.

Defined deterministic outcomes:
- active Claim plus pending Job and matching active Carrier binding: apply delivery settlement once, then complete Job and release Carrier;
- consumed Claim plus pending Job and matching active Carrier binding: do not settle again; finish only completion and Carrier release;
- canonically completed terminal state: acknowledge with no replay;
- any contradictory identity, lifecycle, amount, owner or binding state: reject fail-closed.

IM-20F must define canonical terminal persistence/cleanup for Carrier binding, TransportExecution, Scheduler registration and Carrier availability. Production stock mutation plus production fence and Gold balance mutation plus Gold fence each remain one logical exactly-once effect. Mismatches cannot be guessed or silently repaired. Construction completion remains non-replayed evidence.

Existing Resource, TransportJob, CarrierAssignment, BuildingStock and GoldEconomy owners remain authoritative. Settlement fences remain persisted exactly-once evidence. IM-20F introduces no second authority and may execute only a uniquely determined missing transition.

Future acceptance requires the three transport crash windows, terminal no-op, duplicate settlement protection, fail-closed production/Gold/transport contradictions, canonical `Capture → Restore → Reconcile → Continue → Capture`, and full IM-20A–E plus frozen predecessor regression.

IM-20F is COMPLETE / FROZEN / PASS / 0 BLOCKER. Final verified code head: `cac2b1cd0fa009e06538473f8da9e2f8e682a5d4`. Completion/freeze evidence: CI #5657 passed the full IM-20F + frozen-predecessor regression; documentation parent `3ab6edfc46728b6860f87acf8f1afd0020b1c360` passed CI #5658; the following head `1d68d47676c6f0c9616de942f86cb134b8ad4b36` changed only `docs/ROADMAP_CURRENT.md`, outside the CI push path filter, and passed exact-head Whole-Block Pages #18 plus dynamic Pages #7497. Real iPad/Safari evidence confirms TESTBUILD 1 and Save → Reload → Continue. No remaining Post-Recovery-Rebind blocker was found. No IM-20G+ capability is authorized.


### IM-20G – Save/Continue Player & Device Verification

**Status:** DEFINED / NOT IMPLEMENTED

**Definition baseline:** frozen IM-20F @ `eebf74a422b3277a10632b162cc2c7c471d65e50` with marker `frozen/im-20f-exactly-once-recovery-reconciliation`.

IM-20G is the real-player/device verification block for the completed IM-20 Save/Continue chain. Required flow: real gameplay state → Save → real browser/page reload → persisted-state detection → Continue → continuation of the same authoritative state → Save again. It verifies the frozen IM-20A–F behavior and adds no new SaveGame semantics.

Required target-device evidence includes iPhone/iOS Safari and iPad/iPadOS Safari. Desktop/browser evidence is supplementary. Build identity and tested branch/build must be unambiguous. Existing valid IM-20E/F device evidence may be reused when it proves the exact contract; remaining evidence, especially iPhone coverage, must be identified before completion.

Any discovered product defect requires separate reconciliation/authorization before correction. Non-scope remains multi-slot Save UI, cloud save, autosave, legacy `main` migration, responsive Game-UI redesign, new Economy/Transport/Recovery capability, Inspector graph and IM-20H+.

**IM-20G Reconciliation / Definition: PASS / SCOPE DETERMINED / NOT IMPLEMENTED.**

### Remaining sequence

1. **IM-20A – Persistent State Inventory & SaveGame Schema Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
2. **IM-20B – Post-IM13 Authoritative Snapshot Integration — COMPLETE / FROZEN / PASS / 0 BLOCKER**
3. **IM-20C – Deterministic Validation & Restore Integration — COMPLETE / FROZEN / PASS / 0 BLOCKER**
4. **IM-20D – Derived-State Rebinding after Continue — COMPLETE / FROZEN / PASS / 0 BLOCKER**
5. **IM-20E – Browser Save / Reload / Continue Lifecycle Integration — COMPLETE / FROZEN / PASS / 0 BLOCKER**
6. **IM-20F – Exactly-once & Recovery Reconciliation — COMPLETE / FROZEN / PASS / 0 BLOCKER**
7. **IM-20G – Save/Continue Player & Device Verification — COMPLETE / FROZEN / PASS / 0 BLOCKER**

### Non-scope

No multi-slot Save UI, cloud save, multiplayer sync, autosave, legacy-main save migration, final responsive Game-UI/wireframe redesign, further Economy capability or Inspector system graph.

Responsive Game UI remains a later dedicated scope with separate iPhone, iPad and Desktop planning.

### Current IM-20 gate

Implementation head `e1cc7e94f84d2ba9bf666aece318366c7a90f00f` passed CI `34700519373` with the full predecessor regression and IM-20A self-test. Target schema V2 remains definition-only; active SaveGame snapshot/validation remain V1 and no capture/restore/browser-storage implementation is present.

Freeze evidence includes implementation CI `34700519373`, finalization CI `34700971956`, exact-head regression PASS and marker `frozen/im-20a-persistent-state-inventory-savegame-schema-contract`. The marker is the authoritative frozen ref for IM-20A.

## 7. Current gate

**IM-18 = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19 = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19C = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19D = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19F = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-19G = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20 = COMPLETE / PASS / 0 BLOCKER — WHOLE-BLOCK FREEZE PENDING.**

**IM-20A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20B = COMPLETE / FROZEN / PASS / 0 BLOCKER — Rebinding prerequisite continuity correction incorporated.**

**IM-20C = COMPLETE / FROZEN / PASS / 0 BLOCKER — Rebinding prerequisite continuity correction incorporated.**

**IM-20D = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20F = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The IM-20F freeze is final. No further IM-20F implementation is authorized. IM-20G is COMPLETE / FROZEN / PASS / 0 BLOCKER at `1d1846ffd0faa7f00df94681474e72e2f390fb78`; no further IM-20G implementation is authorized.

---

**Updated:** 2026-09-19 — IM-20F COMPLETE / FROZEN / PASS / 0 BLOCKER. Freeze evidence records final verified code head `cac2b1cd0fa009e06538473f8da9e2f8e682a5d4`, CI #5657, documentation-parent CI #5658, exact-head Pages #18/#7497, and real iPad/Safari evidence. IM-20G is COMPLETE / FROZEN / PASS / 0 BLOCKER at `1d1846ffd0faa7f00df94681474e72e2f390fb78`.

## Repository Workflow Authority / CI-Pages Unification

**Status:** IMPLEMENTED / VERIFIED

The new-development line now uses one durable workflow contract: CI applies to `feature/**` and includes both steering documents in its trigger surface; automatic Pages deployment is reserved for CR/IM Whole-Block-style branches (`feature/cr-[0-9][0-9]-*`, `feature/im-[0-9][0-9]-*`), with `workflow_dispatch` retained for controlled exact-head verification deployments. Legacy `main` remains outside this authority and unchanged.

Workflow-authority cutover verification is complete. IM-20G subsequently completed its verification-only scope on implementation/verification head `e66de4c920cc448c0cc213bd583fb0f01574ddbd`: CI Baseline #5671 SUCCESS, controlled Pages deployment #26 SUCCESS from the IM-20G verification branch, exact visible build `IM-20G-SAVE-CONTINUE-PLAYER-DEVICE-VERIFICATION-TESTBUILD-1`, and real iPhone/iOS Safari video evidence for Start → Pause → Save V2 → real reload → Continue. Existing iPad/iPadOS Safari IM-20E/F evidence is reused for the frozen underlying lifecycle. iPhone Safari page-zoom adjustment is NON-BLOCKING / OUT OF SCOPE for Save/Continue and belongs to later responsive Player-UI work. IM-20G is COMPLETE / PASS / 0 BLOCKER; only documentation verification and final marker creation remain.



---

**Updated:** 2026-09-20 — IM-20G COMPLETE / FROZEN / PASS / 0 BLOCKER. Evidence: verification head `e66de4c920cc448c0cc213bd583fb0f01574ddbd`; CI Baseline #5671 SUCCESS; controlled IM-20G Pages deployment #26 SUCCESS; exact TESTBUILD 1 identity; real iPhone/iOS Safari Start → Pause → Save V2 → reload → Continue evidence; existing iPad/iPadOS Safari predecessor evidence reused. Responsive/page-zoom work remains NON-BLOCKING / OUT OF SCOPE. No IM-20H is authorized.


### IM-20 Whole-Block Completion

**Status:** COMPLETE / PASS / 0 BLOCKER — WHOLE-BLOCK FREEZE PENDING

IM-20A through IM-20G are the complete defined Authoritative SaveGame / Continue Integration sequence. IM-20G is frozen at `1d1846ffd0faa7f00df94681474e72e2f390fb78` with marker `frozen/im-20g-save-continue-player-device-verification`. No IM-20H capability is defined or required. Multi-slot Save UI, cloud save, autosave, legacy-main save migration, final responsive Game-UI/wireframe redesign, further Economy capability and the Inspector system graph remain separate later scope. A separate IM-20 Whole-Block verification / freeze gate is required before creating a Whole-Block frozen marker. No successor block is authorized by this documentation finalization.
