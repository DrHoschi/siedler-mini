# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-block branch: `feature/im-15-guidance-inspector`
- Whole-block branch base: frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- Current migration block: **IM-15 – Guidance / Inspector: IN PROGRESS / NOT FROZEN**
- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15B – Structured Runtime Diagnostics Projection: IMPLEMENTED / NOT FROZEN**

## 2. Frozen predecessor line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen IM-15A baseline for IM-15B: `f0eb70e1501d19c60b264699dde2a2ed05a5959b`.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
   - separate Inspector shell alongside Player UI ownership,
   - read-only projection from existing authoritative runtime owners,
   - Runtime/World basics, Population, Gold and selected Building/Person identity,
   - IM-14D Selection reused read-only; no new selection semantics,
   - visible/build identity `IM-15A-INSPECTOR-SHELL-READ-ONLY-RUNTIME-OBSERVATION`,
   - no runtime/domain/persistence mutation.

2. **IM-15B – Structured Runtime Diagnostics Projection — IMPLEMENTED / NOT FROZEN**
   - extends the frozen IM-15A Inspector with a separate structured read-only diagnostics projection,
   - reads only existing authoritative runtime owners/read boundaries,
   - visible/build identity `IM-15B-STRUCTURED-RUNTIME-DIAGNOSTICS-PROJECTION`,
   - no new Domain API, Runtime ownership or mutation path introduced.

3. **IM-15C – World Diagnostic Overlay Foundation — PLANNED / NOT IMPLEMENTED**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**
5. **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no new gameplay/domain/persistence truth.
- Inspector reads existing authoritative owners and visualizes their state.
- Later Inspector actions are allowed only through explicit diagnostic/test/runtime boundaries.
- Automated tests remain test code; Inspector may later display results or trigger reproducible scenarios but does not replace test ownership.
- Legacy Inspector/debug architecture from `main` must not be imported; `main` remains historical reference only.

## 5. Frozen IM-15A boundary

Frozen IM-15A remains behaviorally preserved:

- separate Inspector shell,
- Runtime/World basics,
- Population,
- Gold,
- read-only Building/Person selection reuse from IM-14D,
- responsive presentation.

`src/ui/inspector-read-only-runtime-observation.js` remains unchanged by IM-15B.

## 6. IM-15B implemented read-only scope

The Definition/Implementation Gate reduced implementation to read boundaries already available in the live runtime composition.

Implemented structured groups:

- **Buildings:** `domains.buildings.snapshot()` / existing Building records; project identity, lifecycle, position and only already present stock/construction/production fields,
- **Persons:** `domains.units.snapshot()` / existing Person records; project identity/position and only already present resident/workforce/carrier fields,
- **Jobs:** `domains.jobs.snapshot()`; existing TransportJob records only,
- **Resources:** `domains.resources.snapshot()`; existing Resource records only,
- **Movement / Navigation:** existing `carrierMovementEvidence`, `runtimeNavigationValidations` and `reachabilityEvidence` only; no new route calculation,
- **Path Classification:** existing `pathClassification.entries()` only.

Explicit unavailable/currently omitted groups are surfaced as unavailable rather than synthesized:

- live occupancy/reservations/queues/deadlocks,
- complete live route registry,
- live wear state.

Construction/Production/Stock/Workforce detail is displayed only when it already exists inside the authoritative current Building/Person record. Missing facts render as absent/empty rather than being reconstructed.

IM-15B creates no new Domain API and does not modify `src/main.js`, Domain owners or Transport owners.

## 7. IM-15B implementation surfaces

Relative to frozen IM-15A, IM-15B implementation is limited to:

- `src/ui/inspector-structured-runtime-diagnostics.js` — new read-only structured diagnostics projector/controller,
- `index.html` — structured diagnostics sections and synchronized IM-15B visible identity/cache identity,
- `src/ui/app.css` — presentation of structured diagnostics inside the existing Inspector shell,
- `src/runtime/config.js` — synchronized IM-15B build identity,
- this workflow file and `docs/ROADMAP_CURRENT.md` — control state.

No IM-15C world overlay, IM-15D action boundary or IM-15E metrics/balancing logic is present.

## 8. Current gate

IM-15B is **IMPLEMENTED / NOT FROZEN** against frozen IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`.

The next permissible action is exclusively **IM-15B – Completion / Regression / Freeze Gate**: verify the full diff against frozen IM-15A, CI/Pages, read-only ownership, IM-15A/IM-14 regression, visible build identity and real browser/device diagnostics rendering. Freeze only at **PASS / 0 BLOCKER**.

No IM-15C implementation is authorized before IM-15B is separately frozen.

## 9. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15B Structured Runtime Diagnostics Projection IMPLEMENTED / NOT FROZEN within the reduced authoritative read-only scope. Next permissible action is IM-15B Completion / Regression / Freeze Gate only.
