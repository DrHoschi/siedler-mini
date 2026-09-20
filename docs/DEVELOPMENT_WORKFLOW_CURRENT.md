# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Frozen development baseline: corrected IM-20C @ `ce84bacef4d2802f045ce522e7f7140b7b173fd8`
- Frozen IM-20C marker: `frozen/im-20c-deterministic-validation-restore-integration`
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
- **IM-20B – Post-IM13 Authoritative Snapshot Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER — continuity correction incorporated**
- **IM-20C – Deterministic Validation & Restore Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER — continuity correction incorporated**
- **IM-20D – Derived-State Rebinding after Continue: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20E – Browser Save / Reload / Continue Lifecycle Integration: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20F: COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-20G: COMPLETE / FROZEN / PASS / 0 BLOCKER**

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

Frozen IM-20D marker:
- `frozen/im-20d-derived-state-rebinding-after-continue` @ final freeze-gate head

Frozen IM-20E marker:
- `frozen/im-20e-browser-save-reload-continue-lifecycle-integration` @ final freeze-gate head

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

**Status:** COMPLETE / PASS / 0 BLOCKER — WHOLE-BLOCK FREEZE PENDING

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

**IM-20B = COMPLETE / FROZEN / PASS / 0 BLOCKER — Rebinding prerequisite continuity correction incorporated.**

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

### IM-20C – Deterministic Validation & Restore Integration

**Status:** IMPLEMENTED / NOT FROZEN

**Baseline:** corrected frozen IM-20B @ `a3a5d2f5fafa1885fea7be489ea601680c432e25`.

IM-20C adds a separate schema-V2 validation/restore layer above the frozen IM-13 V1 SaveGame contracts. The frozen V1 validator/restore remain unchanged.

Validation now covers the complete IM-20B V2 snapshot before any restore owner is committed:

- frozen V1 `capture/world/map/domains/economy.gold/pathWear` validation is reused as the base boundary;
- Resource-Type definitions and allocator continuity;
- Housing capability references/capacity;
- Person workforce profiles;
- Building workforce requirements;
- Production recipes and Resource-Type references;
- ResourceDemands / ResourceClaims structure, allocator continuity and Demand↔Claim↔Resource invariants;
- construction progress;
- local BuildingStock;
- BuildingStock transport reservations;
- Workforce assignments;
- Resident→Home assignments;
- production/Gold exactly-once settlement fences;
- cross-owner stable-ID/reference checks.

Restore is fail-closed and atomic at this contract boundary:

1. validate the entire V2 payload;
2. reject without `runtimeState` when invalid;
3. restore the frozen V1 owners into new standalone instances;
4. restore ResourceState definition state/allocator, Claims, Demands and the remaining persisted authoritative contracts;
5. expose a new `restored-post-im13-authoritative-runtime-state` only after successful preparation.

IM-20C extends the existing Owner constructors only with restore inputs following the already frozen DomainStore pattern. Normal ResourceState/ResourceClaims/ResourceDemands mutation semantics remain unchanged.

Deterministic self-test includes canonical:

`Capture A → Validate → Restore B → Capture B`

identity, Stable-ID allocator continuity, exactly-once fence recovery and fail-closed rejection of invalid cross-owner references.

Implementation:
- `src/savegame/post-im13-savegame-validation-contract.js`
- `src/savegame/post-im13-savegame-restore-integration.js`
- `src/dev/im-20c-self-test.js`
- `src/dev/im-20c-self-test.node.js`
- restore-only constructor support in `src/resources/resource-state.js`, `resource-claims.js`, `resource-demands.js`

Visible verification identity:
`IM-20C-DETERMINISTIC-VALIDATION-RESTORE-INTEGRATION-TESTBUILD-3`

Hard IM-20C boundary:
- V2 Validation = implemented;
- V2 Restore into new standalone authoritative owners = implemented;
- invalid payload = fail-closed before commit;
- Derived-State Rebinding = not implemented;
- restored runtime activation = not implemented;
- browser storage / Save / Reload / Continue = not implemented;
- no IM-20D+ capability.

The next permissible step is exclusively **IM-20C Completion / Regression / Freeze Gate**. IM-20D remains unauthorized until IM-20C is frozen.

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

IM-20D adds a fail-closed, side-effect-free rebinding seam that accepts only the exact IM-20C `RESTORED` result. It builds a candidate derived graph from the restored B owners without publishing that graph into the active Runtime.

