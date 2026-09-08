# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15E COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen predecessor for IM-15E: frozen IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- **IM-14 – UI/Mobile — COMPLETE / FROZEN**,
- **IM-15 – Guidance/Inspector — IN PROGRESS / NOT FROZEN**.

## 3. IM-15 sequence

- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15C – World Diagnostic Overlay Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15E – Simulation & Balancing Observation Foundation — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — NEXT / NOT YET EXECUTED**.

## 4. Frozen IM-15E capability boundary

IM-15E is a purely observational scheduler-synchronous bounded diagnostics foundation.

The frozen implementation:

- registers one `im15e.simulation-observation` system in Scheduler `maintenance`,
- creates one sample per actual Scheduler step,
- uses Scheduler `dtMs` as the only diagnostic time increment,
- caps in-memory history at **120 samples**,
- starts a new diagnostic session when the active Runtime composition changes,
- deep-freezes samples and deltas,
- reads authoritative Population, Gold, Buildings, Persons, Jobs and Resources facts,
- leaves absent Stock/Production/Transport sources explicitly `UNAVAILABLE`,
- feeds no metric or delta back into gameplay, Runtime, Scheduler, Domain, Transport or persistence owners.

## 5. Frozen Inspector observation surface

`src/ui/simulation-balancing-observation.js` renders a separate **Simulation Observation — READ ONLY · BOUNDED 120** section.

The 250-ms UI refresh is presentation-only and never creates simulation samples or advances the Scheduler.

Visible/build identity remains `IM-15E-SIMULATION-BALANCING-OBSERVATION-FOUNDATION`.

## 6. IM-15E freeze evidence

Regression against frozen IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741` before freeze-status synchronization confirmed:

- **10 commits ahead / 0 behind**,
- exactly eight permitted changed files,
- no Scheduler/Runtime/Domain/Transport owner modification.

Technical evidence:

- CI Baseline `34272335658` on `99a8557935a0849286d7f50d73eb1bd8c50640ac`: **SUCCESS**,
- Pages `34272541677` on `c4f7a9451fe6c3c4ad633536cac95b5bca48ac43`: **SUCCESS**.

Seven real iPad/Safari screenshots at 2026-09-08 22:12–22:13 local confirmed:

- `READY` starts at `session:0001`, Step/Samples `0/0`,
- while `RUNNING`, Step and Samples advance together,
- `PAUSE` stops observation advancement,
- `SINGLE_STEP` advances exactly one sample and `100 ms`,
- history remains capped at `120` even after Step `131`,
- `RESET_BASELINE_MINIWORLD` creates `session:0002` and resets Step/Time/Samples to `0`,
- core authoritative facts remain consistent,
- unavailable optional metrics remain `UNAVAILABLE`,
- IM-15D action controls and IM-15C world overlays remain intact.

**Gate result: IM-15E = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 7. Explicit exclusions remain outside IM-15E

- gameplay mutation from metrics,
- automatic balancing/correction,
- thresholds that alter simulation rules,
- fast-forward/repeated measurement steps,
- configurable simulation speed/tick duration,
- Inspector-only gameplay events,
- SaveGame persistence of observation history,
- telemetry/upload,
- unbounded history,
- invented metrics,
- charts/heatmaps in this Foundation step,
- new selection/pointer/touch/camera semantics.

## 8. Current gate

IM-15E is frozen. IM-15 remains **IN PROGRESS / NOT FROZEN**.

The next and only permissible action is **IM-15 Whole-Block Completion / Regression / Freeze Gate** against frozen IM-14 and the complete frozen IM-15A/B/C/D/E chain. No next migration block is authorized before that gate.

---

**Updated:** 2026-09-08 — IM-15E Simulation & Balancing Observation Foundation COMPLETE / FROZEN / PASS / 0 BLOCKER. Next permissible action: IM-15 Whole-Block Completion / Regression / Freeze Gate only.
