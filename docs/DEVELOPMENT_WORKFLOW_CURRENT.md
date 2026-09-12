# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Frozen development baseline: IM-19 @ `f9c9202014deded496d96adfb96a430a230f06f2`
- Frozen IM-19 Whole-Block marker: `frozen/im-19-population-housing-gold-economy-integration`
- Current Whole-Block branch: `feature/im-20-authoritative-savegame-continue-integration`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15 – Guidance / Inspector: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16 – Player Construction & Placement Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-17 – Economic Construction Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-18 – Operational Building / Workforce / Production Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19 – Population / Housing / Gold Economy Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19A – Residential Building Admission Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19B – Housing Capacity / Occupancy Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19C – Resident → Housing Assignment Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19D – Authoritative Population Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19E – Gold Economy Admission / Flow Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19F – Operational Economy → Gold Settlement: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-19G – Player Population / Housing / Gold Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20 – Authoritative SaveGame / Continue Integration: IN PROGRESS**
- **IM-20A – Persistent State Inventory & SaveGame Schema Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20B – Post-IM13 Authoritative Snapshot Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20C–G: DEFINED / NOT IMPLEMENTED**

IM-19 development has completed and frozen its defined A–G chain and the Whole-Block. IM-19A is frozen at `b528081409407ad531a450e5deb832ee7a0031e7`, IM-19B at `3ba5a17761ac7f8bce3f01a49cbaef515728c355`, IM-19C at `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`, IM-19D at `0847d27b60f13a99cb76d220b56b58107e832950`, IM-19E at `8284c48b3e6b8c75709a58951acacbc59dd81184`, IM-19F at `90d1b093fe1b99b048ea68529b9b0af731b11456`, and IM-19G at `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`. The Whole-Block is frozen at `f9c9202014deded496d96adfb96a430a230f06f2` with marker `frozen/im-19-population-housing-gold-economy-integration`.

## 2. Frozen predecessor chain

Frozen IM-17 Whole-Block marker:
- `frozen/im-17-economic-construction-integration` @ `53de400c2ffe57addf832b599b906b3d5b473385`

Frozen IM-18 markers and heads:

- IM-18A `frozen/im-18a-operational-building-admission-contract` @ `01ad19b2064887b131b4bdd1dd7157f0a4f6724c`
- IM-18B `frozen/im-18b-workforce-requirement-eligibility-contract` @ `42e64722b34ed7d516735111c5c4ce573631d59a`
- IM-18C `frozen/im-18c-deterministic-workforce-assignment-integration` @ `195299b0fb7098806be88b7c0b3a577ca737ecb6`
- IM-18D `frozen/im-18d-production-requirement-recipe-integration` @ `2e5d4fc53295a7abee92b0f9190a6bac1b5e31fe`
- IM-18E `frozen/im-18e-operational-production-execution` @ `9d1a3bb165564b29ad7ad1a5ee8619ed2d131c20`
- IM-18F `frozen/im-18f-input-consumption-output-settlement` @ `6cfe680eb8b66c8015026629a7200483ae4c3bdd`
- IM-18G `frozen/im-18g-player-operational-state-projection` @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`

Frozen IM-18 Whole-Block marker:
- `frozen/im-18-operational-building-workforce-production-integration` @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`

Frozen IM-19A marker:
- `frozen/im-19a-residential-building-admission-contract` @ `b528081409407ad531a450e5deb832ee7a0031e7`

Frozen IM-19B marker:
- `frozen/im-19b-housing-capacity-occupancy-integration` @ `3ba5a17761ac7f8bce3f01a49cbaef515728c355`

Frozen IM-19C marker:
- `frozen/im-19c-resident-housing-assignment-integration` @ `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`

Frozen IM-19D marker:
- `frozen/im-19d-authoritative-population-projection` @ `0847d27b60f13a99cb76d220b56b58107e832950`

Frozen IM-19E marker:
- `frozen/im-19e-gold-economy-admission-flow-integration` @ `8284c48b3e6b8c75709a58951acacbc59dd81184`

Frozen IM-19F marker:
- `frozen/im-19f-operational-economy-gold-settlement` @ `90d1b093fe1b99b048ea68529b9b0af731b11456`

Frozen IM-19G marker:
- `frozen/im-19g-player-population-housing-gold-projection` @ `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`

## 3. Binding ownership boundary after IM-18

