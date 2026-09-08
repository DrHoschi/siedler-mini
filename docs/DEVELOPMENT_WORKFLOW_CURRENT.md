# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current control line: `feature/im-14-ui-mobile-foundation`
- Frozen predecessor: IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`
- **IM-14 – UI / Mobile Foundation: COMPLETE / FROZEN / PASS / 0 BLOCKER**
- **IM-15 – Guidance / Inspector: RECONCILED / DEFINED / NOT IMPLEMENTED**
- First planned substep: **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract**
- No IM-15 whole-block branch has been authorized or created by this reconciliation step.

## 2. Frozen IM-14 composition

IM-14 freezes the complete player-facing UI/mobile foundation as the composition of five separately verified boundaries:

- **IM-14A:** responsive Player UI Shell with Topbar, World/Canvas and Action regions, safe-area handling and Canvas↔World binding,
- **IM-14B:** neutral unified Pointer/Touch lifecycle and deterministic UI-vs-WORLD classification,
- **IM-14C:** read-only Runtime HUD projection for authoritative Population and Gold,
- **IM-14D:** ephemeral Building/Person selection and read-only Context projection with Empty-World clear and Drag/Pinch selection guard,
- **IM-14E:** player camera gesture integration over the shared WORLD input using the frozen camera-control functions and zoom policy.

Ownership remains separated: UI does not own simulation/domain/persistence state; HUD does not create a second Population/Gold truth; Selection does not mutate selected runtime/domain objects; Camera integration owns gesture interpretation only. Inspector/Guidance remained outside IM-14 and starts only as the separately reconciled IM-15 boundary below.

## 3. Frozen IM-14 markers

- `frozen/im-14a-player-ui-shell-responsive-surface-contract` @ `4ba4e152931058c9e6b62e2e26489f378779e80f`
- `frozen/im-14b-unified-pointer-touch-interaction-contract` @ `8aa7594f4debcc838382ca6f49fcdcbadf9be324`
- `frozen/im-14c-runtime-hud-projection` @ `788358677092ef91d7edf1c0d8a6a82efacc5f21`
- `frozen/im-14d-world-selection-context-projection` @ `72b234e0ada95afa324d62d83274ee1f320abe37`
- `frozen/im-14e-player-camera-controls-integration` @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

**Whole-block gate result: IM-14 = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

## 4. IM-15 – Guidance / Inspector reconciliation

IM-15 is the next migration block after frozen IM-14. Its purpose is to establish a new modular Guidance/Inspector capability for diagnosis, observation, visual verification, controlled simulation/testing support and later balancing without transferring gameplay/domain/persistence ownership into the Inspector.

Binding ownership rules:

- Inspector is not a gameplay owner and must not create a second authoritative runtime truth.
- Runtime/domain state is observed through existing authoritative owners and explicit read-only projections.
- The old `main` Inspector/debug architecture is not an integration target; `main` may be consulted only as historical functional/visual reference.
- Diagnostic overlays remain observational and must not mutate world/gameplay state.
- Later diagnostic/test actions must use explicit controlled runtime/test boundaries rather than arbitrary state mutation.
- Automatic tests remain test code; the Inspector may later display results or trigger explicitly defined reproducible scenarios.

Planned IM-15 decomposition:

1. **IM-15A – Inspector Shell & Read-Only Runtime Observation Contract** — establish the modular Inspector surface and first read-only observation boundary. Initial observation may expose existing runtime/world identity and selected authoritative values such as Population, Gold and Building/Person identity. No simulation controls, scenario triggers, diagnostic overlays or balancing behavior.
2. **IM-15B – Structured Runtime Diagnostics Projection** — expose existing modular runtime systems through structured read-only diagnostics without duplicating ownership.
3. **IM-15C – World Diagnostic Overlay Foundation** — visualize selected diagnostic state in the world while remaining strictly non-mutating.
4. **IM-15D – Controlled Guidance / Diagnostic Scenario Actions** — allow only explicitly defined reproducible diagnostic/test actions through controlled boundaries.
5. **IM-15E – Simulation & Balancing Observation Foundation** — establish observation/collection of suitable runtime and long-running simulation metrics without automatic balancing or domain-rule changes.

After the final planned substep, IM-15 requires one combined Completion / Regression / Freeze Gate against frozen IM-14 before IM-15 may become FROZEN.

## 5. IM-15A exact first boundary

**IM-15A – Inspector Shell & Read-Only Runtime Observation Contract** is the first planned implementation substep, but implementation is not yet authorized.

Scope when separately authorized:

- new modular Inspector shell/surface separated from the player-facing IM-14 UI,
- explicit read-only observation contract against existing authoritative runtime owners,
- minimal first diagnostic projection sufficient to verify that the boundary works,
- no mutation of observed runtime/domain objects.

Explicit non-scope:

- no IM-15B structured full-system diagnostics,
- no world diagnostic overlays,
- no simulation controls or arbitrary state editing,
- no test/scenario triggering,
- no balancing logic or automatic balancing,
- no new gameplay/domain/persistence ownership,
- no reuse/import of the legacy `main` Inspector architecture.

## 6. Current gate

The IM-15 reconciliation/definition is documented. **No IM-15 implementation and no IM-15 whole-block branch is authorized by this step.**

The next permissible action is exclusively a separate decision whether to create the IM-15 whole-block branch from frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`. Only after successful branch creation may IM-15A implementation be separately authorized.

## 7. Permanent visible build identity synchronization rule

Every browser/device-verifiable CR/IM substep or Whole-Block gate must update all applicable visible/build identity surfaces in the same gate step. A stale predecessor label is a verification defect and blocks PASS/freeze.

---

**Updated:** 2026-09-08 — IM-15 Guidance / Inspector reconciled and defined against frozen IM-14; IM-15A fixed as first planned substep; no branch or implementation authorized.