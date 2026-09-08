# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-14 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15 COMPLETE / FROZEN / PASS / 0 BLOCKER; IM-15A/B/C/D/E COMPLETE / FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Whole-block branch:** `feature/im-15-guidance-inspector`  
**Whole-block base:** frozen IM-14 @ `053d4cc7f8befdb747ebce9afb755f286e2b0682`

## 1. Frozen line

CR-25 through CR-32, IM-13, IM-14 and IM-15A/B/C/D/E remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

Whole-block frozen marker: `frozen/im-15-guidance-inspector`.

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

## 9. Current gate

**IM-15 Whole Block = COMPLETE / FROZEN / PASS / 0 BLOCKER.**

The final frozen marker `frozen/im-15-guidance-inspector` is to be created at the final documentation HEAD produced by this closing gate sequence. That marker creation is a mechanical freeze operation only.

No next migration block is authorized in this same step.

After the final marker exists, the next permissible action is exclusively reconciliation of the next migration block against frozen IM-15. No implementation is automatically authorized.

---

**Updated:** 2026-09-08 — IM-15 Guidance / Inspector Whole Block COMPLETE / FROZEN / PASS / 0 BLOCKER after combined diff, frozen-chain, CI/Pages, ownership and cumulative real-device regression. No next migration block in this step.
