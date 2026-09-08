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
- **IM-15B – Structured Runtime Diagnostics Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**

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
   - no runtime/domain/persistence mutation.

2. **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**
   - structured read-only diagnostics from existing authoritative runtime owners/read boundaries,
   - visible/build identity `IM-15B-STRUCTURED-RUNTIME-DIAGNOSTICS-PROJECTION`,
   - no new Domain API, Runtime ownership or mutation path introduced.

3. **IM-15C – World Diagnostic Overlay Foundation — PLANNED / NOT IMPLEMENTED**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**
5. **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no new gameplay/domain/persistence truth.
- Inspector reads existing authoritative owners and visualizes their state.
- Later Inspector actions are allowed only through explicit diagnostic/test/runtime boundaries.
- Automated tests remain test code.
- Legacy Inspector/debug architecture from `main` must not be imported; `main` remains historical reference only.

## 5. Frozen IM-15A boundary

Frozen IM-15A remains behaviorally preserved:

- separate Inspector shell,
- Runtime/World basics,
- Population,
- Gold,
- read-only Building/Person selection reuse from IM-14D,
- responsive presentation.

`src/ui/inspector-read-only-runtime-observation.js` remained unchanged by IM-15B.

## 6. Frozen IM-15B implementation boundary

Implemented structured read-only groups:

- **Buildings:** existing `domains.buildings` records; identity, lifecycle, position and only already present Stock/Construction/Production fields,
- **Persons:** existing `domains.units` records; identity/position and only already present Resident/Workforce/Carrier fields,
- **Jobs:** existing `domains.jobs` records,
- **Resources:** existing `domains.resources` records,
- **Movement / Navigation:** existing `carrierMovementEvidence`, `runtimeNavigationValidations` and `reachabilityEvidence` only,
- **Path Classification:** existing `pathClassification.entries()` only.

Unavailable groups remain explicitly unavailable rather than synthesized:

- live occupancy/reservations/queues/deadlocks,
- complete live route registry,
- live wear state.

IM-15B creates no new Domain API and does not modify Domain or Transport owners.

## 7. IM-15B implementation surfaces

Relative to frozen IM-15A, IM-15B is limited to:

- `src/ui/inspector-structured-runtime-diagnostics.js`,
- `index.html`,
- `src/ui/app.css`,
- `src/runtime/config.js`,
- `src/main.js` only for the RuntimeConfig cache-identity import `./runtime/config.js?v=im15b-1`,
- this workflow file and `docs/ROADMAP_CURRENT.md`.

No gameplay/runtime semantics in `src/main.js` were changed. No IM-15C world overlay, IM-15D action boundary or IM-15E metrics/balancing logic is present.

## 8. IM-15B Completion / Regression / Freeze Gate

Corrected implementation head before final gate-status synchronization: `ac6a202f8f1a70343c4064b810c73c15c8f5fd8e`.

Regression against frozen IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`:

- branch: **11 commits ahead / 0 behind**,
- changed surface: exactly seven permitted files (`docs/DEVELOPMENT_WORKFLOW_CURRENT.md`, `docs/ROADMAP_CURRENT.md`, `index.html`, `src/main.js`, `src/runtime/config.js`, `src/ui/app.css`, `src/ui/inspector-structured-runtime-diagnostics.js`),
- frozen IM-15A projector remained unchanged,
- frozen IM-14 Player UI/HUD/Selection/Pointer/Camera ownership remained unchanged,
- no IM-15C/IM-15D/IM-15E functionality introduced.

Read-only ownership verification:

- diagnostics use existing `DomainStore.snapshot()` data, existing movement/navigation evidence and `pathClassification.entries()`,
- values are cloned/frozen before projection,
- controller only refreshes projection and renders DOM,
- no Domain/Transport mutation method is called.

Technical evidence:

- CI Baseline run `34210936764` on code-corrected head `be297c924876063075bedfe6982f86f3ad1d0308`: **SUCCESS**,
- subsequent head `ac6a202f8f1a70343c4064b810c73c15c8f5fd8e` differs only by the Roadmap control-state commit,
- Pages build/deployment run `34210971362` on `ac6a202f8f1a70343c4064b810c73c15c8f5fd8e`: **SUCCESS**.

Real-device evidence:

- iPhone / Safari, 2026-09-08 11:35 local,
- Runtime `READY`, Population `3`, Gold `3`, World `CR-32A World-backed Path Classification Contract Miniworld · 8×6 · Zelle 1`,
- Inspector `READ ONLY`,
- Build visibly corrected to `IM-15B-STRUCTURED-RUNTIME-DIAGNOSTICS-PROJECTION`,
- Structured Diagnostics visibly active with `3 Buildings · 3 Persons · 0 Jobs · 0 Resources · 2 Paths`,
- frozen selection/context behavior remained operational (`Keine Auswahl` / `Weltobjekt antippen`).

Former stale IM-15A build-identity blocker is resolved.

**Gate result: IM-15B = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 9. Current gate

IM-15B is frozen. IM-15 as a whole remains **IN PROGRESS / NOT FROZEN**.

The next permissible action is exclusively the separate **reconciliation/definition of IM-15C – World Diagnostic Overlay Foundation** against the frozen IM-15B stand. No IM-15C implementation is authorized in the same step as that definition.

## 10. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER after successful read-only regression, CI/Pages and corrected real iPhone/Safari build-identity evidence. IM-15 remains IN PROGRESS / NOT FROZEN; next permissible action is IM-15C reconciliation/definition only.