Rebuilt state:
- construction-completion evidence and operational admission from restored Building/lifecycle/progress truth, without replaying completion effects;
- residential admission, Housing capacity/occupancy and Population from restored capabilities, Person identities and persisted Home assignments, without creating new assignments;
- operational workforce projection from persisted `assignmentId ↔ buildingId`, including exact restored Person assignment states;
- production-recipe integration and `READY` / `BLOCKED_INPUT` state from restored BuildingStock, without production settlement;
- Player Population/Housing/Gold and operational read models; Gold uses current restored balance plus the complete settlement-fence view and does not fabricate/replay a historical last settlement;
- CarrierAssignmentService state from persisted `jobId ↔ unitId`, plus exact `TransportExecutionContract` state and an explicit recovery action;
- fresh restored-B path classification, traversability, reachability, entity-validation, on-demand routing and render projections; serialized route caches remain empty;
- a deterministic scheduler registration plan and presentation/Inspector reset/read models, all marked uninstalled/unpublished.

Fail-closed boundary:
- a raw snapshot or raw runtime-state object is rejected;
- a structurally restored but semantically inconsistent derived graph is rejected with no candidate graph;
- workforce assignment, carrier assignment and transport execution identities are never guessed;
- authoritative snapshot content remains canonically unchanged across Rebind.

Visible build:
`IM-20D-DERIVED-STATE-REBINDING-AFTER-CONTINUE-TESTBUILD-1`

Local evidence:
- `npm run ci` — PASS / 0 BLOCKER;
- `node src/dev/im-20d-self-test.node.js` — PASS;
- Housing `2/2`, Population `2`, Gold `9` rebuilt from restored B;
- Workforce `assignment:00000001 ↔ building:00000002` rebound;
- Carrier `transport-job:00000001 ↔ unit:00000001` rebound;
- transport execution state `TO_DROPOFF` preserved with `CONTINUE_TO_DROPOFF` recovery action;
- canonical authoritative Capture→Restore→Rebind→Capture identity preserved;
- inconsistent workforce-on-non-operational-Building graph rejected fail-closed.

Remote implementation evidence:
- implementation head `1dea166edc10460ef17080c4b95264815a513aec` with tree `8efba31176c110dab27e102337ea121c459a6f3f`;
- CI `34767700678` — SUCCESS, including `Run IM-20D + frozen predecessor regression` — SUCCESS;
- Pages `34767700128` — SUCCESS;
- diff from corrected frozen IM-20C is ahead-only / 0 behind and limited to the 12 IM-20D implementation, test, build-identity, CI and steering-document files.

Freeze-gate evidence:
- documentation/evidence head `d1ebc1204257516709c51effcf17543befa02262` passed CI `34767886051` with the full IM-20D + frozen predecessor regression;
- real iPhone/Safari evidence confirms `READY`, exact `IM-20D-DERIVED-STATE-REBINDING-AFTER-CONTINUE-TESTBUILD-1`, the IM-20D title, Population `3`, Gold `3`, Housing `3/3`, and the lower IM-20D TESTBUILD 1 surface;
- real iPad/Safari evidence confirms `READY`, exact `IM-20D-DERIVED-STATE-REBINDING-AFTER-CONTINUE-TESTBUILD-1`, the IM-20D title, Population `3`, Gold `3`, Housing `3/3`, and the Player line `Siedlung · Bevölkerung 3 · Wohnen 3/3 · Gold 3`;
- no cache regression to IM-20C is visible on either device.

Hard boundary: no active-runtime publication, Scheduler installation, browser persistence, Save/Reload/Continue lifecycle, settlement replay/reconciliation or other IM-20E+ capability is implemented or authorized.

