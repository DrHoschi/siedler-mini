# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15D DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 and IM-14 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-15A, IM-15B and IM-15C remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen predecessor for IM-15D: frozen IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — COMPLETE / FROZEN**,
- **IM-15 – Guidance/Inspector — IN PROGRESS / NOT FROZEN**.

## 3. IM-15 reconciled capability boundary

IM-15 is a modular diagnostic/observation/guidance surface over existing authoritative runtime owners.

Binding rules:

- no new gameplay/domain/persistence truth,
- read existing authoritative owners rather than duplicate them,
- no legacy Inspector/debug architecture imported from `main`,
- actions only through explicit diagnostic/test/runtime boundaries,
- automated tests remain test-owned.

## 4. IM-15 sequence

- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — DEFINED / NOT IMPLEMENTED**,
- **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 5. Frozen predecessor boundary

IM-15A remains frozen owner of read-only Inspector observation.

IM-15B remains frozen owner of structured read-only diagnostics.

IM-15C remains frozen owner of the read-only camera-synchronous world diagnostic overlay.

IM-14D remains owner of selection/hit-test semantics and IM-14E remains owner of pointer/touch/camera semantics.

## 6. IM-15D defined capability boundary

IM-15D introduces only an explicit allowlist-based controlled diagnostic action adapter between Inspector and existing Runtime/Scheduler/scenario boundaries. It is not a free debug editor and owns no gameplay/domain/persistence truth.

Defined first action set:

- **START:** existing Runtime lifecycle start boundary only,
- **PAUSE:** existing Runtime lifecycle pause boundary only,
- **SINGLE STEP:** exactly one Scheduler step using the authoritative configured fixed `stepMs`, allowed only while Runtime is not actively `RUNNING`,
- **RESET/LOAD `BASELINE_MINIWORLD`:** only through an explicitly registered deterministic scenario factory/reset boundary reproducing the known baseline miniworld.

## 7. Controlled action/result contract

- Every UI-exposed action must be explicitly registered/allowlisted by IM-15D.
- No arbitrary `window.CleanRuntime`, Domain Store or Scheduler method execution may be exposed.
- Preconditions are validated before action execution.
- `SINGLE STEP` accepts no caller-provided `dtMs`, performs no loop/fast-forward and does not itself change the Runtime lifecycle state.
- Action results are immutable/frozen diagnostic projections containing controlled fields such as action ID, scenario ID, previous/current Runtime state, success/failure and controlled error information.
- IM-15A/B/C may observe resulting authoritative state/results but remain non-mutation owners.

## 8. Diagnostic scenario boundary

The first defined registered scenario is **`BASELINE_MINIWORLD`**.

It represents the existing deterministic browser miniworld composition and may only be loaded/reset through an explicit deterministic scenario boundary.

This is not a generic state editor. No UI fields for arbitrary Gold, Population, Building, Person, Stock, Path, Transport or other Domain values are allowed.

`STOP` is deliberately excluded from the first IM-15D action set because the existing Runtime enters `STOPPED` while its current `start()` boundary only permits restart from `READY` or `PAUSED`.

## 9. Explicit IM-15D exclusions

Not part of IM-15D:

- direct Domain/Store CRUD controls,
- arbitrary Runtime/Scheduler method invocation,
- caller-provided tick/step duration,
- fast-forward or repeated stepping loops,
- `STOP` in the first action set,
- arbitrary gameplay/domain value editing,
- automatic state repair,
- SaveGame manipulation,
- new gameplay/transport/reservation/deadlock/path/wear rules,
- new selection/pointer/touch/camera semantics,
- long-running metrics, heatmaps, throughput histories or balancing — IM-15E.

## 10. Frozen IM-15C evidence remains binding

Frozen IM-15C head: `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

Its PASS / 0 BLOCKER regression, CI/Pages, read-only ownership and real iPhone camera-synchronous overlay evidence remain predecessor requirements for IM-15D.

## 11. Current gate

IM-15D is **DEFINED / NOT IMPLEMENTED** against frozen IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`.

No IM-15D implementation was performed in this documentation step.

The next and only permissible action is the separate **IM-15D Definition/Implementation Gate**: inspect the current repository and derive the exact controlled action adapter, scenario factory/reset boundary, immutable result contract and UI integration surface that can be implemented without violating existing Runtime/Domain ownership. No IM-15D code implementation in the same step.

---

**Updated:** 2026-09-08 — IM-15D Controlled Guidance / Diagnostic Scenario Actions = DEFINED / NOT IMPLEMENTED against frozen IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`. No implementation in this step.