- Existing Building Domain/store remains sole owner of stable Building identity, lifecycle and Building-store mutation.
- Frozen IM-17 remains authoritative for economic construction admission, material demand, logistics connection, delivered-material progress and exactly-once construction completion.
- IM-18A consumes completed construction plus existing Building lifecycle and admits an operational Building only when construction is complete and the Building still exists.
- IM-18B defines operational workforce requirement/eligibility over existing Person workforce profiles and existing Workforce assignment state.
- IM-18C performs deterministic workforce assignment over eligible free persons and reuses existing Workforce assignment-state authority.
- IM-18D connects an assigned operational Building to the existing production BuildingStock recipe contract. It creates no second recipe or stock authority.
- IM-18E evaluates operational production only from assigned workforce, the integrated existing recipe and current BuildingStock inputs.
- IM-18F is the authoritative IM-18 production settlement seam: required inputs are removed and outputs are added through existing BuildingStock mutation contracts, with duplicate settlement protection.
- IM-18G projects authoritative operational state into Player UI only. UI owns no Building, workforce, recipe, production, BuildingStock or settlement truth.
- Existing Runtime, Scheduler, Transport, Resource, BuildingStock, Person, Workforce, Selection, Camera and SaveGame owners remain authoritative.
- Frozen IM-15 Inspector remains observer/guidance except its already frozen diagnostic action allowlist.
- Legacy `main` gameplay/UI architecture remains reference only.

## 4. IM-18 – Operational Building / Workforce / Production Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Definition baseline:** frozen IM-17 @ `53de400c2ffe57addf832b599b906b3d5b473385`.

**Frozen Whole-Block head:** `2d068aa357ec5d1fe8f53eb867037021d04caddf`.

**Frozen marker:** `frozen/im-18-operational-building-workforce-production-integration`.

### Whole-Block objective

IM-18 answers:

`How does an authoritatively completed existing Building become operational with real workforce, an existing production recipe, real input availability and deterministic BuildingStock settlement without duplicating Building, Person, Workforce, Recipe, Production or Stock authority?`

The implemented flow is:

`frozen IM-17 completed Building → IM-18A operational admission → IM-18B workforce requirement/eligibility → IM-18C deterministic assignment → IM-18D existing production recipe integration → IM-18E operational execution readiness → IM-18F input consumption/output settlement → IM-18G read-only Player operational-state projection`.

### IM-18A – Operational Building Admission Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `01ad19b2064887b131b4bdd1dd7157f0a4f6724c`

Consumes existing construction completion and Building lifecycle. Operational admission requires exactly one effective completion for the same Building and lifecycle state `EXISTS`.

### IM-18B – Workforce Requirement / Eligibility Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `42e64722b34ed7d516735111c5c4ce573631d59a`

Defines required worker count, specialization and capabilities for an admitted operational Building and evaluates only existing Person workforce profiles plus existing Workforce assignment state. Eligibility requires matching specialization/capabilities and `FREE` assignment availability.

### IM-18C – Deterministic Workforce Assignment Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `195299b0fb7098806be88b7c0b3a577ca737ecb6`

Selects eligible persons deterministically by stable person ID up to the required count and transitions them through the existing Workforce assignment-state contract. Insufficient eligible workforce is rejected rather than partially manufacturing assignment truth.

### IM-18D – Production Requirement / Recipe Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `2e5d4fc53295a7abee92b0f9190a6bac1b5e31fe`

Requires an assigned operational workforce and reuses the existing production BuildingStock recipe for the same Building. Existing recipe inputs and outputs remain authoritative.

### IM-18E – Operational Production Execution

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `9d1a3bb165564b29ad7ad1a5ee8619ed2d131c20`

Evaluates real BuildingStock input availability for the assigned operational Building and produces only `READY` or `BLOCKED_INPUT`. Execution is rejected when required inputs are insufficient.

### IM-18F – Input Consumption / Output Settlement

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `6cfe680eb8b66c8015026629a7200483ae4c3bdd`

Consumes recipe inputs and adds outputs through existing BuildingStock mutation contracts after successful IM-18E execution. A settlement ID prevents the same production settlement from being applied twice.

### IM-18G – Player Operational State Projection

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Frozen head:** `2d068aa357ec5d1fe8f53eb867037021d04caddf`

Projects only existing authoritative operational state to Player UI, including no worker, waiting for input, ready to produce and production settled. It owns no gameplay mutation authority.

