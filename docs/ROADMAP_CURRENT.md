# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 RECONCILED / DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Frozen predecessor:** IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`  
**IM-15 branch:** NOT YET AUTHORIZED / NOT YET CREATED

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-14 – UI / Mobile Foundation remains COMPLETE / FROZEN / PASS / 0 BLOCKER as a whole block.**

Its frozen substeps are:

- IM-14A – Player UI Shell & Responsive Surface Contract,
- IM-14B – Unified Pointer / Touch Interaction Contract,
- IM-14C – Runtime HUD Projection,
- IM-14D – World Selection & Context Projection,
- IM-14E – Player Camera Controls Integration.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — COMPLETE / FROZEN**,
- **IM-15 – Guidance / Inspector — RECONCILED / DEFINED / NOT IMPLEMENTED**.

## 3. IM-15 reconciled capability boundary

IM-15 establishes the new modular Guidance/Inspector capability on top of frozen IM-14. It is a diagnosis, observation, visual verification, controlled simulation/testing-support and later balancing tool, but **not a gameplay owner**.

Binding rules:

- existing runtime/domain owners remain authoritative,
- Inspector projections are read-only unless a later explicitly defined controlled action boundary says otherwise,
- no second runtime truth may be created in Inspector state,
- the old `main` Inspector/debug implementation is historical functional/visual reference only and is not migrated as architecture or code,
- automatic tests remain test code; later Inspector surfaces may display their results or trigger explicitly defined reproducible scenarios,
- diagnostic overlays must remain observational and non-mutating.

## 4. Planned IM-15 decomposition

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract**  
   Establish only the modular Inspector surface and first explicit read-only observation contract against existing authoritative runtime owners. Minimal initial observation may include runtime/world identity, Population, Gold and Building/Person identity. No simulation controls, test/scenario triggering, world overlays or balancing.

2. **IM-15B – Structured Runtime Diagnostics Projection**  
   Extend read-only diagnostics across existing modular systems without duplicating ownership.

3. **IM-15C – World Diagnostic Overlay Foundation**  
   Make selected diagnostic state visually inspectable in the world without mutating gameplay/world state.

4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions**  
   Permit only explicitly defined reproducible diagnostic/test actions through controlled runtime/test boundaries; no arbitrary state editing.

5. **IM-15E – Simulation & Balancing Observation Foundation**  
   Establish suitable long-running simulation/runtime metric observation and collection; no automatic balancing and no domain-rule changes.

After A–E, one combined **IM-15 Completion / Regression / Freeze Gate** must regress the whole block against frozen IM-14. Only PASS / 0 BLOCKER may freeze IM-15.

## 5. IM-15A first planned substep

The first planned substep is now bindingly named:

**IM-15A – Inspector Shell & Read-Only Runtime Observation Contract**

Its intended implementation boundary is limited to the Inspector shell plus minimal read-only runtime observation. It explicitly excludes later IM-15B/C/D/E behavior, new gameplay/domain/persistence ownership, arbitrary runtime mutation and legacy-Inspector migration.

This definition does **not** authorize implementation.

## 6. Current gate

The reconciliation/definition of **IM-15 – Guidance / Inspector** against frozen IM-14 is complete at the control-document level.

No IM-15 whole-block branch has been created or authorized by this step, and no IM-15A implementation is authorized.

The next permissible action is exclusively a separate branch-creation decision for the IM-15 whole-block branch from frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`. Only after successful branch creation may IM-15A implementation be separately authorized.

---

**Updated:** 2026-09-08 — IM-15 Guidance / Inspector reconciled and defined against frozen IM-14; IM-15A fixed as first planned substep; branch creation remains a separate next decision.