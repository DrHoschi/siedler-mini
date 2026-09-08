# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 IN PROGRESS / NOT FROZEN; IM-15A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15C DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-15B remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen predecessor for IM-15C: frozen IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`.

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
- later actions only through explicit diagnostic/test/runtime boundaries,
- automated tests remain test-owned.

## 4. IM-15 sequence

- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15B – Structured Runtime Diagnostics Projection — COMPLETE / FROZEN / PASS / 0 BLOCKER**,
- **IM-15C – World Diagnostic Overlay Foundation — DEFINED / NOT IMPLEMENTED**,
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions — PLANNED / NOT IMPLEMENTED**,
- **IM-15E – Simulation & Balancing Observation Foundation — PLANNED / NOT IMPLEMENTED**,
- **IM-15 Whole-Block Completion / Regression / Freeze Gate — LATER / NOT YET EXECUTED**.

## 5. Frozen IM-15A / IM-15B predecessor boundary

IM-15A remains the frozen owner of:

- separate Inspector shell distinct from the frozen IM-14 Player UI shell,
- read-only Runtime/World basic observation,
- Population and Gold projection,
- read-only selected Building/Person identity reuse from IM-14D,
- responsive Inspector presentation.

IM-15B remains the frozen owner of structured read-only diagnostics over existing Buildings, Persons, Jobs, Resources, Movement/Navigation evidence and Path Classification. It added no Domain/Transport mutation path and synthesized no unavailable live diagnostic state.

## 6. IM-15C defined capability boundary

IM-15C is a separate read-only diagnostic overlay layer over the existing world rendering. It visualizes only facts that already exist in authoritative runtime/read boundaries and uses the same existing camera/world-to-screen truth as normal world rendering.

Allowed overlay groups:

- **Path / ROAD Cell Overlay:** existing `pathClassification.entries()` projected onto their existing MapStructure cells; no new classification and no Wear,
- **Building Identity Overlay:** existing Building IDs at authoritative Building positions,
- **Person Identity Overlay:** existing Person/Unit IDs at authoritative Person positions,
- **Carrier Movement Relationship Overlay:** only positions/relationships already present in `carrierMovementEvidence`; no route calculation or complete route registry,
- **Selection Diagnostic Highlight:** visual highlight of the existing IM-14D selection only; no new hit-test, selection or context semantics.

Rendering ownership:

- normal world/gameplay rendering remains owned by the existing renderer,
- IM-15C diagnostic overlay commands remain separate from normal world commands,
- overlays are camera-synchronous and rendered after the normal world projection,
- frozen Pan/Zoom and camera ownership remain unchanged.

## 7. Explicit IM-15C exclusions

Not part of IM-15C:

- occupancy/reservation/queue/deadlock overlays without a live authoritative read owner,
- Wear overlay without a live Wear owner,
- complete route visualization without an authoritative live route registry,
- new Path/Road computation,
- new selection/pointer/touch/camera semantics,
- interactive overlay elements introducing new gameplay/selection behavior,
- scenario/test triggering, start/pause/step, repair/reset or state editing — IM-15D,
- long-running metrics, heatmaps, throughput histories or balancing — IM-15E,
- any gameplay/domain/persistence mutation.

## 8. Frozen IM-15B evidence remains binding

Frozen IM-15B head: `513636c0fbb4a892134734dc49d8b9a438b7a513`.

Its recorded PASS / 0 BLOCKER regression, CI/Pages, read-only ownership verification and real iPhone/Safari evidence remain predecessor requirements for IM-15C and must not regress.

## 9. Current gate

IM-15C is **DEFINED / NOT IMPLEMENTED** against frozen IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`.

No IM-15C implementation was performed in this documentation step.

The next and only permissible action is the separate **IM-15C Definition/Implementation Gate**: inspect the current repository and determine which defined overlay groups can be implemented entirely through existing authoritative read/render/camera boundaries, then derive the exact implementation surface. No IM-15C code implementation in the same step.

---

**Updated:** 2026-09-08 — IM-15C World Diagnostic Overlay Foundation = DEFINED / NOT IMPLEMENTED against frozen IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`. No implementation in this step.