### IM-20E – Browser Save / Reload / Continue Lifecycle Integration

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-20e-browser-save-reload-continue-lifecycle-integration`

**Verification-blocker correction implementation:** remote commit `75f0c779f98806785d9f26913ddff376a1b13ec6` (Pages source, normal transport continuation, atomic rollback and missing lifecycle acceptance coverage).

**Definition baseline:** frozen IM-20D @ `7758bff83164c90793dacc75d437b2d9f3d64c66` with marker `frozen/im-20d-derived-state-rebinding-after-continue`.

IM-20E connects the already frozen IM-20A–D contracts to one real browser lifecycle without creating a second SaveGame, Runtime or Scheduler authority:

`completed simulation step → canonical V2 capture → browser persistence → browser reload → V2 validation → restore → IM-20D rebinding → atomic activation → scheduler installation → Continue`.

Save boundary:
- Save capture is permitted only at a confirmed `completed-simulation-step-boundary`; no mid-step capture is valid.
- Capture and serialization use the frozen IM-20B schema-V2 integration unchanged.
- IM-20E provides exactly one stable technical same-origin `localStorage` entry. Its canonical serialized V2 payload is the only stored game-state payload; browser storage remains transport/persistence infrastructure and owns no gameplay truth.
- A failed write must not replace the previous valid entry with a partial payload.

Reload / preparation boundary:
- after a real page reload, a present payload is read and parsed, validated completely by IM-20C, restored into new standalone owners and rebound completely by IM-20D;
- the result remains an unpublished candidate until every stage succeeds;
- absence of a saved payload leaves normal baseline boot available and creates no guessed Continue state;
- malformed, unsupported or invalid payloads are rejected fail-closed and are not repaired or silently migrated.

Continue / activation boundary:
- Continue accepts only an exact IM-20D result with status `REBOUND`;
- active Runtime composition publication, IM-20D-derived presentation/read-model publication, scheduler-plan installation, camera reset and selection clear form one controlled activation transaction;
- the Runtime/Scheduler may start or resume only after that transaction succeeds;
- scheduler registrations use the deterministic IM-20D descriptors and recovery actions such as `CONTINUE_TO_PICKUP` / `CONTINUE_TO_DROPOFF`; duplicate/partial installation must reject or roll back without leaving mixed old/new registrations;
- failed parse, validation, restore, rebinding, scheduler installation or publication preserves the previous active composition, scheduler state and non-running lifecycle state.

IM-20E does not replay construction completion, production, delivery or Gold settlement effects and does not invent missing Workforce, Carrier or TransportExecution identity. It may expose only the minimum technical Save/Continue access required for automated and browser integration verification; this is not a final player Save menu or responsive UI redesign.

Acceptance boundary:
- canonical V2 Save at an exact completed-step boundary;
- persistence across a real browser reload;
- full `validate → restore → rebind` completion before publication;
- atomic active-owner/presentation publication and scheduler installation before Runtime start;
- preserved `assignmentId ↔ buildingId`, `jobId ↔ unitId` and TransportExecution continuity;
- camera/selection/transient caches are reset or rebuilt rather than persisted;
- invalid/corrupt/unsupported storage and every activation-stage failure remain fail-closed with no partial publication;
- canonical Capture-before-Save versus Capture-after-Continue identity;
- full IM-20D and frozen predecessor regression remains green;
- no IM-20F+ capability is present.

Hard IM-20E / IM-20F boundary: IM-20E may execute only the unambiguous normal continuation actions already determined by IM-20D. Crash-window settlement reconciliation, additional exactly-once/recovery fences, ambiguous-state repair, replay reconciliation and new recovery decisions remain exclusively IM-20F and are not implemented or authorized here.

Explicit non-scope remains: multi-slot Save UI, cloud save, multiplayer synchronization, autosave, legacy-main save migration, final Save-menu/wireframe or responsive Game-UI redesign, new Economy capability, Inspector system graph, IM-20F Exactly-once & Recovery Reconciliation and IM-20G Player/Device Verification.

Completion / evidence / freeze gate:
- verified implementation/evidence head `991cc28e3c5146e7dada0093569ecc7801b01572` passed the full local IM-20E and frozen-predecessor regression with 0 blockers;
- manually started exact-head CI run `35200717289` completed SUCCESS; rerun job `105157412546` completed every relevant setup, checkout and `Run IM-20E + frozen predecessor regression` step successfully;
- exact-head Pages run `35200717307` completed SUCCESS and the live Pages source exposed `IM-20E-BROWSER-SAVE-RELOAD-CONTINUE-LIFECYCLE-INTEGRATION-TESTBUILD-2`;
- freeze-documentation head `1d0523da21329b0293bef879d22e1c9ab4a4fb11` passed CI `35211582967` and Pages `35211582955`, both SUCCESS;
- branch comparison against frozen IM-20D `7758bff83164c90793dacc75d437b2d9f3d64c66` is ahead-only / 0 behind and limited to the authorized IM-20E lifecycle, storage, activation/rollback, scheduler, transport-continuation, verification, build-identity, CI/Pages and steering-document scope;
- the four prior verification blockers are corrected: branch-bound Pages deployment, normal transport continuation through completion, atomic composition/presentation rollback, and lifecycle acceptance coverage;
- no IM-20F exactly-once/recovery reconciliation, ambiguous-state repair, replay reconciliation or other IM-20F+ capability is present.

### IM-20F – Exactly-once & Recovery Reconciliation

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Definition baseline:** frozen IM-20E @ `84945407ef40cfc31fe4dc56f11823e591e9fac2` with marker `frozen/im-20e-browser-save-reload-continue-lifecycle-integration`.

IM-20F owns only deterministic reconciliation of persisted crash-window states that IM-20E deliberately leaves unresolved. The existing normal continuation actions remain frozen. In particular, an execution restored as `DELIVERED` remains blocked behind `AWAIT_IM20F_COMPLETION_RECONCILIATION` until IM-20F classifies the complete authoritative state without replay or guessing.

Transport recovery decision boundary:
- `DELIVERED + Claim ACTIVE + Job PENDING + matching active Carrier binding` means delivery settlement has not yet become effective; IM-20F may apply it once and then complete the Job and release the Carrier;
- `DELIVERED + Claim CONSUMED + Job PENDING + matching active Carrier binding` means settlement is already effective; IM-20F must not settle again and may only finish Job completion and Carrier release;
- a canonically completed terminal Job with already consumed Claim is acknowledged as complete with no repeated effect;
- contradictory identity, Claim/Demand/Resource, Job, execution, Carrier state or binding combinations reject fail-closed and are never silently repaired.

Terminal continuity must define one canonical persisted outcome for `carrierBinding`, `transportExecution`, Scheduler registration and Carrier `OCCUPIED → AVAILABLE` release. The current V2 validation rule requiring every persisted TransportExecution to have a matching Carrier binding may not be weakened ambiguously; terminal cleanup versus terminal evidence retention must be made explicit and deterministic.

Production and Gold exactly-once boundary:
- BuildingStock input/output mutation and its `productionSettlementId` fence form one logical effect; stock/fence mismatch must not replay production and must reject unless a deterministic authorized reconciliation exists;
- Gold balance mutation and its `goldSettlementId` fence form one logical effect; balance/fence mismatch must not apply income twice and must reject unless a deterministic authorized reconciliation exists;
- restored construction completion remains evidence-only and must never replay completion side effects.

Authority boundary:
- ResourceState, ResourceClaims and ResourceDemands retain resource settlement authority;
- TransportJob and CarrierAssignment owners retain Job/Carrier lifecycle authority;
- BuildingStock remains production inventory authority and GoldEconomyOwner remains Gold authority;
- persisted settlement fences remain exactly-once evidence;
- IM-20F may classify and execute only a uniquely determined missing transition. It creates no second gameplay authority, invents no identity and performs no heuristic repair.

Required future acceptance coverage:
- crash before delivery settlement;
- crash after settlement but before Job completion;
- crash after Job completion but before terminal Carrier/binding cleanup;
- already complete terminal state is a no-op;
- duplicate transport, production or Gold settlement identity produces no second effect;
- production stock/fence mismatch, Gold balance/fence mismatch and contradictory transport states reject fail-closed;
- canonical `Capture → Restore → Reconcile → Continue → Capture` continuity;
- full IM-20A–E and frozen predecessor regression remains green.

Implementation status: IM-20F is COMPLETE / FROZEN / PASS / 0 BLOCKER. The final verified code head is `cac2b1cd0fa009e06538473f8da9e2f8e682a5d4`. Completion/freeze evidence: CI #5657 passed the complete IM-20F + frozen-predecessor regression on that code head; Completion Evidence documentation parent `3ab6edfc46728b6860f87acf8f1afd0020b1c360` passed CI #5658; the subsequent head `1d68d47676c6f0c9616de942f86cb134b8ad4b36` changed only `docs/ROADMAP_CURRENT.md`, which is excluded from the CI push path filter, so no new CI was triggered by design while exact-head Whole-Block Pages #18 and dynamic Pages #7497 both passed. Real iPad/Safari evidence confirms the IM-20F TESTBUILD 1 surface and Save → Reload → Continue lifecycle. Verification found no remaining Post-Recovery-Rebind blocker. No IM-20G+ capability is authorized.


### IM-20G – Save/Continue Player & Device Verification

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Definition baseline:** frozen IM-20F @ `eebf74a422b3277a10632b162cc2c7c471d65e50` with marker `frozen/im-20f-exactly-once-recovery-reconciliation`.

IM-20G owns verification of the complete player-facing Save/Continue lifecycle on real target devices. It introduces no new SaveGame capability. The verification flow is: establish real gameplay state → Save → real browser/page reload → detect persisted state → Continue → verify continuation of the same authoritative state → Save again. Existing IM-20A–F exactly-once/recovery guarantees remain frozen and must be exercised, not redesigned.

Required device scope includes iPhone / iOS Safari and iPad / iPadOS Safari; Desktop/browser may provide supplementary regression evidence. Visible build identity and the actually tested branch/build must be unambiguous. Existing valid real-device evidence from IM-20E/F may be reused where it proves the exact required contract; evidence must not be repeated artificially. Remaining device evidence, especially iPhone coverage, must be identified before completion.

If device verification exposes a real defect, that defect must first be reconciled and separately authorized; IM-20G must not silently expand into new functionality.

Explicit non-scope: multi-slot Save UI, cloud save, autosave, legacy `main` save migration, responsive Game-UI redesign, new Economy/Transport/Recovery capability, Inspector system graph, or any IM-20H+ capability.

**Completion evidence:** implementation/verification head `e66de4c920cc448c0cc213bd583fb0f01574ddbd` is ahead-only against frozen IM-20F and remains within the authorized verification-first product scope. Exact-head CI `CI Baseline #5671` completed SUCCESS. Controlled Pages deployment `Deploy Authoritative Development Testbuild to Pages #26` completed SUCCESS from `feature/im-20g-save-continue-player-device-verification`, and the live device surface exposed exact build identity `IM-20G-SAVE-CONTINUE-PLAYER-DEVICE-VERIFICATION-TESTBUILD-1`. Real iPhone/iOS Safari video evidence confirms Start → Pause → Save V2 → real page reload → Continue on that exact build; the Save evidence visibly records V2 at step 53. Existing valid iPad/iPadOS Safari evidence from IM-20E/F is reused for the frozen underlying Save/Reload/Continue contract, so no duplicate iPad execution is required for this verification-only block. The reduced Safari page zoom required to make the current technical surface usable on iPhone is NON-BLOCKING / OUT OF SCOPE and belongs to later responsive Player-UI work. No new SaveGame semantics were introduced.

