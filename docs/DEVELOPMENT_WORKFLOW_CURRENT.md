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

## 2. Frozen predecessor line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

Authoritative frozen IM-14 baseline for IM-15: `053d4cc7f8befdb747ebce9afb755f286e2b0682`.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
   - separate Inspector shell alongside Player UI ownership,
   - read-only projection from existing authoritative runtime owners,
   - Runtime/World basics, Population, Gold and selected Building/Person identity,
   - IM-14D Selection reused read-only; no new selection semantics,
   - visible/build identity `IM-15A-INSPECTOR-SHELL-READ-ONLY-RUNTIME-OBSERVATION`,
   - no runtime/domain/persistence mutation,
   - no simulation controls, scenario triggering, world overlays, structured system diagnostics or balancing.

2. **IM-15B – Structured Runtime Diagnostics Projection — PLANNED / NOT IMPLEMENTED**
3. **IM-15C – World Diagnostic Overlay Foundation — PLANNED / NOT IMPLEMENTED**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**
5. **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no new gameplay/domain/persistence truth.
- Inspector reads existing authoritative owners and visualizes their state.
- Later Inspector actions are allowed only through explicit diagnostic/test/runtime boundaries.
- Automated tests remain test code; Inspector may later display results or trigger reproducible scenarios but does not replace test ownership.
- Legacy Inspector/debug architecture from `main` must not be imported; `main` remains historical reference only.

## 5. IM-15A frozen implementation boundary

Frozen surfaces are limited to:

- `index.html` for the separate Inspector shell and IM-15A visible identity,
- `src/ui/app.css` for responsive Inspector-shell presentation,
- `src/ui/inspector-read-only-runtime-observation.js` for read-only projection/controller and final gate status,
- `src/runtime/config.js` for synchronized IM-15A build identity,
- this workflow file and `docs/ROADMAP_CURRENT.md` for control state.

The Inspector reads only existing `CleanRuntime` sources and the existing `IM14DWorldSelectionContext`; it introduces no second gameplay truth and no mutation API.

The World Basics projection uses only the existing authoritative `MapStructure` read boundary: `map()` and `dimensions()`.

## 6. IM-15A Completion / Regression / Freeze Gate

Final corrected implementation head before gate-status synchronization: `e38a32268d587d3398e77211f2a4a22faa1bd79b`.

Regression against frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`:

- branch remained 10 commits ahead / 0 behind before final gate-status synchronization,
- changed surface remained limited to the two control files, `index.html`, `src/runtime/config.js`, `src/ui/app.css`, and `src/ui/inspector-read-only-runtime-observation.js`,
- no IM-15B diagnostics, world overlays, scenario actions, simulation controls or balancing logic were introduced,
- frozen IM-14 Player UI/HUD/Selection/Pointer/Camera ownership was preserved.

Technical evidence on corrected head `e38a32268d587d3398e77211f2a4a22faa1bd79b`:

- CI Baseline run `34208394304`: **SUCCESS**,
- Pages build/deployment run `34208393550`: **SUCCESS**.

Real-device evidence:

- iPhone / Safari, 2026-09-08 11:12 local: Inspector shell visible and responsive; Runtime `READY`; build identity correct; Population `3`; read-only Person selection synchronized with frozen IM-14D context,
- World Basics correction visibly confirmed as `CR-32A World-backed Path Classification Contract Miniworld · 8×6 · Zelle 1`, eliminating the former `—×— · Zelle —` blocker,
- Player HUD, world rendering and selection context remained operational in the same device pass.

**Gate result: IM-15A = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 7. Current gate

IM-15A is frozen. IM-15 as a whole remains **IN PROGRESS / NOT FROZEN**.

The next permissible action is exclusively the separate **reconciliation/definition of IM-15B – Structured Runtime Diagnostics Projection** against the frozen IM-15A stand. No IM-15B implementation is authorized in the same step as that definition.

## 8. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER after corrected World Basics read-only projection, successful CI/Pages and real iPhone/Safari verification. IM-15 remains IN PROGRESS / NOT FROZEN; next permissible action is IM-15B reconciliation/definition only.
