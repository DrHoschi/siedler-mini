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
- Completed sub-block: **CR-23A – Person / Resident Identity Contract**
- CR-23A status: **PASS / FROZEN / 0 BLOCKER**
- Next sub-block: **CR-23B – Resident ↔ Home Assignment Contract — PLAN NEXT**
- CR-23C: **NOT STARTED**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | Post-CR22 project-control synchronization | COMPLETE | Reference only |
| 3 | CR-23A – Person / Resident Identity Contract | PASS / FROZEN / 0 BLOCKER | Regression only |
| 4 | CR-23B – Resident ↔ Home Assignment Contract | NEXT / PLAN FIRST | Define scope before code |
| 5 | CR-23C – Housing Capacity & Occupancy Foundation | LOCKED | Do not start before CR-23B completion |

## 3. Frozen CR-23A contract

CR-23A introduces only the stable identity of a Person / Resident:

- semantic `personId`, backed by the existing stable `unit:` ID kind,
- `kind: person-resident-identity`,
- minimal starting `existenceState: EXISTS`,
- immutable and deterministic contract values.

A person is intentionally not given a second parallel ID system. Later Resident, Carrier and specialist behavior may refer to the same physical Unit identity.

CR-23A explicitly does **not** add:

- Unit-store registration,
- Home / Building assignment,
- housing capacity or occupancy,
- Household / parents / children / population growth,
- age / gender / names,
- birth timers,
- profession / workforce / job assignment,
- tools / clothing,
- production / BuildingStock / storage,
- construction,
- transport,
- movement / position / route,
- UI / rendering.

## 4. Freeze evidence

CR-23A completion/freeze gate has passed:

- browser/device preview: **PASS / 0 BLOCKER**,
- GitHub CI `Run CR-23A completion/freeze gate + CR-22 frozen regression`: **SUCCESS**,
- corrected gate contract names verified against the actual CR-23A self-test names,
- no gameplay scope expansion introduced by the gate repair.

## 5. Next allowed action

Do not implement CR-23B immediately.

First define **CR-23B – Resident ↔ Home Assignment Contract** on top of the frozen CR-23A contract and frozen CR-22 Building owner. CR-23B must remain separate from housing capacity/occupancy, population growth, workforce, profession, production and construction.

After CR-23B scope is accepted, continue on the same whole-CR branch `feature/cr-23-person-resident-housing-foundation` from the exact CR-23A frozen baseline.

## 6. Source-of-truth / branch rules

- `main` is historical functional/visual reference only.
- CR-22 remains immutable predecessor baseline.
- CR-23 uses one whole-system feature branch; A/B/C proceed sequentially on it unless a concrete risk requires otherwise.
- CR-23A frozen branch is an immutable sub-block evidence point.
- Keep browser/device text, docs, CI naming and actual branch state synchronized.
- Do not silently expand CR-23B into housing capacity or workforce behavior.

---

**Updated:** 2026-09-05 after CR-23A completion/freeze gate PASS.