### IM-18 Whole-Block exclusions

IM-18 introduces no housing assignment, population derivation, Gold economy, tax/trade system, wages, needs/happiness, migration, birth/death/aging, demolition, upgrades, new transport/routing authority, SaveGame rearchitecture, Inspector editor authority or legacy `main` gameplay reuse.

## 5. IM-19 – Population / Housing / Gold Economy Integration

**Status:** WHOLE-BLOCK RECONCILIATION PASS / FREEZE AUTHORIZATION PENDING

**Definition baseline:** frozen IM-18 @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`.

**Whole-Block branch:** `feature/im-19-population-housing-gold-economy-integration`.

### IM-19A – Residential Building Admission Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `b528081409407ad531a450e5deb832ee7a0031e7`  
**Frozen marker:** `frozen/im-19a-residential-building-admission-contract`

IM-19A consumes frozen IM-18A operational admission, existing Building identity and the existing `building-housing` capability. Residential admission requires the same stable `buildingId` across those sources and positive existing housing capacity. It creates no occupancy, resident assignment, population or Gold truth.

Regression evidence on implementation head `c46ef9a7739fee8a82397f4c6b605c1a7a94dc94`: CI `34640779068` SUCCESS and Pages `34640777324` SUCCESS. Real iPad/Safari evidence confirmed the exact IM-19A TESTBUILD identity, correct title and the visible admission-only/non-scope boundary.

Exact-head CI and Pages succeeded on `b528081409407ad531a450e5deb832ee7a0031e7`; the frozen IM-19A marker was created and verified identical to the Whole-Block branch.

### IM-19B – Housing Capacity / Occupancy Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `3ba5a17761ac7f8bce3f01a49cbaef515728c355`  
**Frozen marker:** `frozen/im-19b-housing-capacity-occupancy-integration`

IM-19B consumes only a frozen-IM-19A admitted residential Building plus existing `resident-home-assignment` state. It reuses `HousingCapacityOccupancy` as the sole authority for `capacity`, `occupancy`, `availableSlots` and the capacity invariant. IM-19B derives only `AVAILABLE` or `FULL`; it creates or mutates no resident assignment and introduces no Person, Population or Gold authority.

Final evidence: CI `34682616074` SUCCESS and Pages `34682615729` SUCCESS on exact frozen head `3ba5a17761ac7f8bce3f01a49cbaef515728c355`. The real device evidence was **iPhone/Safari only**. Earlier steering wording that additionally claimed iPad evidence was incorrect and is corrected on this active Whole-Block branch.

### IM-19C – Resident → Housing Assignment Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`  
**Frozen marker:** `frozen/im-19c-resident-housing-assignment-integration`

**Definition baseline:** frozen IM-19B @ `3ba5a17761ac7f8bce3f01a49cbaef515728c355`.

IM-19C consumes only existing stable Resident/Person identities, frozen-IM-19B Housing integration states and existing active home assignments. Housing and candidate persons are ordered deterministically by stable ID. Existing homes are preserved; only previously unassigned existing persons may receive a new home, and that assignment is created solely through the existing `HousingHomeCapacityIntegrationContract.assignHome(...)` authority.

No Person/Resident creation, Population derivation, Workforce mutation or Gold mutation is part of IM-19C.

Final evidence: real **iPhone/Safari** device PASS plus CI `34686333542` SUCCESS and Pages `34686333201` SUCCESS on exact frozen head `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`. No iPad evidence is claimed for IM-19C.

### IM-19D – Authoritative Population Projection

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `0847d27b60f13a99cb76d220b56b58107e832950`  
**Frozen marker:** `frozen/im-19d-authoritative-population-projection`

**Definition baseline:** frozen IM-19C @ `0874cbb7102e738e3a4b32cbf2d40c4c0ebcb408`.

IM-19D is a read-only Player population projection over frozen-IM-19C Resident→Home truth and existing stable Resident identities. Only valid existing Residents with active authoritative homes are counted; projected Population must remain exactly consistent with the frozen-IM-19B Housing occupancy state.

The projection also exposes immutable `population-count-trace` entries (`personId → homeBuildingId → COUNTED`) so the existing read-only diagnostics/Inspector can later visualize the step chain and branches. This is **data preparation only**: IM-19D adds no Inspector UI, no diagnostic mutation and no new Inspector authority.