**IM-20G Completion / Evidence Gate: PASS / 0 BLOCKER / FROZEN.**

### Remaining defined substeps

- **IM-20B – Post-IM13 Authoritative Snapshot Integration — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20C – Deterministic Validation & Restore Integration — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20D – Derived-State Rebinding after Continue — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20E – Browser Save / Reload / Continue Lifecycle Integration — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20F – Exactly-once & Recovery Reconciliation — COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-20G – Save/Continue Player & Device Verification — COMPLETE / FROZEN / PASS / 0 BLOCKER**

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

**IM-20 = COMPLETE / PASS / 0 BLOCKER — WHOLE-BLOCK FREEZE PENDING.**

**IM-20A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20C = COMPLETE / FROZEN / PASS / 0 BLOCKER — Rebinding prerequisite continuity correction incorporated.**

**IM-20D = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20F = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-20G = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The IM-20F freeze is final. IM-20G implementation and real-device verification are complete and frozen at `1d1846ffd0faa7f00df94681474e72e2f390fb78` with marker `frozen/im-20g-save-continue-player-device-verification`; no further IM-20G product change is authorized.

## 8. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-19 — IM-20F COMPLETE / FROZEN / PASS / 0 BLOCKER. Freeze evidence records final verified code head `cac2b1cd0fa009e06538473f8da9e2f8e682a5d4`, CI #5657, documentation-parent CI #5658, exact-head Pages #18/#7497, and real iPad/Safari evidence. IM-20G is COMPLETE / FROZEN / PASS / 0 BLOCKER at `1d1846ffd0faa7f00df94681474e72e2f390fb78`; no further IM-20G implementation is authorized.

