# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / NOT IMPLEMENTED; IM-16A DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-16-player-construction-placement-integration`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Authoritative frozen IM-15 development baseline for IM-16: `9e797ab93036f6b3731442dc626edb8c091893c8`.

## 2. Frozen IM-15 substep chain

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

## 3. Frozen IM-15 capability set

- **IM-15A:** Inspector shell + read-only Runtime/World/Population/Gold/Selection observation.
- **IM-15B:** structured read-only Runtime diagnostics over existing authoritative sources.
- **IM-15C:** read-only camera-synchronous world diagnostic overlays.
- **IM-15D:** controlled allowlist actions `START`, `PAUSE`, `SINGLE_STEP`, `RESET_BASELINE_MINIWORLD` only.
- **IM-15E:** scheduler-synchronous bounded read-only Simulation Observation with immutable samples/deltas, session separation and history limit 120.

## 4. Binding ownership after IM-15

IM-15 does not become a gameplay/domain/persistence owner.

The frozen block preserves:

- one authoritative active Runtime composition,
- existing Domain and Transport ownership,
- existing Runtime/Scheduler ownership,
- IM-14 Selection/Pointer/Touch/Camera ownership,
- SaveGame ownership,
- read-only observation except explicit IM-15D allowlist actions,
- no metrics/balancing feedback into simulation rules.

## 5. IM-15 Whole-Block regression

Against frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`:

- pre-identity synchronization: **66 commits ahead / 0 behind**,
- after Whole-Block identity and initial freeze documentation: **72 commits ahead / 0 behind**,
- exactly **14 changed files** throughout,
- no Domain owner source changes,
- no Transport owner source changes,
- no `src/runtime/runtime.js` changes,
- no `src/runtime/scheduler.js` changes.

All five frozen IM-15 substep markers were re-verified at their authoritative heads.

## 6. Cumulative evidence

The Whole-Block decision incorporates the complete frozen substep evidence:

- IM-15A/B real iPhone Inspector/Diagnostics evidence,
- IM-15C real iPhone overlay/camera synchronization evidence,
- IM-15D real iPad controlled action sequence evidence,
- IM-15E seven real iPad screenshots verifying scheduler synchronization, pause stillness, +1 single-step behavior, bounded history 120 and session reset separation.

Final Whole-Block technical evidence:

- CI Baseline `34274868699`: **SUCCESS**,
- Pages `34274915778` on `f0012a577e804684e0ece34f015492c06f375f56`: **SUCCESS**.

## 7. Final Whole-Block identity

Visible/build identity:

`IM-15-GUIDANCE-INSPECTOR-WHOLE-BLOCK`

Visible verification state:

`IM-15 — COMPLETE / FROZEN / PASS / 0 BLOCKER`

This final identity synchronization adds no new capability.

## 8. Explicit exclusions remain outside frozen IM-15

- arbitrary gameplay/domain/store editing,
- generic Runtime method exposure,
- unrestricted scenario authoring,
- fast-forward/repeated measurement stepping,
- caller-configurable tick duration/simulation speed,
- automatic balancing/correction,
- diagnostic feedback into gameplay rules,
- observation-history SaveGame persistence,
- telemetry/upload,
- unbounded history,
- invented metrics,
- new Selection/Pointer/Touch/Camera semantics.

## 9. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / NOT IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

**Exclusive development baseline:** frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`.

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

The frozen IM-14 Player UI/Pointer/Touch/Selection/Camera boundaries are consumed, IM-13 SaveGame ownership is preserved, and frozen IM-15 Inspector/Diagnostics may observe resulting state but do not own construction.

## 10. First substep – IM-16A

### IM-16A – Authoritative Construction Placement Contract

**Status:** DEFINED / NOT IMPLEMENTED

**Leitfrage:**

„Wie wird eine gewünschte Gebäudeplatzierung erstmals als eindeutige Anfrage gegen die bestehende Map-/Building-Authority beschrieben und autoritativ als zulässig oder unzulässig bewertet, ohne dass Pointer-, UI- oder Preview-Zustand selbst über Gameplay-Gültigkeit entscheiden darf?“

**Ziel:**

IM-16A creates only the missing authoritative seam between later player placement interaction and the existing world/building owners.

A placement candidate is defined by an existing Building `definitionId` plus a real `MapStructure` cell. Pointer/UI/preview state may later submit or display that candidate, but does not own the gameplay validity decision.

### Binding contract boundary

- Existing Building `definitionId` is the building-type input.
- A real `MapStructure` cell is the placement target; screen coordinates are not authoritative placement input.
- `MapStructure` remains authoritative for `cellId`, grid coordinates and world coordinates.
- Existing Building/Construction Domain ownership remains authoritative for placement validity.
- Evaluation returns an immutable valid/invalid result tied to the evaluated building definition and target cell.
- Invalid evaluation causes no Building, Construction, World or persistence mutation.
- Valid evaluation in IM-16A also causes no Building creation.
- Existing `BuildingRegistrationWorldOwnership` remains the authoritative registration boundary for a later explicit confirm/commit step.
- IM-14 Pointer/Touch, Selection and Camera contracts remain unchanged.
- Screen/Pointer-to-cell interaction is deferred to a later integration step above this contract.
- IM-15 Inspector receives no placement mutation authority.

### Explicit exclusions

IM-16A does **not** include:

- player-facing building picker or Build menu,
- Placement Mode lifecycle,
- Placement Ghost/Preview,
- Pointer/Touch-to-cell controller,
- Confirm/Cancel,
- actual Building registration/creation,
- construction progression,
- cost/resource deduction,
- SaveGame changes,
- new Selection or Camera semantics,
- new Inspector mutation paths,
- speculative new terrain, distance, resource or building-type placement rule catalogues not already supported by existing authoritative owners.

The first implementation, when separately authorized, must stay limited to this narrow authoritative contract and only the minimum validation the current world/building model can support.

## 11. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / NOT IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = DEFINED / NOT IMPLEMENTED.**

This documentation update does not authorize implementation.

The next permissible action is exclusively an IM-16A documentation verification/finalization gate against frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8` on `feature/im-16-player-construction-placement-integration`. Only after PASS / 0 BLOCKER may IM-16A implementation be explicitly authorized.

---

**Updated:** 2026-09-08 — IM-16A Authoritative Construction Placement Contract documented as DEFINED / NOT IMPLEMENTED on the IM-16 Whole-Block branch. No implementation authorized in this step.