No Person creation/mutation, Housing mutation, Home assignment mutation, Workforce mutation or Gold mutation is part of IM-19D.

Freeze-gate correction: the first IM-19D browser/device evidence had the correct TESTBUILD identity, but source inspection proved that HUD and Inspector still read Population from legacy CR-30B `housingPopulation.population`. That blocked freeze. The corrected runtime composition now executes the real frozen-IM-19A→B→C Housing/Resident assignment chain, exposes `CleanRuntime.populationProjection`, and routes HUD plus read-only Inspector Population through IM-19D. Gold remains on its existing pre-IM-19E owner/path. The previous TESTBUILD 1 screenshot remains historical evidence only. The corrected deployment has now passed a fresh real **iPhone/Safari TESTBUILD 2** re-test: screenshots visibly confirm `IM-19D-AUTHORITATIVE-POPULATION-PROJECTION-TESTBUILD-2`, `READY`, Population `3` in both HUD and read-only Inspector, and `IM-19D · TESTBUILD 2` on the lower surface. CI `34687205200` and Pages `34687204928` both succeeded on exact implementation head `149f37fbdc2aa3d1f05301a38ee3eb9452abec40`. This final steering commit must itself receive exact-head CI + Pages SUCCESS before `frozen/im-19d-authoritative-population-projection` is created.

### IM-19E – Gold Economy Admission / Flow Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `8284c48b3e6b8c75709a58951acacbc59dd81184`  
**Frozen marker:** `frozen/im-19e-gold-economy-admission-flow-integration`

**Definition baseline:** frozen IM-19D @ `0847d27b60f13a99cb76d220b56b58107e832950`.

IM-19E connects frozen-IM-19D authoritative Population to the existing non-physical `GoldEconomyOwner` without mutating its balance. The only admitted flow type in this block is `POPULATION_INCOME`. The existing owner remains the sole Gold authority and its existing `deriveIncome(...)` path is reused through a strict adapter from the IM-19D projection.

Admission produces an immutable `gold-economy-admission-flow` containing the source Population, rate and derived amount, while proving that `GoldEconomyOwner.balance` remains unchanged. `applyIncome(...)`, `settle(...)`, settlement IDs and any balance-after state remain IM-19F scope.

No taxes, trade, wages, physical Resources, BuildingStock Gold, transport or Inspector mutation authority is introduced.

Regression/device evidence on implementation head `9319c87192532bc2dae92015b7dabfa190d48e19`: CI `34689680807` SUCCESS and Pages `34689680511` SUCCESS. Real Safari device evidence confirms `READY`, exact `IM-19E-GOLD-ECONOMY-ADMISSION-FLOW-INTEGRATION-TESTBUILD-1`, the IM-19E title, and `IM-17 WHOLE BLOCK – PASS`. The earlier transient `IM-16G — FAIL · buildIdentity=false` view is not the current deployment evidence; the refreshed device view shows the frozen predecessor regression PASS. A final documentation-only exact-head CI + Pages verification is required before the IM-19E frozen marker is created.

### IM-19F – Operational Economy → Gold Settlement

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `90d1b093fe1b99b048ea68529b9b0af731b11456`  
**Frozen marker:** `frozen/im-19f-operational-economy-gold-settlement`

**Definition baseline:** frozen IM-19E @ `8284c48b3e6b8c75709a58951acacbc59dd81184`.

IM-19F consumes only a frozen-IM-19E `POPULATION_INCOME` admission and applies its existing `derived-gold-income` exactly once to the existing non-physical `GoldEconomyOwner`. It rejects stale admissions and duplicate settlement IDs before a second Gold mutation and exposes immutable `stateBefore` / `stateAfter`.

The active visible Gold path is `IM-19D Population → IM-19E Admission → IM-19F Settlement`; the older direct CR-30C settlement shortcut is not the active Runtime path.

Final evidence: real Safari device PASS, CI `34691298234` SUCCESS and Pages `34691298046` SUCCESS on exact frozen head `90d1b093fe1b99b048ea68529b9b0af731b11456`. Frozen marker verification is identical / 0 ahead / 0 behind.

