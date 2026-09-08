# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Whole-block branch: `feature/im-15-guidance-inspector`
- Whole-block base: frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15 – Guidance / Inspector: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15B – Structured Runtime Diagnostics Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15C – World Diagnostic Overlay Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15E – Simulation & Balancing Observation Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen IM-15 chain

The five frozen substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

## 3. Frozen IM-15 capability boundary

IM-15 is a modular diagnostic/observation/guidance surface over existing authoritative runtime owners.

Frozen capabilities:

1. **IM-15A:** separate Inspector shell and read-only Runtime/World/Population/Gold/Selection observation.
2. **IM-15B:** structured read-only diagnostics for existing Buildings, Persons, Jobs, Resources, Movement/Navigation and Path Classification sources.
3. **IM-15C:** camera-synchronous read-only world diagnostic overlays for existing Path/ROAD cells, Building/Person identities, Carrier movement evidence and existing Selection.
4. **IM-15D:** explicit allowlist diagnostic actions only: `START`, `PAUSE`, `SINGLE_STEP`, `RESET_BASELINE_MINIWORLD`.
5. **IM-15E:** scheduler-synchronous bounded read-only Simulation Observation with immutable samples/deltas, session separation and hard history limit 120.

## 4. Binding ownership boundary

- IM-15 owns no second gameplay/domain/persistence truth.
- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Observation surfaces are read-only except the explicitly allowlisted IM-15D action adapter.
- IM-15D exposes no arbitrary state editing, free step duration, fast-forward or generic Runtime/Store invocation.
- IM-15E metrics/deltas never feed back into gameplay, Runtime, Scheduler, Domain, Transport or persistence.
- Legacy Inspector/debug architecture from `main` was not imported.

## 5. IM-15 Whole-Block Completion / Regression / Freeze Gate

Whole-block regression against frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682` confirmed:

- pre-identity synchronization: **66 commits ahead / 0 behind**,
- after Whole-Block identity and initial freeze documentation: **72 commits ahead / 0 behind**,
- exactly **14 changed files** throughout,
- changed surfaces limited to control docs, Inspector/Diagnostics/UI, the active Runtime composition/integration in `src/main.js`, Build identity and the new diagnostic/scenario modules,
- no Domain owner source modification,
- no Transport owner source modification,
- no `src/runtime/runtime.js` modification,
- no `src/runtime/scheduler.js` modification.

Frozen A→E markers were re-verified at their exact authoritative heads before Whole-Block freeze.

## 6. Whole-Block regression evidence

The complete frozen evidence chain is binding and cumulative:

- IM-15A real iPhone evidence confirmed read-only Inspector basics and authoritative world/population/gold/selection projection.
- IM-15B real iPhone evidence confirmed structured read-only diagnostics and corrected visible Build identity.
- IM-15C real iPhone evidence confirmed PATH/ROAD, Building/Person IDs, Carrier relationship and camera-synchronous overlay behavior.
- IM-15D real iPad evidence confirmed `READY → START → RUNNING → PAUSE → PAUSED → SINGLE_STEP 100 ms → PAUSED → RESET_BASELINE_MINIWORLD` with the fixed action allowlist.
- IM-15E seven real iPad/Safari screenshots confirmed one sample per Scheduler step, pause stillness, exactly +1 sample/100 ms for SINGLE STEP, bounded history 120 and a new session after baseline reset.

Final Whole-Block technical evidence:

- CI Baseline `34274868699`: **SUCCESS**,
- Pages `34274915778` on Whole-Block documentation head `f0012a577e804684e0ece34f015492c06f375f56`: **SUCCESS**.

## 7. Whole-Block visible/build identity

Whole-Block visible/build identity:

`IM-15-GUIDANCE-INSPECTOR-WHOLE-BLOCK`

Visible verification state:

`IM-15 — COMPLETE / FROZEN / PASS / 0 BLOCKER`

The final synchronization changed only visible/gate/cache identity and added no new IM-15 capability.

## 8. Whole-Block exclusions remain binding

Not introduced by IM-15:

- arbitrary gameplay/domain editing,
- generic Runtime/Store method execution,
- unrestricted scenario authoring,
- fast-forward or repeated diagnostic stepping,
- configurable simulation speed/tick duration,
- automatic balancing/correction,
- diagnostic feedback into gameplay rules,
- SaveGame persistence of observation history,
- telemetry/upload,
- unbounded history,
- invented metrics,
- new Selection/Pointer/Touch/Camera semantics.

## 9. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The final frozen marker `frozen/im-15-guidance-inspector` must point at the final documentation HEAD produced by this closing gate sequence; its successful creation is the final mechanical marker operation, not a new development step.

No next migration block is authorized in this same step.

After the final marker exists, the next permissible action is exclusively reconciliation of the next migration block against frozen IM-15. No implementation is automatically authorized.

## 10. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15 Guidance / Inspector Whole Block COMPLETE / FROZEN / PASS / 0 BLOCKER after combined diff, frozen-chain, CI/Pages, ownership and cumulative real-device regression. No next migration block in this step.
