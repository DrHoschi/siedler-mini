# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT ROADMAP AUDIT – Pre-CR22  
**Repository:** `DrHoschi/siedler-mini`  
**Current branch:** `maintenance/pre-cr22-repository-cleanup`  
**Frozen gameplay baseline:** **CR-21 – Reservation-Controlled Traffic Execution Foundation**  
**CR-21 frozen SHA:** `4cb7261dc2325767070177a68f951df69b7523fd`  
**Purpose:** Reconcile the frozen S2D-06 IM roadmap with the actual modular CR-00…CR-21 implementation before branch cleanup and before CR-22 planning.

---

## 1. Authority and interpretation

This file is the **current roadmap reconciliation**. It does not rewrite or unfreeze `S2D-06_ROADMAP_VALIDATION.md`.

The old IM roadmap remains the frozen product/migration planning reference. The current CR line is the actual modular implementation evidence.

Therefore:

- IM numbers describe **migration/product capability areas**.
- CR numbers describe the **actual modular system blocks** built in the clean runtime.
- IM and CR are not a 1:1 numbering scheme.
- An old IM branch is not automatically integrated merely because a newer CR covers related behavior.
- A CR foundation may satisfy only part of an IM objective.
- Old IM/SA/S2D branches may be deleted only after their unique content and continuing reference value are checked.

Status vocabulary in this reconciliation:

- `SUPERSEDED / FOUNDATION REPLACED` – old migration implementation path is no longer the active architecture; useful requirements may remain.
- `PARTIAL` – meaningful current implementation exists, but the full IM exit condition is not yet satisfied.
- `FOUNDATION COMPLETE` – the reusable technical foundation required by the IM area is present and frozen, while later game integration may still be open.
- `OPEN` – the intended capability is not yet implemented in the current modular runtime at the required product level.
- `LATER` – deliberately deferred until prerequisite game systems exist.

---

## 2. Current frozen CR line – what is already built

The current modular history has built and tested the following system progression:

- **CR-00 – Clean Runtime Foundation**
- **CR-01 – Stable World / Domain Foundation**
  - stable IDs / WorldStore
  - map structure
  - core domain stores
- **CR-02 – Resource Foundation**
  - resource state
  - reservation claims
  - resource demand contract
- **CR-03 – Resource Matching & Assignment Foundation**
  - deterministic resource matching
  - reservation assignment
  - assignment consistency
- **CR-04 – Transport Job Foundation**
  - transport job contract
  - transport job creation
  - transport job lifecycle
- **CR-05 – Carrier Assignment Foundation**
  - carrier contract / availability
  - carrier-job assignment
  - carrier release / recovery
- **CR-06 – Transport Execution Foundation**
  - transport execution state contract
  - pickup execution
  - delivery execution
- **CR-07 – Delivery Settlement Foundation**
  - delivery settlement contract
  - resource claim / demand settlement
  - transport completion / carrier release
- **CR-08 – Transport Movement Foundation**
  - carrier movement contract
  - direct-target movement
  - movement / transport integration
- **CR-09 – Path / Route Foundation**
  - route contract
  - deterministic grid pathfinding
  - movement / route integration
- **CR-10 – Traversal Cost Foundation**
  - traversal cost contract
  - deterministic cost-aware pathfinding
  - traversal type cost resolution
- **CR-11 – Road Preference Foundation**
  - road preference cost policy
  - traversal classification source
  - road-preferred routing integration
- **CR-12 – Traversability / Obstacle Foundation**
  - traversability contract
  - blocked-cell source
  - obstacle-aware routing integration
- **CR-13 – Route Validity / Controlled Reroute Foundation**
  - route validity contract
  - route validity evaluation
  - controlled reroute integration
- **CR-14 – Cell Occupancy / Entry Arbitration Foundation**
  - cell occupancy contract
  - deterministic entry arbitration
  - occupancy-aware movement integration
- **CR-15 – Carrier Waiting / Fairness Foundation**
  - carrier waiting state contract
  - deterministic wait-priority / fairness policy
  - waiting-entry integration
- **CR-16 – Traffic Deadlock Foundation**
  - wait dependency contract
  - deterministic deadlock detection
  - deadlock resolution policy
- **CR-17 – Yield / Recovery Foundation**
  - yield recovery intent contract
  - deterministic recovery target selection
  - controlled recovery movement integration
- **CR-18 – Route Continuation / Rejoin Foundation**
  - route continuation state contract
  - deterministic route rejoin decision
  - controlled post-recovery reroute integration