### IM-19G – Player Population / Housing / Gold Projection

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`  
**Frozen marker:** `frozen/im-19g-player-population-housing-gold-projection`

**Definition baseline:** frozen IM-19F @ `90d1b093fe1b99b048ea68529b9b0af731b11456`.

IM-19G is a read-only Player projection over frozen authoritative Population, Housing and Gold truth. Population comes from IM-19D, Housing capacity/occupancy from the frozen IM-19B/IM-19C chain, and Gold from IM-19F `stateAfter` cross-checked against the current `GoldEconomyOwner` snapshot.

The projection aggregates residential Building count, capacity, occupancy and available slots, requires projected Population to equal authoritative Housing occupancy, rejects stale Gold state, and renders only Player-facing state such as `Siedlung · Bevölkerung 3 · Wohnen 3/3 · Gold 3`.

IM-19G owns no Population, Resident, Housing, Home-assignment, Gold, Settlement or other Economy mutation authority. No further Economy capability and no Inspector system graph is introduced.

Regression/device evidence on implementation head `5fba2eb728adf1195473b28e578087fc37de2204`: CI `34697541542` SUCCESS and Pages `34697541497` SUCCESS. Real Safari device evidence on both iPhone and iPad confirms `READY`, exact `IM-19G-PLAYER-POPULATION-HOUSING-GOLD-PROJECTION-TESTBUILD-1`, the IM-19G title, visible Population `3`, visible Gold `3`, and the Player line `Siedlung · Bevölkerung 3 · Wohnen 3/3 · Gold 3`. The Player projection is read-only and remains consistent with authoritative Housing occupancy and frozen IM-19F Gold state. Exact-head CI and Pages passed on the freeze-gate finalization head, and `frozen/im-19g-player-population-housing-gold-projection` was created and verified identical to the Whole-Block branch. This final steering-only synchronization is re-verified before the marker is advanced to the final consistent head.

### Whole-Block objective

IM-19 answers:

`How are real completed/operational Buildings connected to the existing Housing, Population and non-physical Gold model so that residents, available population and Gold economy become gameplay-effective without duplicating Building, Person, Workforce, Housing, Population, Production or Gold authority?`

### Defined substeps

- **IM-19A – Residential Building Admission Contract**  
  Define when an existing real Building may enter the existing Housing system. No occupancy assignment, population mutation or Gold flow yet.

- **IM-19B – Housing Capacity / Occupancy Integration**  
  Connect admitted residential Buildings to existing Housing capacity/occupancy authority. No second occupancy model and no UI-owned mutation.

- **IM-19C – Resident → Housing Assignment Integration**  
  Deterministically connect existing stable Resident/Person identities to available Housing. Housing and Workforce remain separate authorities.

- **IM-19D – Authoritative Population Projection**  
  Derive Player population only from authoritative resident/housing state. No second mutable Player population truth.

- **IM-19E – Gold Economy Admission / Flow Integration**  
  Connect the existing non-physical Gold model to explicitly authorized real economy events. Gold is not a physical Resource or BuildingStock.

- **IM-19F – Operational Economy → Gold Settlement**  
  Apply clearly defined economic events to authoritative Gold state without introducing trade, tax or wage systems.

- **IM-19G – Player Population / Housing / Gold Projection**  
  Read-only Player projection of authoritative population, housing occupancy/capacity and Gold state.

### IM-19 Whole-Block Completion / Reconciliation

**Status:** PASS / 0 BLOCKER / WHOLE-BLOCK FREEZE AUTHORIZATION PENDING

**Baseline:** frozen IM-18 Whole-Block @ `2d068aa357ec5d1fe8f53eb867037021d04caddf`  
**Reconciled A–G head:** `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`

Whole-Block reconciliation confirms:

- IM-19A through IM-19G are each COMPLETE / FROZEN / PASS / 0 BLOCKER and all seven frozen markers exist.
- The Whole-Block branch is identical to frozen IM-19G.
- Against frozen IM-18 the IM-19 line is forward-only: 90 commits ahead / 0 behind.
- The Whole-Block diff is limited to IM-19 domain/integration contracts, A–G self-tests, required Runtime/UI projection wiring, CI and steering documentation; no unrelated gameplay system, CSS redesign, SaveGame rearchitecture or Inspector system graph was introduced.
- CI contains the complete IM-19A→G regression chain.
- Final reconciled-head evidence: CI `34698054759` SUCCESS and Pages `34698054480` SUCCESS on `9d47c2dc52eeddfb36177f3d07554ea4917ec84b`.
- Real device evidence includes the required individual substep checks, with final IM-19G PASS on both iPhone/Safari and iPad/Safari.

The defined Whole-Block question is therefore satisfied by the frozen A–G chain without duplicating Building, Person, Workforce, Housing, Population, Production or Gold authority.

This reconciliation does **not** freeze IM-19 as a Whole-Block. A separate explicit IM-19 Whole-Block Freeze Authorization / Freeze Decision is required before creating a Whole-Block frozen marker.

### Future Inspector – Whole Clean-Runtime Rebuild Chain (NON-SCOPE)

The intended later Inspector chain visualization is the **complete Clean-Runtime rebuild**, not merely an individual Resident/Population trace. It should be able to represent the CR/IM capability graph from the clean foundation through the current integration blocks, including sequential steps, branches, ownership boundaries, frozen baselines/gates and relevant runtime evidence. Local traces such as IM-19D `personId → homeBuildingId → COUNTED` are only optional evidence nodes inside that broader system graph.

No such Inspector graph UI is implemented or authorized by IM-19G.

### IM-19 explicit non-scope

No tax system, marketplace/trade system, wages, needs/happiness, births, deaths, aging, migration, demolition, upgrades, new production system, new transport system, SaveGame rearchitecture, Inspector editor authority or legacy `main` gameplay reuse.

## 6. IM-20 – Authoritative SaveGame / Continue Integration

**Status:** IN PROGRESS

**Definition baseline:** frozen IM-19 Whole-Block @ `f9c9202014deded496d96adfb96a430a230f06f2`.  
**Whole-Block branch:** `feature/im-20-authoritative-savegame-continue-integration`.

### Whole-Block question

`How does the fully rebuilt frozen-IM19 game state survive Save → Reload → Continue as the same authoritative state without additive defaults, lost assignments/stocks, duplicated settlements or persisted second truths?`

### IM-20A – Persistent State Inventory & SaveGame Schema Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-20a-persistent-state-inventory-savegame-schema-contract`

