# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16 DEFINED / PARTIALLY IMPLEMENTED; IM-16A COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16B COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16C COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16D COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16E COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-16F COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current Whole-Block branch:** `feature/im-16-player-construction-placement-integration`  
**Frozen IM-16 baseline:** IM-15 @ `9e797ab93036f6b3731442dc626edb8c091893c8`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

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

## 2. Binding ownership after IM-16F completion

- Existing Runtime, Domain, Transport, Scheduler, SaveGame, Selection and Camera owners remain authoritative.
- Frozen IM-16A remains sole placement-validity authority for the current supported outcomes.
- Frozen IM-16B remains sole temporary Player Placement interaction-state and real world-target owner.
- Frozen IM-16C remains temporary player-visible Placement Preview / Validity projection owner.
- Frozen IM-16D remains the authoritative commit seam that revalidates through IM-16A and uses the existing Building Domain identity/lifecycle/store ownership plus `BuildingRegistrationWorldOwnership`.
- Frozen IM-16E remains sole explicit Player Confirm/Cancel interaction owner; world pointer/touch and camera gestures remain non-commit paths.
- IM-16F owns only the narrow Player Building selection / Placement activation seam. It may select from the bounded known/testable options `HQ`, `WOODCUTTER`, `STOREHOUSE` and forwards the chosen non-empty `definitionId` only to frozen IM-16B `activate(definitionId)`.
- IM-16F does not own Building definitions, placement validity, Building mutation, registration, commit, Camera, Selection, Pointer/Touch, Inspector, SaveGame, Runtime or Domain truth.
- IM-16F introduces no authoritative Building-definition registry; its bounded selection source is only a Player entry surface for already known/testable definition IDs.
- IM-15 Inspector remains observation/guidance only except its already frozen diagnostic action allowlist; IM-15C diagnostic overlay remains read-only and is not Player Placement authority.

## 3. IM-16 – Player Construction & Placement Integration

**Status:** DEFINED / PARTIALLY IMPLEMENTED

**Whole-Block branch:** `feature/im-16-player-construction-placement-integration`

IM-16 establishes the player-facing construction path from building selection through placement, validation, confirm/cancel and projection of the actually resulting authoritative state back into Player UI, without introducing a second gameplay, construction or persistence truth.

IM-16A through IM-16F are complete/frozen after this gate. No later IM-16 capability is authorized by the IM-16F freeze; the next capability must be separately reconciled against frozen IM-16F.

## 4. IM-16A – Authoritative Construction Placement Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16A establishes immutable mutation-free evaluation of an existing Building `definitionId` against a real `MapStructure` `cellId`, currently returning `VALID`, `TARGET_CELL_OCCUPIED` or `TARGET_CELL_NOT_FOUND`.

## 5. IM-16B – Player Placement Interaction State & World Target Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16B owns the temporary Player Placement interaction-state and world-target seam above frozen IM-16A.

## 6. IM-16C – Player Placement Preview & Validity Projection Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

Frozen IM-16C projects only the already existing frozen-IM-16B state into a temporary player-visible world preview. It owns no placement validity and no Building mutation.

Real iPhone tests continue to show that accumulated verification/inspector overlays are difficult to read on the narrow phone viewport. This remains a **NON-BLOCKING later UI/readability need** and is not part of IM-16F authority.

## 7. IM-16D – Authoritative Placement Commit & Building Registration Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `2d8e508b54fa97f0f9abc2bdc00e9d7b6bfd65b1`.

Frozen IM-16D performs final IM-16A revalidation immediately before mutation and registers through the existing Building owners.

## 8. IM-16E – Player Placement Confirm / Cancel Interaction Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Frozen head:** `a943ac93554e32a8909be2d44ae2d327dd044d58`.

Frozen IM-16E remains limited to explicit Player Confirm/Cancel orchestration. Confirm consumes frozen IM-16D; Cancel deactivates temporary Placement state; world pointer/touch and camera gestures remain non-commit paths.

## 9. IM-16F – Player Building Selection & Placement Activation Contract

**Status:** COMPLETE / FROZEN / PASS / 0 BLOCKER

**Exclusive baseline:** frozen IM-16E @ `a943ac93554e32a8909be2d44ae2d327dd044d58`.

**Pre-freeze implementation/evidence head:** `e3685a4f826c4897224d89ee4ecc2900feb7977f`.

### Frozen capability

IM-16F closes only the Player-entry gap before frozen IM-16B:

`Player Building Selection → existing definitionId → frozen IM-16B activate(definitionId) → ACTIVE Placement State`.

- The bounded Player selection source exposes the already known/testable IDs `HQ`, `WOODCUTTER` and `STOREHOUSE` only.
- Explicit selection of an available option forwards exactly that non-empty `definitionId` to frozen IM-16B `activate(definitionId)` and produces frozen IM-16B `ACTIVE` state.
- Switching from one available option to another replaces the temporary selected definition only through another frozen IM-16B `activate(...)` call.
- An unavailable option is rejected with `BUILDING_OPTION_NOT_AVAILABLE` and causes no Placement activation.
- Selection itself performs no placement evaluation, Building mutation, registration or commit.
- Frozen IM-16A remains sole placement-validity authority; IM-16B remains temporary Placement-state/world-target owner; IM-16C remains preview owner; IM-16D remains commit owner; IM-16E remains Confirm/Cancel owner.
- No authoritative Building-definition registry is introduced.

### Automated verification evidence

CI run `34355853367` on pre-freeze implementation/evidence head `e3685a4f826c4897224d89ee4ecc2900feb7977f`: **SUCCESS**, including `Run IM-16F + frozen predecessor regression`.

Pages run `34355852082` on the same head: **SUCCESS**.

The automated IM-16F self-test verifies the bounded option set, HQ selection → Placement ACTIVE, switch → WOODCUTTER, rejection of an unavailable option with no activation, frozen IM-16B activation consumption, immutable results and absence of Building mutation/validity/commit/Domain authority.

### Real iPhone/Safari evidence

Four fresh real iPhone/Safari screenshots confirm the deployed IM-16F surface and behavior:

- visible `IM-16F – Player Building Selection & Placement Activation Contract` and `IM-16F — PASS`,
- exact Build identity `IM-16F-PLAYER-BUILDING-SELECTION-PLACEMENT-ACTIVATION-CONTRACT`,
- visible Player options `Hauptquartier`, `Holzfäller`, `Lagerhaus`,
- `HQ · PLACEMENT ACTIVE` after Hauptquartier selection,
- `WOODCUTTER · PLACEMENT ACTIVE` after switching selection,
- inactive state with `Gebäude wählen` / `Placement inaktiv`,
- unchanged explicit `Bestätigen` / `Abbrechen` behavior with disabled controls when Placement is inactive,
- successful existing frozen-IM-16E/IM-16D flow visible as `COMMITTED building:00000004`,
- Inspector remains `OBSERVATION READ ONLY`,
- Runtime state changes between `RUNNING` and `READY` remain independent of the IM-16F selection seam.

The narrow-phone verification/Inspector overlap remains the previously documented **NON-BLOCKING later UI/readability need**.

### Preserved exclusions

No complete Building catalogue/management UI, categories, search, favourites, unlocks/tech tree, costs, resource/Gold deductions, production/workforce data, construction progression, rotation, multi-cell footprints, new placement-validity rules, terrain/distance/resource/building-type rules, SaveGame rearchitecture, Inspector mutation, second Building-definition authority, legacy `main` BuildDock/gameplay reuse or later IM-16 capability is introduced.

## 10. Completion / Regression / Freeze Gate

Full diff frozen IM-16E `a943ac93554e32a8909be2d44ae2d327dd044d58` → pre-freeze IM-16F head `e3685a4f826c4897224d89ee4ecc2900feb7977f` was rechecked as **12 commits ahead / 0 behind**, merge-base exactly frozen IM-16E, with 10 changed files limited to the two control documents plus IM-16F selection implementation, self-test/evidence, visible entry-point/build identity and CI regression surfaces.

Ownership/exclusions were rechecked against the full diff. Automated CI/Pages and real iPhone/Safari evidence are PASS. Completion documentation is synchronized as **COMPLETE / FROZEN / PASS / 0 BLOCKER**, subject only to CI and Pages succeeding on the exact final documentation head before the frozen marker is created.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

**IM-16 – Player Construction & Placement Integration = DEFINED / PARTIALLY IMPLEMENTED.**

**IM-16A through IM-16F = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

No IM-16G or later IM-16 capability is implemented or authorized here. After frozen IM-16F is verified, the next permissible action is exclusively reconciliation/definition of the next still-missing IM-16 capability against frozen IM-16F.

---

**Updated:** 2026-09-09 — IM-16F Completion / Regression / Freeze Gate synchronized after full-diff, CI/Pages and real iPhone/Safari verification. No later IM-16 capability implemented.