- **CR-19 – Cell Reservation Foundation**
  - cell reservation contract
  - deterministic reservation arbitration
  - reservation movement integration
- **CR-20 – Reservation Lifecycle Foundation**
  - reservation lifecycle state contract
  - deterministic reservation expiry
  - reservation lifecycle / traffic integration
- **CR-21 – Reservation-Controlled Traffic Execution Foundation – FROZEN / PASS / 0 BLOCKER**
  - **CR-21A – Next Cell Reservation Intent Contract**
  - **CR-21B – Deterministic Reservation Execution Cycle**
  - **CR-21C – Reservation-Controlled Step Movement Integration**

The frozen CR-21 chain is:

`Next-Cell Intent → REQUESTED Reservation → frozen arbitration → GRANTED / WAITING → one reserved-cell entry → CONSUMED → blocking release → readiness for a later next intent`

This is now immutable baseline behavior unless explicitly reopened.

---

## 3. IM-00…IM-17 reconciliation against the current modular runtime

| IM | Original roadmap capability | Current CR / code evidence | Current status | Still required |
|---|---|---|---|---|
| **IM-00 – Baseline & Safety Harness** | reproducible baseline, smoke checks, diagnostics | CR-00 clean runtime, CR self-tests/freeze gates, CI and cleanup gates provide the new safety harness; old `feature/im-00-baseline-safety-harness` is diverged from the CR line | **SUPERSEDED / PARTIAL** | retain current regression harness; establish useful runtime/performance diagnostic baseline later for Inspector/balancing rather than revive old monolith harness |
| **IM-01 – Public Owner Boundaries & Runtime Contracts** | stable read/command/event boundaries for all gameplay owners | `WorldStore`, `DomainStore`, `CoreDomainStores`, resource modules and transport contracts exist | **PARTIAL** | owner contracts still needed for real buildings, persons/housing, construction, production/building stock, economy, savegame and later UI read models |
| **IM-02 – Central Scheduler & Lifecycle Foundation** | scheduler, explicit boot/pause/resume/shutdown lifecycle | clean runtime contains `runtime.js`, `scheduler.js`, `event-bus.js` | **PARTIAL** | connect future simulation systems to one lifecycle/scheduler model and verify no duplicate registrations/loops as game integration grows |
| **IM-03 – Runtime Validation Foundation** | cross-owner invariant validation | extensive CR tests/freeze gates validate isolated systems and frozen regressions | **PARTIAL** | central runtime invariant/diagnostic layer still needed for integrated game state; expose results later through Inspector |
| **IM-04 – BuildingStore Ownership Consolidation** | one authoritative building collection | generic `CoreDomainStores.buildings` exists | **PARTIAL FOUNDATION** | actual building lifecycle/placement/state owner, building access/read model and renderer/UI integration still required |
| **IM-05 – Unit Identity, Housing & Start Roster Foundation** | stable persons, homes, specialists, resident helpers, founder roster | generic `CoreDomainStores.units` plus Carrier contract exists | **OPEN / SMALL FOUNDATION ONLY** | real Person/Resident model, Home relationship, capabilities/specialists, founder group, housing capacity and resident lifecycle |
| **IM-06 – JobEngine / Assignment Contract Migration** | real needs separated from concrete unit assignments | CR-03 resource assignment + CR-04 jobs + CR-05 carrier assignment + execution lifecycle | **FOUNDATION COMPLETE FOR TRANSPORT / PARTIAL FOR GAME JOBS** | general workforce/job eligibility, reachability, specialist/resident assignment and recovery across construction/production |
| **IM-07 – ConstructionSystem Migration** | material demand, real builder arrival, build lifecycle, no overdelivery | resource demand/transport foundations can support it, but no current modular construction owner | **OPEN** | implement construction owner and `WAIT_MATERIAL → WAIT_BUILDER → BUILDING → COMPLETE`, builder arrival and material settlement integration |
| **IM-08 – BuildingStock & ProductionSystem Migration** | local physical production stock, workers, work areas, pause semantics | resource and physical transport foundations exist; no current modular production/building-stock system | **OPEN** | BuildingStock + Production owners, real worker execution, wood/stone/fish/meat/pelt production, pause semantics, physical pickup source |
| **IM-09 – Logistics & Reservation Migration** | physical transport need, reservation, pickup, delivery, recovery, no duplication/overdelivery | CR-02…CR-21 implement a broad deterministic logistics/movement/traffic foundation | **FOUNDATION COMPLETE / PRODUCT INTEGRATION PARTIAL** | connect frozen logistics foundation to real building stock, construction, production and game loop; run end-to-end goods ownership checks |
| **IM-10 – Housing / Population / Gold Integration** | real residents, derived population, controlled housing, economy owner | no dedicated current modular housing/economy system | **OPEN** | housing owner, population derivation, founder migration, resident creation rules, gold/economy owner |
| **IM-11 – NavigationService Consolidation** | access/docking, reachability, path requests, caching/backoff, no hot loop | CR-09…CR-21 provide pathfinding, costs, obstacles, reroute, occupancy, waiting, deadlock, recovery and reservations | **FOUNDATION STRONGLY ADVANCED / PARTIAL** | consolidate game-facing NavigationService/API, building access/docking and integrated reachability/backoff/performance checks |
| **IM-12 – Path/Wear System Migration** | aggregated wear state, dirty regions, decay and cached rendering | road preference exists, but no current modular wear/path-visual system | **OPEN** | implement movement-derived wear state, saveable decay and visual cache/bake once real visible movement loop is integrated |
| **IM-13 – SaveGame Owner Snapshot & Continue Reconstruction** | owner snapshots, reference-safe restore, single registration after continue | no current modular SaveGame owner/restore chain in `src/**` | **OPEN** | build snapshot/restore only after primary game owners are established; test New Game vs Continue equivalence |
| **IM-14 – UI / Mobile Runtime Integration** | real HUD, build catalog, placement, panels, economy overview, touch-first interaction | current `src/ui` is only a minimal CSS shell; renderer/runtime are still development-oriented | **OPEN** | build actual visible game scene and mobile-first owner-backed UI after core owners are integrated |
| **IM-15 – Guidance & Inspector Integration** | event-driven guidance plus read/command Inspector | old Inspector was removed from active architecture during cleanup; product requirements remain | **LATER / OPEN** | rebuild Inspector against public snapshots/commands; include simulation metrics, visual diagnostic views, CR/invariant status and balancing controls; Inspector must never become gameplay owner |
| **IM-16 – Legacy Guard Removal & Architecture Closure** | remove old patches/shims after target owners exist | Pre-CR22 file/architecture cleanup removed active old monolith runtime from modular baseline; docs cleanup passed | **PARTIAL – MAJOR CLEANUP DONE** | finish branch audit/deletion only after unique-content classification; later remove any temporary modular compatibility/test scaffolding when no longer needed |
| **IM-17 – V1 Core End-to-End Validation** | complete playable economy Golden Path | no integrated V1 economy/game scene yet | **OPEN** | execute only after buildings, residents, production, construction, logistics integration, save/continue and UI are in place |

