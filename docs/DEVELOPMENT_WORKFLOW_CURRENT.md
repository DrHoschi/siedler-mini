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
- **IM-15C – World Diagnostic Overlay Foundation: DEFINED / NOT IMPLEMENTED**

## 2. Frozen predecessor line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-14 remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** as a whole block.

IM-15A remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-15B remains **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Authoritative frozen IM-15B baseline for IM-15C: `513636c0fbb4a892134734dc49d8b9a438b7a513`.

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

3. **IM-15C – World Diagnostic Overlay Foundation — DEFINED / NOT IMPLEMENTED**
   - separate read-only diagnostic overlay layer over the existing world rendering,
   - uses the same authoritative camera/world-to-screen projection as the frozen world renderer,
   - may visualize only already authoritative Path Classification, Building/Person identity, existing Carrier Movement evidence and existing IM-14D Selection,
   - creates no new runtime truth and changes no world, selection, camera or input semantics.
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

## 7. IM-15C defined capability boundary

IM-15C is defined as a separate, read-only, camera-synchronous diagnostic overlay layer. It may only project already authoritative facts into world space/screen space and must not alter the normal gameplay/world projection.

Allowed overlay groups:

- **Path / ROAD Cell Overlay:** visualize existing `pathClassification.entries()` on their existing MapStructure cells; no new classification and no Wear,
- **Building Identity Overlay:** display existing Building IDs at already authoritative Building positions,
- **Person Identity Overlay:** display existing Person/Unit IDs at already authoritative Person positions,
- **Carrier Movement Relationship Overlay:** visualize only relationships/positions already present in `carrierMovementEvidence`; no route calculation or route registry,
- **Selection Diagnostic Highlight:** visually highlight the existing IM-14D selection only; no new hit-test, selection or context semantics.

Rendering boundary:

- the normal world renderer remains owner of world/gameplay rendering,
- IM-15C must use the same existing camera/world-to-screen truth as the frozen renderer,
- diagnostic overlay commands are separate from normal world commands and are rendered after the normal world projection,
- Pan/Zoom remains owned by the frozen camera contract.

Explicitly excluded from IM-15C:

- occupancy/reservation/queue/deadlock overlays while no live authoritative read owner exists,
- Wear overlay without a live Wear owner,
- complete route visualization without an authoritative live route registry,
- new Path/Road computation,
- new selection/pointer/touch/camera semantics,
- interactive overlay elements that introduce new gameplay/selection behavior,
- scenario/test triggers, start/pause/step, repair/reset or state editing — IM-15D,
- long-running metrics, heatmaps, throughput history or balancing — IM-15E,
- any gameplay/domain/persistence mutation.

## 8. Frozen IM-15B freeze evidence

Frozen IM-15B head: `513636c0fbb4a892134734dc49d8b9a438b7a513`.

IM-15B remains **COMPLETE / FROZEN / PASS / 0 BLOCKER** with its previously recorded CI/Pages, read-only regression and real iPhone/Safari evidence. Its implementation and freeze boundary are predecessor regression requirements for IM-15C.

## 9. Current gate

IM-15C is **DEFINED / NOT IMPLEMENTED** against frozen IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`.

No IM-15C implementation has been authorized or performed in this documentation step.

The next permissible action is exclusively the separate **IM-15C Definition/Implementation Gate**: inspect the current repository to determine which defined overlay groups can be implemented using the already existing authoritative read/render/camera boundaries, then derive the exact implementation scope. No IM-15C code implementation is authorized in the same step.

## 10. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15C World Diagnostic Overlay Foundation documented as DEFINED / NOT IMPLEMENTED against frozen IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`. No IM-15C implementation in this step.