IM-20A defines a declarative persistence inventory and a target SaveGame **schemaVersion 2** boundary without activating that schema in the existing IM-13 SaveGame implementation.

The inventory classifies each relevant state as exactly one of:

- `PERSIST` — authoritative truth whose loss/replay would change gameplay after Continue.
- `REBUILD_DERIVE` — deterministic projection/cache/runtime binding that must be reconstructed from restored owners and must not become a persisted second truth.

**PERSIST coverage includes** the existing IM-13 truth (capture boundary, World, Map, CoreDomainStores, Gold and Path/Wear) plus post-IM13 authoritative state required for frozen IM-19 continuity: ResourceDemands, ResourceClaims, construction progress, local BuildingStock, BuildingStock transport reservations, Workforce assignment state, Resident→Home assignment state, production settlement fences and Gold settlement fences.

**REBUILD / DERIVE coverage includes** Housing occupancy/status, authoritative Population projection, operational Building admission, workforce eligibility/read projection, production readiness/recipe integration, completion projection, Gold admission/read views, Player projections, transient transport recovery bindings, navigation/reachability/routes/caches, path classification/traversability, scheduler registrations/subscriptions and renderer/camera/selection/Inspector runtime state.

Hard IM-20A boundary:

- target schema = V2, status `DEFINED_NOT_ACTIVE`;
- active `SaveGameSnapshotContract.schemaVersion` remains V1;
- active `SaveGameValidationContract.schemaVersion` remains V1;
- no snapshot capture field is added by IM-20A;
- no restore path is extended by IM-20A;
- no browser storage / Save / Continue lifecycle is introduced by IM-20A;
- no silent fallback to New Game is permitted by the target contract;
- legacy `main` save migration remains out of scope.

Implementation:
- `src/savegame/persistent-state-inventory-schema-contract.js`
- `src/dev/im-20a-self-test.js`
- `src/dev/im-20a-self-test.node.js`

### IM-20B – Post-IM13 Authoritative Snapshot Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-20b-post-im13-authoritative-snapshot-integration`

**Definition baseline:** frozen IM-20A @ `045a056535604b7adcaeb658212da403f532b4f9`.

IM-20B adds a separate V2 **capture-only** SaveGame integration above the frozen IM-13 V1 snapshot contract. The frozen V1 contract remains unchanged and continues to capture `capture/world/map/domains/economy.gold/pathWear`.

The IM-20B V2 capture adds exactly the post-IM13 authoritative sections defined by IM-20A:

- `authoritative.resourceDemands`
- `authoritative.resourceClaims`
- `authoritative.constructionProgress`
- `authoritative.buildingStocks`
- `authoritative.buildingStockTransportReservations`
- `authoritative.workforceAssignments`
- `authoritative.homeAssignments`
- `authoritative.settlementFences.production`
- `authoritative.settlementFences.gold`

Demand progress projection fields (`reservedAmount`, `fulfilledAmount`, `remainingAmount`, `status`) are deliberately excluded from persisted demand records because they derive from Claims and must not become a second truth.

Capture is deterministic, deeply frozen and canonicalizable. ResourceDemand/Claim allocator continuity is captured deterministically from stable IDs. Arrays are normalized/sorted and reject duplicate identity keys before serialization.

Hard IM-20B boundary:

- V2 Snapshot Capture = implemented;
- frozen IM-13 `SaveGameSnapshotContract` remains schema V1;
- frozen IM-13 `SaveGameValidationContract` remains schema V1;
- V2 validation = not implemented;
- V2 restore = not implemented;
- browser storage / Save / Continue lifecycle = not implemented;
- no derived-state persistence;
- no IM-20C+ capability.

Implementation:
- `src/savegame/post-im13-authoritative-snapshot-integration.js`
- `src/dev/im-20b-self-test.js`
- `src/dev/im-20b-self-test.node.js`

Implementation head `d04acc61f7bfca07b23c912f16fad1edf40038a4` passed the complete predecessor regression plus IM-20B self-test in CI `34702294625` with SUCCESS. Source verification confirms V2 capture only: frozen V1 Snapshot/Validation remain unchanged, V2 validation/restore are absent, and browser storage/Continue are absent.

**IM-20B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

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

Correction evidence: CI `34705200714` SUCCESS and Pages `34705200407` SUCCESS on corrected head `6480d00941b688437976b5b5c88899fef79faa15`; frozen marker `frozen/im-20b-post-im13-authoritative-snapshot-integration` was fast-forwarded to that head and verified identical / 0 ahead / 0 behind.

### Remaining defined substeps

- **IM-20B – Post-IM13 Authoritative Snapshot Integration — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20C – Deterministic Validation & Restore Integration — DEFINED / NOT IMPLEMENTED**
- **IM-20D – Derived-State Rebinding after Continue — DEFINED / NOT IMPLEMENTED**
- **IM-20E – Browser Save / Reload / Continue Lifecycle Integration — DEFINED / NOT IMPLEMENTED**
- **IM-20F – Exactly-once & Recovery Reconciliation — DEFINED / NOT IMPLEMENTED**
- **IM-20G – Save/Continue Player & Device Verification — DEFINED / NOT IMPLEMENTED**

### IM-20 explicit non-scope

No multi-slot SaveGame menu, cloud save, multiplayer synchronization, autosave system, legacy `main` save migration, final responsive Game-UI/wireframe redesign, new Economy capability or Inspector Clean-Runtime system graph.

Responsive Game UI remains a later dedicated scope with separate iPhone, iPad and Desktop layout planning.

### IM-20A current gate

Implementation head `e1cc7e94f84d2ba9bf666aece318366c7a90f00f` passed the complete predecessor regression plus IM-20A self-test in CI `34700519373` with SUCCESS. Source verification confirms target schema V2 remains `DEFINED_NOT_ACTIVE`, active snapshot/validation stay on V1, and no capture/restore/browser-storage implementation was introduced.

**IM-20A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Freeze evidence includes implementation CI `34700519373`, finalization CI `34700971956`, exact-head regression PASS and the frozen marker `frozen/im-20a-persistent-state-inventory-savegame-schema-contract`. The marker is the authoritative frozen ref for IM-20A.

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

**IM-20 = IN PROGRESS.**

**IM-20A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20C = DEFINED / NOT IMPLEMENTED.**

The next permissible development step is exclusively IM-20C – Deterministic Validation & Restore Integration, and only when separately authorized. IM-20D+ remains unauthorized.

## 8. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-12 — IM-20B remains COMPLETE / FROZEN / PASS / 0 BLOCKER after Build Identity Reconciliation / Correction. Corrected identity head `aeebbe487429eb9889412ec36179c44a51268a1a`; CI `34703598385` and Pages `34703597830` SUCCESS. IM-20C remains DEFINED / NOT IMPLEMENTED and requires separate authorization.