### Summary

The CR-00…CR-21 program has **not** simply progressed beyond IM-17. Instead it has deeply implemented the infrastructure that mainly supports:

- IM-01 foundations,
- IM-02 foundations,
- IM-03 testability,
- IM-06 transport-job assignment,
- IM-09 logistics/reservations,
- IM-11 navigation/traffic.

The largest product-level gaps remain:

- buildings,
- persons / housing / workforce,
- construction,
- production / local BuildingStock,
- housing / population / gold,
- path wear visuals,
- save / continue,
- real UI / mobile integration,
- Inspector / balancing diagnostics,
- V1 end-to-end validation.

---

## 4. Updated implementation direction after cleanup

CR numbering now continues the real modular implementation. IM remains the higher-level capability map.

Do **not** restart old IM branches. Instead every future CR should explicitly state which IM objectives it advances.

### Phase A – Finish current Pre-CR22 cleanup and audit

Before CR-22:

1. complete IM↔CR roadmap reconciliation – this document,
2. finish unique-content classification for old branches,
3. preserve anything still needed before deleting a branch,
4. reduce branch set to intentional current/frozen/reference/infrastructure branches,
5. run final Pre-CR22 cleanup verification gate,
6. record cleaned baseline commit,
7. only then create the CR-22 system branch.

No branch is deleted merely because its name is old.

### Phase B – Bring the simulation back to a visible closed economy

The next CR sequence should prioritize the missing product owners required for the frozen S2D-00 economy chain:

`HQ → Häuser → Bewohner → Produktion → lokaler Bestand → Transport → HQ/Baustelle → Bau → Expansion`

Recommended capability order after cleanup:

