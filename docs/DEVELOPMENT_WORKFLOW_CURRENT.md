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
- **IM-15C – World Diagnostic Overlay Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions: DEFINED / NOT IMPLEMENTED**

## 2. Frozen predecessor line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A, IM-15B and IM-15C remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen IM-15C baseline for IM-15D: `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

## 3. IM-15 sequence

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**
2. **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**
3. **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — DEFINED / NOT IMPLEMENTED**
   - explicit allowlist-based diagnostic action boundary between Inspector and existing Runtime,
   - controlled `START` and `PAUSE` through existing Runtime lifecycle methods,
   - deterministic `SINGLE STEP` only while Runtime is not actively running and only with authoritative fixed `stepMs`,
   - explicit registered reproducible diagnostic scenario load/reset, initially `BASELINE_MINIWORLD`,
   - frozen action-result projection for observation,
   - no arbitrary method exposure or direct Domain/Store mutation.
5. **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**

## 4. Binding IM-15 architectural boundary

- IM-15 owns no new gameplay/domain/persistence truth.
- Inspector reads existing authoritative owners and visualizes their state.
- Inspector actions are allowed only through explicit diagnostic/test/runtime boundaries.
- Automated tests remain test code.
- Legacy Inspector/debug architecture from `main` must not be imported; `main` remains historical reference only.

## 5. Frozen predecessor regression boundary

IM-15D must preserve frozen IM-15A/B/C and IM-14 ownership:

- read-only Inspector observation remains IM-15A,
- structured diagnostics remain IM-15B,
- world diagnostic overlays remain IM-15C,
- selection/hit-test remains IM-14D,
- pointer/touch/camera remains IM-14E,
- Domain/Transport owners remain authoritative.

## 6. IM-15D defined action contract

IM-15D is not a free debug editor. It is a controlled action adapter with an explicit action allowlist.

### Allowed first action set

- **START:** invoke the existing Runtime lifecycle start boundary only when its existing preconditions allow it.
- **PAUSE:** invoke the existing Runtime lifecycle pause boundary only when applicable.
- **SINGLE STEP:** invoke exactly one Scheduler step using the authoritative configured fixed `stepMs`; allowed only when Runtime is not actively `RUNNING`; no caller-provided `dtMs`.
- **RESET/LOAD `BASELINE_MINIWORLD`:** invoke only an explicitly registered deterministic diagnostic scenario factory/reset boundary that reproduces the known baseline miniworld composition.

### Action adapter requirements

- UI never receives arbitrary `window.CleanRuntime`, Domain Store or Scheduler method execution.
- Every exposed action must exist in an explicit IM-15D allowlist/registry.
- Preconditions are checked before execution.
- Action results are immutable/frozen and expose only diagnostic result data such as `actionId`, `scenarioId`, previous/current Runtime state, success/failure and controlled error information.
- IM-15A/B/C may observe resulting authoritative state/result data but do not become mutation owners.

## 7. Runtime / Scheduler boundary

The existing Runtime already owns lifecycle transitions through `start()` and `pause()`.

The existing Scheduler already owns `step(dtMs = configuredStepMs)`, but IM-15D must not expose arbitrary `dtMs`. The diagnostic adapter must use the authoritative configured fixed step only.

For `SINGLE STEP`, the contract is:

- Runtime must not be `RUNNING`,
- exactly one configured fixed step is executed,
- no loop or fast-forward,
- Runtime lifecycle state remains unchanged by the diagnostic single-step action itself.

`STOP` is deliberately excluded from the first IM-15D action set because the existing Runtime enters `STOPPED` and has no corresponding clean restart transition from `STOPPED` through `start()`.

## 8. Diagnostic scenario boundary

The first defined registered scenario is **`BASELINE_MINIWORLD`**.

It represents the already established deterministic browser miniworld composition, including its existing world/map/domain/runtime evidence. IM-15D may load/reset this scenario only through an explicit deterministic scenario boundary.

The scenario action must not become a generic state editor. It must not expose editable Gold, Population, Building, Person, Stock, Path, Transport or other Domain values.

## 9. Explicit IM-15D exclusions

Not part of IM-15D:

- direct Domain/Store CRUD controls,
- arbitrary Runtime/Scheduler method invocation,
- caller-provided tick/step duration,
- fast-forward, repeated stepping loops or unbounded simulation execution,
- `STOP` in the first action set,
- arbitrary Gold/Population/Building/Person/Stock/Path/Transport edits,
- automatic repair/correction of gameplay state,
- SaveGame manipulation,
- new gameplay/domain/transport/reservation/deadlock/path/wear rules,
- new selection/pointer/touch/camera semantics,
- long-running metrics, heatmaps, throughput histories or balancing — IM-15E.

## 10. Frozen IM-15C evidence remains binding

Frozen IM-15C head: `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

Its PASS / 0 BLOCKER regression, CI/Pages, read-only ownership and real iPhone camera-synchronous overlay evidence remain predecessor requirements for IM-15D and must not regress.

## 11. Current gate

IM-15D is **DEFINED / NOT IMPLEMENTED** against frozen IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

No IM-15D implementation has been authorized or performed in this documentation step.

The next permissible action is exclusively the separate **IM-15D Definition/Implementation Gate**: inspect the current repository to determine the exact controlled action adapter, scenario factory/reset boundary, result contract and UI integration surface that can be implemented without violating existing Runtime/Domain ownership. No IM-15D code implementation is authorized in the same step.

## 12. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15D Controlled Guidance / Diagnostic Scenario Actions documented as DEFINED / NOT IMPLEMENTED against frozen IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`. No IM-15D implementation in this step.