## Repository Workflow Authority / CI-Pages Unification

**Status:** IMPLEMENTED / VERIFIED

The new-development workflow authority is independent from legacy `main`. Legacy `main` remains historical old-game reference and its legacy workflow is not migrated, replaced or deleted by this contract.

- CI push authority covers `feature/**`; block-specific branch hardcoding in CI is not permitted.
- CI-relevant paths include runtime/source/tool/package/index changes, both workflow files, and both steering files `docs/DEVELOPMENT_WORKFLOW_CURRENT.md` and `docs/ROADMAP_CURRENT.md`.
- `workflow_dispatch` remains the controlled exact-head fallback.
- CI evidence belongs to the exact tested commit SHA.
- Automatic Pages deployment is restricted to Whole-Block-style CR/IM branches matching `feature/cr-[0-9][0-9]-*` or `feature/im-[0-9][0-9]-*`. Letter-suffixed sub-block / verification branches such as IM-20G do not auto-deploy and therefore cannot overwrite the shared live testbuild merely by push.
- Pages `workflow_dispatch` remains the explicit verification-head deployment route. Pages evidence must be attributable to the exact deployed SHA.
- The active authoritative Whole-Block/testbuild line is a steering decision; changing an IM/CR sub-block must not require rewriting workflow branch names.
- IM-20G remains paused at pre-unification head `422568b03b38704acc4e4fe3e8f154729476219f` until this workflow-only/documentation head passes the separate scope/exact-head verification gate. No device evidence or freeze is authorized by this implementation.



