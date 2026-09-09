# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-16-player-construction-placement-integration`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.
Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

Frozen IM-16B marker: `frozen/im-16b-player-placement-interaction-state-world-target-contract`.
Frozen IM-16B head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

IM-16C is now frozen by this closing gate. Its frozen marker must point at the final documentation HEAD produced after final CI/Pages verification.

## 2. Binding ownership after frozen IM-16C

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the current supported outcomes.
- Frozen IM-16B owns only temporary Player Placement interaction state and real world-target consumption.
- Frozen IM-16C owns only temporary player-visible Placement Preview / Validity projection.
- IM-15 remains observation/guidance except its already frozen diagnostic action allowlist.
- IM-15C diagnostic overlay remains read-only and is not Player Placement Preview authority.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

IM-16A, IM-16B and IM-16C are frozen. Later IM-16 capability remains separately gated.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16B adds only the temporary Player Placement interaction-state and world-target seam above frozen IM-16A. It creates no Ghost/Preview, no Confirm/Commit and no Building mutation path.

## 6. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive implementation baseline:** frozen IM-16B @ `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

### Frozen capability

IM-16C projects only the already existing frozen-IM-16B state into a temporary player-visible world preview.

- input remains frozen IM-16B state: `definitionId`, current real `targetCellId`, unchanged frozen-IM-16A evaluation;
- existing camera-synchronous projected world geometry remains the only visual geometry authority;
- the target cell is visually highlighted;
- `VALID` and `TARGET_CELL_OCCUPIED` are visually distinguishable without re-evaluating placement rules;
- `NO TARGET` suppresses the Player Preview;
- the simple Building Ghost is temporary render presentation only and creates no Building/Domain entity or Construction state;
- camera pan/zoom keeps preview synchronized;
- Selection remains independent;
- Inspector remains read-only.

### Frozen exclusions

IM-16C includes no Confirm/Commit, no Building creation/registration, no `BuildingRegistrationWorldOwnership`, no construction progression, no cost/resource/Gold deduction, no SaveGame persistence, no new Building catalogue/menu architecture, no new placement rules, no Building rotation, no multi-cell footprints, no new Camera/Selection ownership and no Inspector mutation.

## 7. IM-16C Completion / Regression / Freeze Gate

Pre-freeze implementation HEAD: `77e1c75d361f0a816d84411f9c4e402b4b4c0142`.

Full cumulative diff from frozen IM-16B to the implementation HEAD was reviewed before freeze:

- **10 commits ahead / 0 behind**,
- merge base exactly frozen IM-16B,
- exactly **10 changed files**,
- two files are the already verified IM-16C control-documentation changes,
- eight files are limited to IM-16C preview implementation, self-test/runtime evidence, CI wiring and visible/build identity synchronization,
- no unrelated Domain/Transport/Scheduler/SaveGame owner expansion,
- no Confirm/Commit or Building creation path.

Technical evidence:

- CI Baseline `34323894551`: **SUCCESS**,
- CI step `Run IM-16C + frozen predecessor regression`: **SUCCESS**,
- Pages deploy `34323894385`: **SUCCESS** for the visible IM-16C browser surface at `3bee01efd2525f9255bea02cc585f4b4a400bbcd`; the later implementation HEAD `77e1c75d...` differs only by `.github/workflows/ci.yml` and therefore does not change deployed browser content.

Real iPhone/Safari evidence on 2026-09-09 confirmed:

- Build identity `IM-16C-PLAYER-PLACEMENT-PREVIEW-VALIDITY-PROJECTION-CONTRACT`,
- browser evidence `IM-16C — PASS`,
- free target `cell:00000001` → `VALID Ghost`,
- occupied target `cell:00000019` → `INVALID / TARGET_CELL_OCCUPIED`,
- outside target → `NO TARGET`,
- Inspector remained `OBSERVATION READ ONLY`,
- no Confirm/Commit,
- no Building mutation.

### Non-blocking UI follow-up evidence

The same real iPhone test showed that the accumulated verification/inspector overlays have become difficult to read/use on the narrow phone viewport. This is recorded as a **NON-BLOCKING later UI/readability need** because the IM-16C functional preview/validity contract itself is visibly correct and PASS. It must not be silently folded into IM-16C after freeze.

**Gate result: PASS / 0 BLOCKER.**

## 8. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A – Authoritative Construction Placement Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16B – Player Placement Interaction State & World Target Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16C – Player Placement Preview & Validity Projection Contract = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

No IM-16D, Confirm/Commit or Building creation is authorized in this same gate.

After the frozen marker exists, the next permissible action is exclusively reconciliation/definition of the next IM-16 substep against frozen IM-16C. No implementation is automatically authorized.

---

**Updated:** 2026-09-09 — IM-16C Completion / Regression / Freeze Gate PASS / 0 BLOCKER after full frozen-IM-16B diff review, successful CI/Pages and real iPhone evidence. Smartphone readability recorded as non-blocking later UI need.
