# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-16-player-construction-placement-integration`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.

Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

## 2. Binding ownership after frozen IM-16A

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- IM-16A remains sole placement-validity authority for the current supported outcomes.
- IM-15 remains observation/guidance except its already frozen diagnostic action allowlist.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

Only IM-16A and IM-16B are frozen so far. Later IM-16 capability remains separately gated.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16a-authoritative-construction-placement-contract`

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen marker:** `frozen/im-16b-player-placement-interaction-state-world-target-contract`

**Exclusive implementation baseline:** frozen IM-16A @ `5b19e57bd118d601a25c0ce042e123366e4869d0`.

### Frozen capability

IM-16B adds only the temporary Player Placement interaction-state and world-target seam above frozen IM-16A.

- State is `INACTIVE` or `ACTIVE`.
- Active state carries existing Building `definitionId`, current authoritative `targetCellId` when available and the current immutable frozen-IM-16A evaluation result when available.
- Real target cells are resolved from already camera-projected `grid-cell` commands and validated against the actual current `MapStructure` cell set.
- Raw screen coordinates never become placement authority.
- No second Camera/world transform is created.
- Frozen IM-14 WORLD Pointer/Touch remains the Player world-input source.
- Multi-touch is ignored for Placement target updates.
- Cancelled pointer samples do not commit placement.
- Existing Selection remains Selection only.
- Placement validity remains exclusively owned by frozen IM-16A.
- Player Placement state is temporary interaction state, not Domain or SaveGame truth.

### Explicit frozen exclusions

IM-16B does **not** include:

- Ghost/Preview rendering,
- Confirm/Commit,
- Building creation/registration,
- `BuildingRegistrationWorldOwnership` consumption,
- construction progression,
- cost/resource deduction,
- SaveGame persistence of interaction state,
- new terrain/distance/resource/building-type placement rules,
- new Selection ownership,
- new Camera semantics,
- new Inspector mutation paths.

## 6. IM-16B Completion / Regression / Freeze Gate

Pre-freeze implementation HEAD: `8c926ae59fee2f42c7d6feb819f45eb1dcd8c1bb`.

Full cumulative diff from frozen IM-16A was reviewed before freeze:

- **11 commits ahead / 0 behind**,
- merge base exactly frozen IM-16A,
- exactly **10 changed files**,
- two files are the already verified IM-16B control-documentation changes,
- eight files are limited to IM-16B interaction-state/world-target implementation, self-test/runtime evidence, CI wiring and visible/build identity synchronization,
- no unrelated Domain/Transport/Scheduler/SaveGame owner expansion,
- no Ghost/Preview, Confirm/Commit or Building creation path.

Technical evidence on exact implementation HEAD `8c926ae59fee2f42c7d6feb819f45eb1dcd8c1bb`:

- CI Baseline `34283207023`: **SUCCESS**,
- CI step `Run IM-16B + frozen predecessor regression`: **SUCCESS**,
- Pages `34283206512`: **SUCCESS**.

Real iPad/Safari evidence on 2026-09-09 confirmed:

- Build identity `IM-16B-PLAYER-PLACEMENT-INTERACTION-STATE-WORLD-TARGET-CONTRACT`,
- runtime `RUNNING`,
- `INACTIVE → ACTIVE → INACTIVE`,
- free target → `VALID`,
- occupied target → `TARGET_CELL_OCCUPIED`,
- outside target → `NO TARGET`,
- no Building mutation,
- no Ghost/Preview,
- no Confirm/Commit,
- existing Inspector remained read-only.

**Gate result: PASS / 0 BLOCKER.**

## 7. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The final IM-16B frozen marker must point at the final documentation HEAD produced by this closing gate. Marker creation is mechanical only and introduces no capability.

No IM-16C implementation or later Player Placement functionality is authorized in this same step.

After the marker exists, the next permissible action is exclusively reconciliation/definition of the next IM-16 substep against frozen IM-16B. No implementation is automatically authorized.

---

**Updated:** 2026-09-09 — IM-16B Player Placement Interaction State & World Target Contract COMPLETE / FROZEN / PASS / 0 BLOCKER after full frozen-IM-16A diff review, successful CI/Pages and real iPad evidence. No IM-16C in this step.
