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
- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract: IMPLEMENTED / NOT FROZEN**

## 2. Frozen predecessor line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

Frozen IM-14 substeps:

- IM-14A – Player UI Shell & Responsive Surface Contract,
- IM-14B – Unified Pointer / Touch Interaction Contract,
- IM-14C – Runtime HUD Projection,
- IM-14D – World Selection & Context Projection,
- IM-14E – Player Camera Controls Integration.

Authoritative frozen IM-14 baseline for IM-15: `053d4cc7f8befdb747ebce9afb755f286e2b0682`.

## 3. IM-15 – Guidance / Inspector sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — IMPLEMENTED / NOT FROZEN**
   - separate Inspector shell alongside, not inside, Player UI ownership,
   - read-only projection from existing authoritative runtime owners,
   - narrow observation set: Runtime/World basics, Population, Gold and selected Building/Person identity,
   - IM-14D Selection is reused read-only; no new selection semantics,
   - visible/build identity synchronized to `IM-15A-INSPECTOR-SHELL-READ-ONLY-RUNTIME-OBSERVATION`,
   - no runtime/domain/persistence mutation,
   - no simulation controls, scenario triggering, world overlays, structured system diagnostics or balancing.

2. **IM-15B – Structured Runtime Diagnostics Projection — PLANNED / NOT IMPLEMENTED**
3. **IM-15C – World Diagnostic Overlay Foundation — PLANNED / NOT IMPLEMENTED**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**
5. **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**

A separate **IM-15 Whole-Block Completion / Regression / Freeze Gate** follows only after all authorized IM-15 substeps are individually complete and frozen.

## 4. Binding IM-15 architectural boundary

- IM-15 owns no new gameplay/domain/persistence truth.
- Inspector reads existing authoritative owners and visualizes their state.
- Later Inspector actions are allowed only through explicit diagnostic/test/runtime boundaries.
- Automated tests remain test code; Inspector may later display results or trigger reproducible scenarios but does not replace test ownership.
- Legacy Inspector/debug architecture from `main` must not be imported; `main` remains historical reference only.

## 5. IM-15A implementation boundary

Implemented surfaces are limited to:

- `index.html` for the separate Inspector shell and IM-15A visible identity,
- `src/ui/app.css` for responsive Inspector-shell presentation,
- `src/ui/inspector-read-only-runtime-observation.js` for the read-only observation projection/controller,
- `src/runtime/config.js` for synchronized IM-15A build identity,
- this workflow file and `docs/ROADMAP_CURRENT.md` for control-state synchronization.

The Inspector reads only existing `CleanRuntime` sources and the existing `IM14DWorldSelectionContext`; it introduces no second gameplay truth and no mutation API.

## 6. Current gate

IM-15A is **IMPLEMENTED / NOT FROZEN**.

The next permissible action is exclusively the separate **IM-15A Completion / Regression / Freeze Gate** against frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`, including branch diff, CI/Pages evidence, visible build identity and real browser/device verification.

No IM-15B implementation is authorized before IM-15A reaches PASS / 0 BLOCKER and is frozen.

## 7. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15A implemented within the reconciled read-only shell/observation boundary. IM-15A remains NOT FROZEN; next permissible action is its separate Completion / Regression / Freeze Gate only.
