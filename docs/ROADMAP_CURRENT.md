# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / NOT IMPLEMENTED  
**Repository:** `DrHoschi/siedler-mini`  
**Current documentation line:** `feature/im-15-guidance-inspector`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Authoritative frozen IM-15 development baseline for the next capability: `9e797ab93036f6b3731442dc626edb8c091893c8`.

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

## 9. Next capability – IM-16

### IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / NOT IMPLEMENTED

This is a new binding capability decision produced by the completed reconciliation after frozen IM-15. IM-16 was not previously fixed as the successor in the frozen repository state.

**Leitfrage:**

„Wie wird der eingefrorene Player-UI-, Pointer-/Touch-, Selection- und Camera-Unterbau mit den bestehenden autoritativen Bau-/Gebäudegrenzen verbunden, sodass der Spieler ein Gebäude auswählen, seine Platzierung in der Welt prüfen, bestätigen oder abbrechen kann, ohne eine zweite Gameplay-, Konstruktions- oder Persistenzwahrheit einzuführen?“

**Ziel:**

IM-16 closes the next identified capability gap between the existing player-facing interaction foundation and the authoritative building/construction boundaries. It establishes the player-facing flow:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

Placement validity, costs and resulting building/construction state remain owned by existing authoritative Runtime/Domain owners. UI ownership is limited to temporary interaction and preview state required for player operation.

### IM-16 Scope

- Player-facing building selection from existing definitions.
- Controlled entry/exit of Placement Mode.
- World positioning through the frozen IM-14 Pointer/Touch contract.
- Compatible coexistence with Selection and Camera Controls.
- Visual Placement Preview/Ghost.
- Projection of existing authoritative validation results.
- Confirm/Cancel.
- Confirmed placement handed to the existing authoritative construction/domain boundary.
- Projection of the actually created authoritative state back into Player UI/Context.
- Desktop/iPad/iPhone verification.
- Complete visible Build-Identity synchronization.
- Frozen IM-15 Inspector may continue observing resulting state but does not own construction.

### IM-16 Exclusions

- No new or duplicated Placement, cost, building, Construction or persistence logic in UI.
- No redesign of building definitions, resource economy, production, Workforce or balancing.
- No Inspector expansion into a construction editor.
- No new Inspector mutation paths.
- No SaveGame rearchitecture.
- No campaign, tutorial or Guidance progression.
- No broad post-placement building management such as upgrade, demolition or production control.
- No additional road-building or terraforming feature unless already mandatory within an existing authoritative Placement boundary.
- No adoption of the legacy `main` BuildDock architecture as implementation basis.

### IM-16 Dependencies / ownership preservation

- Exclusive development baseline: frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`.
- Frozen IM-13 SaveGame ownership remains untouched.
- IM-14 Player UI Shell, Pointer/Touch, HUD, Selection/Context and Camera Controls are consumed as existing interaction boundaries.
- IM-15 Inspector/Diagnostics boundaries remain intact.
- Existing authoritative Runtime/Domain/Construction owners are consumed, not replaced or duplicated.

## 10. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / NOT IMPLEMENTED.**

This documentation step does not authorize an IM-16 branch or implementation.

The next permissible action is exclusively the separate documentation verification/finalization gate for this IM-16 definition against frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`. Only after that gate is clean may creation of a separate IM-16 development branch be explicitly authorized.

---

**Updated:** 2026-09-08 — IM-16 Player Construction & Placement Integration documented as the next reconciled capability against frozen IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`; status DEFINED / NOT IMPLEMENTED. No branch and no implementation in this step.
