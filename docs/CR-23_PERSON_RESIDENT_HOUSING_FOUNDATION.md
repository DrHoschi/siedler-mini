# CR-23 – Person / Resident / Housing Foundation

**Status:** PASS / COMPLETE / FROZEN / 0 BLOCKER  
**Frozen evidence branch:** `frozen/cr-23c-housing-capacity-occupancy-foundation`  
**Frozen evidence SHA:** `1a3a01c0973cd21c0375c8bc308311a774e30120`

## Scope completed

CR-23 establishes the minimal modular Person / Resident / Housing foundation on top of frozen CR-22 Building ownership:

1. **CR-23A – Person / Resident Identity Contract — FROZEN**
   - stable semantic Person/Resident identity
   - existing stable `unit:` ID basis
   - minimal current existence state `EXISTS`
2. **CR-23B – Resident ↔ Home Assignment Contract — FROZEN**
   - explicit Person → Home Building relationship
   - `UNASSIGNED` / `ASSIGNED`
   - stable `homeBuildingId`
   - no second Building-side resident-list source of truth
3. **CR-23C – Housing Capacity & Occupancy Foundation — FROZEN**
   - Building-scoped integer `capacity >= 0`
   - `occupancy` derived only from assigned Home references
   - `availableSlots = capacity - occupancy`
   - exact capacity allowed
   - overflow deterministically rejected

## Frozen system boundary

CR-23 answers:

- Who is the Person / Resident?
- Which Building is this Person's Home?
- How many housing slots does that Building offer and is assigned occupancy valid?

CR-23 does not answer:

- how new residents are generated,
- family/household/parent/child simulation,
- BirthTimer or population growth/regeneration,
- professions/workforce/jobs,
- tools/clothing,
- production or BuildingStock/storage,
- construction execution,
- transport or movement,
- rendering/UI/Inspector.

Those remain later extension points. Population/resident creation is explicitly deferred and must build on CR-23 rather than reopening it.

## Completion evidence

Dedicated completion/freeze gates for CR-23A, CR-23B and CR-23C each passed with 0 blocker. The CR-23C completion gate regressions included the complete chain back through frozen CR-22. Browser/device preview showed `PASS / 0 BLOCKER`, and GitHub CI `Run CR-23C completion/freeze gate + CR-23B frozen regression` completed successfully.

## Next dependency

Per `docs/ROADMAP_CURRENT.md`, the next capability to plan is **Construction Foundation (IM-07)**. No Construction feature code is part of this CR-23 completion record.
