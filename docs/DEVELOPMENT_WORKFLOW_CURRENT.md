# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current Whole-Block branch: `feature/im-16-player-construction-placement-integration`
- Frozen development baseline: IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15 – Guidance / Inspector: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15B – Structured Runtime Diagnostics Projection: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15C – World Diagnostic Overlay Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15D – Controlled Guidance / Diagnostic Scenario Actions: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15E – Simulation & Balancing Observation Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16 – Player Construction & Placement Integration: DEFINED / PARTIALLY IMPLEMENTED**
- **IM-16A – Authoritative Construction Placement Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16B – Player Placement Interaction State & World Target Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16C – Player Placement Preview & Validity Projection Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16D – Authoritative Placement Commit & Building Registration Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16E – Player Placement Confirm / Cancel Interaction Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-16F – Player Building Selection & Placement Activation Contract: COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen predecessor chain

Frozen IM-15 substep markers remain authoritative:

- IM-15A @ `f0eb70e1501d19c60b264699dde2a2ed05a5959b`
- IM-15B @ `513636c0fbb4a892134734dc49d8b9a438b7a513`
- IM-15C @ `c7de361da27fede4aeff83a36c13ec0ee6d1a0dd`
- IM-15D @ `8fd55a68f37db84c6eddf4be5aaa22219e3b2741`
- IM-15E @ `ba1c7fc80dfa0d09342d0814e3b69a682949f6cf`

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

Frozen IM-16A marker: `frozen/im-16a-authoritative-construction-placement-contract`.
Frozen IM-16A head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

Frozen IM-16B marker: `frozen/im-16b-player-placement-interaction-state-world-target-contract`.
Frozen IM-16B head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

Frozen IM-16C marker: `frozen/im-16c-player-placement-preview-validity-projection-contract`.
Frozen IM-16C head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