1. **Building ownership / lifecycle foundation** – advances IM-01 + IM-04.
2. **Person / Resident / Housing foundation** – advances IM-05 + IM-10.
3. **Construction foundation** – advances IM-07.
4. **BuildingStock / Production foundation** – advances IM-08.
5. **Integrated workforce / job eligibility** – completes the non-transport part of IM-06.
6. **Game-facing logistics/navigation integration** – connects frozen CR-02…CR-21 to real buildings, workers and production; advances IM-09 + IM-11.
7. **Visible world/render integration** – start showing real buildings, residents, carriers, goods and routes using authoritative state.
8. **SaveGame owner snapshots / Continue** – IM-13 once owners are stable.
9. **Mobile UI runtime integration** – IM-14.
10. **Path/Wear presentation** – IM-12 when real movement is continuously visible.
11. **Guidance + Inspector / diagnostics / balancing** – IM-15.
12. **Architecture closure + V1 Golden Path** – finish IM-16 + IM-17.

The exact CR-22, CR-23, … titles must be defined one system block at a time after the cleanup gate. This roadmap determines priority and dependencies but does not falsely freeze future CR names before their scope contracts are written.

---

## 5. Inspector / visual test / balancing strategy

The Inspector is **not** pulled forward as a prerequisite for core gameplay. It becomes useful progressively as real integrated state exists.

Target role:

- read-only runtime snapshots by default,
- controlled debug commands through owner APIs,
- buildings / units / residents / workers,
- jobs / assignments / reservations,
- resource ownership and BuildingStocks,
- construction state,
- navigation / route / occupancy / waiting / deadlock / reservation state,
- scheduler / tick timings,
- renderer/performance metrics,
- event trace,
- SaveGame snapshot/restore diagnostics,
- selected balancing parameters,
- long-running simulation counters and distributions,
- visible diagnostic overlays for routes, cells, occupancy, claims, reservations, work areas and similar systems,
- presentation of automated invariant/gate results so failures are visually inspectable.

Important separation:

- automated tests remain executable test/gate code,
- the Inspector may **display their status, evidence and visual diagnostics** and may provide controlled test scenarios,
- the Inspector must not own or patch gameplay state,
- disabling the Inspector must not change simulation behavior.

This allows later balancing and simulation-data collection without contaminating the game architecture.

---

## 6. Code and branch cleanup policy tied to this roadmap

### Already verified on the Pre-CR22 maintenance branch

- old monolith runtime removed from active modular baseline,
- active runtime remains under `src/**`,
- assets preserved,
- obsolete generated root file lists removed,
- misleading old root structure documents moved to `docs/legacy/`,
- root README updated for the modular architecture,
- file/architecture cleanup gate PASS / 0 BLOCKER.

### Branch cleanup rule

Before deleting any historical branch, classify it as:

- **KEEP** – required current/frozen/deployment/reference/infrastructure purpose,
- **SAFE DELETE – CONTAINED** – branch contains no unique work outside retained history,
- **ARCHIVE/EXTRACT THEN DELETE** – unique useful planning/assets/evidence must first be retained in the cleaned line or explicit legacy archive,
- **REVIEW REQUIRED** – divergent/unknown content; no deletion yet.

Minimum retained branches during the transition:

- `main` – old-game historical reference,
- `gh-pages` – deployment,
- `frozen/cr-21-reservation-controlled-traffic-execution-foundation` – verified rollback baseline,
- `maintenance/pre-cr22-repository-cleanup` – active transition branch until final cleanup gate.

The old CR-A/B/C and freeze branches are expected to become deletion candidates after containment proof. Old patch, IM, SA, S2D and infrastructure branches require unique-content checks first.

---

## 7. Pre-CR22 exit gate

CR-22 remains locked until all are true:

1. CR-21 remains FROZEN / PASS / 0 BLOCKER.
2. Current modular runtime remains intact.
3. No old monolith runtime is active in the cleaned baseline.
4. Assets remain accounted for and protected.
5. Current documentation clearly separates active architecture from legacy/reference material.
6. This current roadmap reconciliation exists and future priorities are clear.
7. Historical branches have been classified and safely reduced.
8. Any unique useful branch content has been retained or explicitly archived before deletion.
9. Required regressions / CI are green.
10. Browser/device/visual gate status matches the cleaned baseline.
11. Resulting commit is recorded as the clean base for CR-22.

Only then:

**Pre-CR22 Repository Cleanup / Roadmap Integration Gate = PASS / 0 BLOCKER**

and CR-22 may begin.

---

**Updated:** 2026-09-04  
**Current conclusion:** CR-21 is frozen; file/architecture cleanup has passed; branch cleanup must follow a full integration/unique-content audit; future development should use CR numbers while mapping each CR back to the still-open IM capability objectives.