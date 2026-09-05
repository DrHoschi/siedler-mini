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
- Current sub-block: **CR-23A – Person / Resident Identity Contract**
- CR-23A status: **IMPLEMENTED – NOT FROZEN**
- CR-23B and CR-23C: **NOT STARTED**

## 2. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-22 – Building Ownership / Lifecycle Foundation | FROZEN / PASS / 0 BLOCKER | Regression only |
| 2 | Post-CR22 project-control synchronization | COMPLETE | Reference only |
| 3 | CR-23A – Person / Resident Identity Contract | IMPLEMENTED / NOT FROZEN | Test and review only |
| 4 | CR-23B – Resident ↔ Home Assignment Contract | LOCKED | Do not start before CR-23A freeze |
| 5 | CR-23C – Housing Capacity & Occupancy Foundation | LOCKED | Do not start before CR-23B completion |

## 3. CR-23A contract

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

## 4. Next allowed action

Do not start CR-23B yet.

First verify CR-23A through focused node test, browser/device preview, CI regression against frozen CR-22, and then run a dedicated CR-23A completion/freeze gate. Only after **PASS / 0 BLOCKER** may CR-23B begin on the same whole-CR branch.

## 5. Source-of-truth / branch rules

- `main` is historical functional/visual reference only.
- CR-22 is immutable predecessor baseline.
- CR-23 uses one whole-system feature branch; A/B/C proceed sequentially on it unless a concrete risk requires otherwise.
- Keep browser/device text, docs, CI naming and actual branch state synchronized.
- Do not silently expand CR-23A into housing or workforce behavior.

---

**Updated:** 2026-09-05 after CR-23A implementation.