Frozen IM-16D marker: `frozen/im-16d-authoritative-placement-commit-building-registration-contract`.
Frozen IM-16D head and exclusive IM-16E baseline: `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

IM-16E pre-freeze implementation/evidence head: `b077553d9158c504ba5fb2b898732b651fe81054`.
Frozen IM-16E marker: `frozen/im-16e-player-placement-confirm-cancel-interaction-contract`.
Frozen IM-16E head and exclusive IM-16F baseline: `a943ac93554e32a8909be2d44ae2d327dd044d58`.

IM-16F pre-freeze implementation/evidence head: `e3685a4f826c4897224d89ee4ecc2900feb7977f`.
Final frozen IM-16F head is the completion-documentation head produced by this gate and verified by final-head CI/Pages before the frozen marker is set.

## 3. Binding ownership boundary after IM-16F completion

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the currently supported outcomes.
- Frozen IM-16B remains sole temporary Player Placement interaction-state and world-target owner.
- Frozen IM-16C remains temporary Player Placement Preview / Validity projection owner.
- Frozen IM-16D remains the authoritative commit seam: final revalidation through IM-16A and controlled handoff to existing Building identity/lifecycle/store/registration owners.
- Existing Building Domain/store remains sole owner of stable Building identity, lifecycle and Building-store mutation.
- Existing `BuildingRegistrationWorldOwnership` remains the authoritative Building registration boundary.
- Frozen IM-16E remains sole explicit Player Confirm/Cancel interaction owner. Confirm consumes frozen IM-16D; Cancel only deactivates temporary Placement state; world pointer/touch and camera gestures remain non-commit paths.
- IM-16F owns only the narrow Player Building selection / Placement activation seam. It exposes the bounded known/testable options `HQ`, `WOODCUTTER`, `STOREHOUSE` and forwards the selected non-empty `definitionId` only to frozen IM-16B `activate(definitionId)`.
- IM-16F does not own Building definitions, placement validity, Building mutation, registration, commit, Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime or Domain truth.
- IM-16F does not introduce an authoritative Building-definition registry.
- Frozen IM-15 Inspector remains observer only; IM-15C diagnostic overlay is not Player Placement authority.
- Legacy `main` gameplay/UI architecture is not an implementation basis.

## 4. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

Target flow remains:

`Gebäude auswählen → Platzierungsmodus → Position in der Welt bestimmen → gültig/ungültig erkennen → bestätigen oder abbrechen → autoritatives Bauergebnis wieder in die Player UI projizieren`.

IM-16A through IM-16F are complete/frozen after this gate. No later IM-16 capability is authorized here; the next capability must be separately reconciled against frozen IM-16F.

## 5. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `5b19e57bd118d601a25c0ce042e123366e4869d0`.

IM-16A remains the immutable, mutation-free placement-evaluation authority for an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 6. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `0c5dfcbe7cd10ac745884c7204ce9549596c2cd2`.

IM-16B remains the temporary Player Placement interaction state plus camera-compatible targeting owner for real `MapStructure` cells.

## 7. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen head: `ddebbb4ee8b743b869e069da11d644690e0620eb`.

IM-16C owns only the temporary player-visible world preview and unchanged validity projection from frozen IM-16B / IM-16A. It creates no Building and owns no mutation truth.

### Non-blocking UI/readability evidence

Real iPhone evidence continues to show that accumulated Inspector/verification surfaces are difficult to read on a narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and is not part of IM-16F authority.

## 8. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

IM-16D remains the authoritative commit / Building registration seam behind the frozen interaction/preview path. It revalidates through frozen IM-16A immediately before mutation and uses the existing Building ID, identity, lifecycle, store and `BuildingRegistrationWorldOwnership` owners.

## 9. IM-16E – Player Placement Confirm / Cancel Interaction Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `a943ac93554e32a8909be2d44ae2d327dd044d58`.

IM-16E remains limited to explicit Player Confirm/Cancel orchestration. Confirm consumes frozen IM-16D; Cancel deactivates temporary Placement state; world pointer/touch and camera gestures remain non-commit paths.

## 10. IM-16F – Player Building Selection & Placement Activation Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16E @ `a943ac93554e32a8909be2d44ae2d327dd044d58`.

**Pre-freeze implementation/evidence head:** `e3685a4f826c4897224d89ee4ecc2900feb7977f`.

### Frozen capability

IM-16F closes only the missing Player-entry seam in front of frozen IM-16B:

`Player Building Selection → existing definitionId → frozen IM-16B activate(definitionId) → ACTIVE Placement State`.

- The bounded selection source exposes the already known/testable definition IDs `HQ`, `WOODCUTTER` and `STOREHOUSE` only.
- Explicit selection of an available option forwards exactly that non-empty `definitionId` to frozen IM-16B `activate(definitionId)` and produces frozen IM-16B state `ACTIVE`.
- Selecting another available option replaces the temporary selected definition only through another frozen IM-16B `activate(...)` call.
- An unavailable option is rejected with `BUILDING_OPTION_NOT_AVAILABLE` and causes no Placement activation.
- Selection itself performs no placement evaluation, Building registration, Building mutation or commit.
- Frozen IM-16A remains sole placement-validity authority; IM-16B remains sole temporary Placement-state/world-target owner; IM-16C remains preview owner; IM-16D remains authoritative commit owner; IM-16E remains explicit Confirm/Cancel owner.
- IM-16F introduces no authoritative Building-definition registry and no new Domain truth.

### Automated verification evidence

CI run `34355853367` on pre-freeze implementation/evidence head `e3685a4f826c4897224d89ee4ecc2900feb7977f`: **SUCCESS**, including `Run IM-16F + frozen predecessor regression`.

Pages run `34355852082` on the same head: **SUCCESS**.

The automated IM-16F self-test verifies the bounded option set, HQ selection → Placement ACTIVE, switch → WOODCUTTER, unavailable-option rejection without activation, frozen IM-16B activation consumption, immutable results and the preserved no-Building-mutation/no-validity/no-commit/no-Domain-authority boundary.

### Real iPhone/Safari evidence

Four fresh real iPhone/Safari screenshots supplied during the Completion / Regression / Freeze Gate confirm:

- visible title `IM-16F – Player Building Selection & Placement Activation Contract`,
- visible `IM-16F — PASS`,
- exact Build identity `IM-16F-PLAYER-BUILDING-SELECTION-PLACEMENT-ACTIVATION-CONTRACT`,
- visible Player options `Hauptquartier`, `Holzfäller`, `Lagerhaus`,
- `HQ · PLACEMENT ACTIVE` after Hauptquartier selection,
- `WOODCUTTER · PLACEMENT ACTIVE` after switching selection,
- inactive state with `Gebäude wählen` / `Placement inaktiv`,
- unchanged explicit `Bestätigen` / `Abbrechen` behavior with disabled controls while Placement is inactive,
- successful existing frozen IM-16E/IM-16D flow visible as `COMMITTED building:00000004`,
- Inspector remains `OBSERVATION READ ONLY`,
- Runtime state transitions between `RUNNING` and `READY` remain independent of the IM-16F selection seam.

The narrow-phone verification/Inspector overlap remains the already documented **NON-BLOCKING later UI/readability need**.

### Explicit exclusions preserved

IM-16F introduces no complete Building catalogue/management UI, categories, search, favourites, unlocks/tech tree, costs/prices, resource or Gold deductions, production/workforce data, construction progression, Building rotation, multi-cell footprints, new terrain/distance/resource/building-type placement rules, SaveGame rearchitecture, Inspector mutation, second Building-definition authority, legacy `main` BuildDock/gameplay reuse or later IM-16 capability.

## 11. IM-16F Completion / Regression / Freeze Gate

Full diff frozen IM-16E `a943ac93554e32a8909be2d44ae2d327dd044d58` → pre-freeze IM-16F head `e3685a4f826c4897224d89ee4ecc2900feb7977f` was rechecked as **12 commits ahead / 0 behind**, merge-base exactly frozen IM-16E, with 10 changed files limited to the two control documents plus IM-16F selection implementation, self-test/evidence, visible entry-point/build identity and CI regression surfaces.

Ownership and exclusions were rechecked against the complete IM-16F diff. Automated CI/Pages and final real iPhone/Safari evidence are PASS. The completion documentation is therefore synchronized as **COMPLETE / FROZEN / PASS / 0 BLOCKER**, subject only to final-head CI/Pages verification before setting the frozen marker.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A through IM-16F = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

No IM-16G or later IM-16 capability is implemented or authorized here. After the frozen marker is verified, the next permissible action is exclusively reconciliation/definition of the next still-missing IM-16 capability against frozen IM-16F.

## 12. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-09 — IM-16F Completion / Regression / Freeze Gate synchronized after full-diff, CI/Pages and real iPhone/Safari verification. No later IM-16 capability implemented.
