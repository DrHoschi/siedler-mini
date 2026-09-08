# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Whole-block branch: `feature/im-14-ui-mobile-foundation`
- Whole-block base: frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-14A – Player UI Shell & Responsive Surface Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-14B – Unified Pointer / Touch Interaction Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-14C – Runtime HUD Projection: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-14D – World Selection & Context Projection: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- IM-14E – Player Camera Controls Integration: **COMPLETE / FROZEN / PASS / 0 BLOCKER**

## 2. Frozen IM-14 composition

IM-14 freezes the complete player-facing UI/mobile foundation as the composition of five separately verified boundaries:

- **IM-14A:** responsive Player UI Shell with Topbar, World/Canvas and Action regions, safe-area handling and Canvas↔World binding,
- **IM-14B:** neutral unified Pointer/Touch lifecycle and deterministic UI-vs-WORLD classification,
- **IM-14C:** read-only Runtime HUD projection for authoritative Population and Gold,
- **IM-14D:** ephemeral Building/Person selection and read-only Context projection with Empty-World clear and Drag/Pinch selection guard,
- **IM-14E:** player camera gesture integration over the shared WORLD input using the frozen camera-control functions and zoom policy.

Ownership remains separated:

- UI does not own simulation/domain/persistence state,
- HUD does not create a second Population/Gold truth,
- Selection does not mutate selected runtime/domain objects,
- Camera integration owns gesture interpretation only,
- SaveGame/Persistence, Inspector, minimap, gameplay/context actions and later guidance remain outside IM-14.

## 3. Frozen markers

- `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`
- `frozen/im-14b-unified-pointer-touch-interaction-contract` @ `8aa7594f4debcc838382ca6f49fcdcbadf9be324`
- `frozen/im-14c-runtime-hud-projection` @ `788358677092ef91d7edf1c0d8a6a82efacc5f21`
- `frozen/im-14d-world-selection-context-projection` @ `72b234e0ada95afa324d62d83274ee1f320abe37`
- `frozen/im-14e-player-camera-controls-integration` @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 4. IM-14 Whole-Block Completion / Regression / Freeze Gate

Authoritative final pre-whole-block-freeze branch HEAD: `053d4cc7f8befdb747ebce9afb755f286e2b0682`.

Full branch regression against frozen IM-13 @ `0a011af99ea8814b9e3555d7075ee091cfaf05c2`:

- branch is **51 commits ahead / 0 behind**,
- changed surface is limited to IM-14 control/runtime-evidence/UI integration surfaces: workflow/roadmap, `index.html`, IM-14A/B/C/D/E evidence files, `src/main.js`, `src/runtime/config.js`, `src/ui/app.css`, and the four IM-14 UI integration modules,
- no unrelated domain/gameplay/persistence/Inspector feature surface is introduced,
- all planned IM-14 substeps A–E are individually frozen before the whole-block gate.

Final technical evidence:

- authoritative final functional/evidence state `e3df3aca45a1fa156447ba302188227fd3718125` has CI Baseline run `34203676233`: **SUCCESS** and Pages run `34203675151`: **SUCCESS**,
- only the two control documents changed from `e3df3aca45a1fa156447ba302188227fd3718125` to final pre-whole-block-freeze HEAD `053d4cc7f8befdb747ebce9afb755f286e2b0682`,
- Pages run `34204224161` on `053d4cc7f8befdb747ebce9afb755f286e2b0682`: **SUCCESS**.

Combined real-device/browser evidence across the block:

- IM-14A responsive shell verified on iPhone/Safari and iPad/Safari: **PASS / 0 BLOCKER**,
- IM-14B unified Pointer/Touch boundary verified on iPhone/Safari and iPad/Safari: **PASS / 0 BLOCKER**,
- IM-14C HUD verified on iPhone/Safari with Population 3 / Gold 3 and read-only ownership: **PASS / 0 BLOCKER**,
- IM-14D Building/Person selection, Context projection, Empty-World clear, Drag/Pan and Pinch guard verified on iPhone/Safari: **PASS / 0 BLOCKER**,
- IM-14E one-finger Pan, two-finger zoom, Pan after zoom, Building/Person selection regression, no accidental Drag/Pinch selection and corrected Frozen Camera Policy evidence verified on iPhone/Safari: **PASS / 0 BLOCKER**.

**Whole-block gate result: IM-14 = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 5. Current gate

IM-14 is now frozen as a whole block. No additional IM-14 feature implementation is authorized.

The binding migration order places **IM-15 – Guidance / Inspector** after IM-14. The IM-14 freeze does not automatically authorize IM-15 implementation; the next permissible action is only reconciliation/definition of the next migration block against frozen IM-14, unless a separate repository control decision establishes another predecessor step.

## 6. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-14 UI / Mobile Foundation COMPLETE / FROZEN / PASS / 0 BLOCKER after whole-block regression of A–E, final CI/Pages verification and combined real-device evidence.