### IM-20 Whole-Block Completion

**Status:** COMPLETE / PASS / 0 BLOCKER — WHOLE-BLOCK FREEZE PENDING

IM-20A through IM-20G form the complete defined Authoritative SaveGame / Continue Integration chain. IM-20G is frozen at `1d1846ffd0faa7f00df94681474e72e2f390fb78` with marker `frozen/im-20g-save-continue-player-device-verification`. No IM-20H capability is required or defined. The IM-20 Whole-Block question is satisfied by the frozen A–G chain. Multi-slot SaveGame UI, cloud save, autosave, legacy `main` save migration, final responsive Game-UI/wireframe redesign, further Economy capability and the Inspector Clean-Runtime system graph remain outside IM-20. No further IM-20 product change is authorized by this documentation finalization. A separate Whole-Block verification / freeze gate is required before creation of an IM-20 Whole-Block frozen marker.


## IM-21 – Responsive Player / Game UI Integration — Definition Control

**Status:** DEFINED / NOT IMPLEMENTED  
**Definition baseline:** frozen IM-20 Whole-Block @ `58e55466e3c1ccc60342c5bc82747d47e7629db0`.

IM-21 is the next defined Player-integration capability after frozen IM-20. It integrates existing authoritative gameplay/read-model capabilities into the S2D-04 responsive Player UI and does not create new gameplay ownership.

Defined substeps:
- **IM-21A – Responsive Game Shell / HUD Integration**
- **IM-21B – Selection / Context Panel Integration**
- **IM-21C – Build Catalog / Placement Player UX Integration**
- **IM-21D – Work Area Player UX Integration**
- **IM-21E – Economy / Settlement Overview Integration**
- **IM-21F – System Menu / Save / Help / Guidance Integration**
- **IM-21G – Responsive V1 Player Interaction / Device Verification**

Binding implementation boundaries:
- smartphone/iPhone is the minimum/reference layout; iPad and desktop retain identical gameplay semantics;
- world + compact HUD + sparse world feedback remain the normal persistent surface;
- on iPhone only one primary working surface is active at a time in addition to that base surface: Context Panel, Build Catalog, Placement controls, Work Area editor, Economy Overview or System Menu;
- Guidance may overlay as explanation/highlight only and may not perform gameplay actions;
- existing owners remain authoritative; UI consumes Query/Read Models and sends Commands to owners;
- temporary Placement/WorkArea previews remain UI state and do not become authoritative SaveGame state;
- VAL-018 completion requires iPhone, iPad and desktop verification and no core action may depend on hover, right-click, keyboard or browser page zoom.

### Inspector / Developer Diagnostics hard boundary

**Inspector / Developer Diagnostics UI = NON-PLAYER / NON-IM-21.** IM-21 must not block a later Development-only Inspector entry, but does not implement the Inspector and does not freeze whether that later entry uses a route, Development menu or both. Production exposes no Inspector. Only a minimal read-only Error / Build / Support projection is permitted in Production.

Explicit non-scope includes new gameplay authority, Inspector rebuild, multi-slot SaveGame, autosave, cloud save, multiplayer, campaign/epochs, new Economy systems and legacy-`main` gameplay/UI reuse as authority.

### Gate discipline

This documentation defines IM-21 only. It authorizes **no development branch and no IM-21A implementation**. The next permissible step is a separate **IM-21 Definition Documentation Verification / Scope Gate** against frozen IM-20. Only a later separate authorization may permit creation of the IM-21 Whole-Block development branch or implementation work.
