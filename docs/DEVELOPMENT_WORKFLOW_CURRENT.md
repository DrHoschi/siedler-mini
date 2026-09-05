# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current project-control branch: `maintenance/post-cr22-project-control-sync`
- Current immutable gameplay baseline: `frozen/cr-22c-building-registration-world-ownership-integration`
- Frozen baseline SHA: `d507bf0797b8b4be4090cbca0d74cf20760500b5`
- Current completed system block: **CR-22 – Building Ownership / Lifecycle Foundation**
- CR-22A: **PASS / FROZEN / 0 BLOCKER**
- CR-22B: **PASS / FROZEN / 0 BLOCKER**
- CR-22C: **PASS / FROZEN / 0 BLOCKER**
- Next roadmap capability: **Person / Resident / Housing foundation** — IM-05 + IM-10
- No next feature CR is created until this synchronization is accepted.

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-21 – Reservation-Controlled Traffic Execution Foundation | FROZEN | Regression only |
| 2 | Pre-CR22 Repository Cleanup / Roadmap Integration | COMPLETE | Historical evidence / regression only |
| 3 | CR-22A – Building Identity & Ownership Contract | FROZEN / PASS / 0 BLOCKER | Regression only |
| 4 | CR-22B – Building Lifecycle State Contract | FROZEN / PASS / 0 BLOCKER | Regression only |
| 5 | CR-22C – Building Registration & World Ownership Integration | FROZEN / PASS / 0 BLOCKER | Regression only |
| 6 | CR-22 – Building Ownership / Lifecycle Foundation | COMPLETE / FROZEN | Immutable baseline unless explicitly reopened |
| 7 | Post-CR22 project-control synchronization | CURRENT | Synchronize roadmap/workflow only |
| 8 | Person / Resident / Housing foundation | NEXT AFTER SYNC | Define next CR scope before code |

## 3. Frozen CR-22 contract

CR-22 establishes the Building as a real modular gameplay owner:

- stable `BuildingId`,
- building-definition reference,
- stable Building owner anchor,
- existential lifecycle `EXISTS -> RETIRED`, with `RETIRED` terminal,
- registration in the existing Building DomainStore,
- deterministic lookup,
- duplicate-ID rejection,
- controlled removal without automatic lifecycle transition.

Frozen exclusions:

- no Residents / Household / Population state,
- no Workforce / Profession / tools / clothing,
- no Construction lifecycle or build progress,
- no Production,
- no BuildingStock / Storage / Inventory,
- no transport/job generation from Buildings,
- no UI/render integration.

These exclusions are intentional extension points for later CRs, not missing CR-22 work.

## 4. Next required action after synchronization

The restored authoritative roadmap places **Person / Resident / Housing foundation** immediately after Building ownership/lifecycle.

Do not jump directly into implementation. First define the next whole CR system block and split it into small sub-contracts.

The planning area may cover, in dependency order:

- stable Person / Resident identity,
- explicit Home / Building relationship using the frozen CR-22 Building owner,
- housing capacity / occupancy contract,
- controlled resident lifecycle / creation rules,
- compatibility with later founder roster, specialists and workforce.

Do not prematurely include:

- profession/job assignment,
- worker execution,
- tool/clothing acquisition,
- production,
- construction execution,
- BuildingStock,
- transport integration,
- detailed birth/child simulation or balancing timers,
- UI/rendering.

## 5. Source-of-truth / branch rules

- `main` is historical functional/visual reference only.
- The frozen CR-22C branch is immutable gameplay baseline.
- This maintenance branch changes project-control documentation only.
- After synchronization acceptance, create the next whole CR branch from the accepted synchronized baseline.
- Prefer one branch per overall CR; A/B/C normally proceed sequentially on that branch unless a concrete risk requires a separate branch.
- Before every write verify repository, target branch, actual HEAD, frozen predecessor, scope, tests and CI.
- Keep browser/device text, docs, CI naming and actual branch state synchronized.

## 6. Known process traps

- Do not infer the active CR from chat history.
- Do not leave `DEVELOPMENT_WORKFLOW_CURRENT.md` or `ROADMAP_CURRENT.md` behind the actual code state.
- Do not silently reopen a frozen CR.
- Do not treat old `main` or legacy docs as current architecture.
- Do not invent a future CR title from memory; derive its capability from `ROADMAP_CURRENT.md`, then define its scope explicitly.
- Preserve visual/art assets unless an item is explicitly verified disposable.

---

**Updated:** 2026-09-05 after formal CR-22A/B/C freeze. Current next capability: **Person / Resident / Housing foundation (IM-05 + IM-10)**.
