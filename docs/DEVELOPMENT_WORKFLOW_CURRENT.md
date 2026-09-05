# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current development branch: `feature/cr-23-person-resident-housing-foundation`
- Current immutable predecessor: **CR-22 – Building Ownership / Lifecycle Foundation**
- Frozen predecessor branch: `frozen/cr-22c-building-registration-world-ownership-integration`
- Frozen predecessor SHA: `d507bf0797b8b4be4090cbca0d74cf20760500b5`
- Current system block: **CR-23 – Person / Resident / Housing Foundation**
- CR-23A status: **PASS / FROZEN / 0 BLOCKER**
- CR-23B status: **PASS / FROZEN / 0 BLOCKER**
- Next sub-block: **CR-23C – Housing Capacity & Occupancy Foundation — PLAN NEXT**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | CR-23A – Person / Resident Identity Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 3 | CR-23B – Resident ↔ Home Assignment Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 4 | CR-23C – Housing Capacity & Occupancy Foundation | NEXT / PLAN FIRST | Define scope before code |

## 3. Frozen CR-23A contract

CR-23A keeps the stable Person / Resident identity on the existing `unit:` ID basis and remains immutable.

## 4. Frozen CR-23B contract

CR-23B adds only the explicit Person → Home Building relationship:

- `personId`: stable `unit:` ID,
- `state`: `UNASSIGNED` or `ASSIGNED`,
- `homeBuildingId`: exactly `null` for `UNASSIGNED`, exactly one stable `building:` ID for `ASSIGNED`,
- immutable and deterministic contract values.

The Person references its Home. CR-23B does not add a Building-side resident list or counter, so there is still only one source of truth for the relationship.

CR-23B explicitly does **not** add:

- housing capability/type checks,
- Housing Capacity,
- Occupancy / resident counts / Building resident lists,
- Household / parents / children / population growth,
- birth timers,
- profession / workforce / job assignment,
- tools / clothing,
- production / BuildingStock / storage,
- construction,
- transport,
- movement / position / route,
- UI / rendering.

## 5. Freeze evidence

CR-23B completion/freeze gate has passed:

- CR-22 frozen baseline regression: PASS,
- CR-23A frozen identity regression: PASS,
- CR-23B home-assignment regression: PASS,
- UNASSIGNED / ASSIGNED consistency: PASS,
- stable personId / homeBuildingId kinds: PASS,
- immutable / deterministic values: PASS,
- Capacity / Occupancy / Population scope boundary: PASS,
- GitHub CI `Run CR-23B completion/freeze gate + CR-23A frozen regression`: SUCCESS.

## 6. Next allowed action

Do not implement CR-23C immediately.

First define **CR-23C – Housing Capacity & Occupancy Foundation** on top of frozen CR-23A and CR-23B. CR-23C may establish the housing capability/capacity and deterministic occupancy consistency, but must still remain separate from Household/family, population growth, BirthTimer, profession/workforce, production and construction unless explicitly planned in a later block.

After CR-23C scope is accepted, continue on the same whole-CR branch `feature/cr-23-person-resident-housing-foundation` from the exact CR-23B frozen baseline.

## 7. Source-of-truth / branch rules

- `main` is historical functional/visual reference only.
- CR-22, CR-23A and CR-23B remain immutable predecessor baselines.
- CR-23 continues on the same whole-system feature branch.
- CR-23B frozen branch is an immutable sub-block evidence point.
- Keep browser/device text, docs, CI naming and actual branch state synchronized.
- Do not silently expand CR-23C into population growth or workforce behavior.

---

**Updated:** 2026-09-05 after CR-23B completion/freeze gate PASS.
