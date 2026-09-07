# Neue Siedler – Current Roadmap / IM ↔ CR Reconciliation

**Status:** CURRENT – IM-13A/B/C/D + WHOLE IM-13 FROZEN / PASS / 0 BLOCKER  
**Repository:** `DrHoschi/siedler-mini`  
**Current whole-block branch:** `feature/im-13-savegame-foundation`  
**Whole-block base:** frozen CR-32 @ `845fa5d5f513ac3a974bbae0a81bc78652e9e674`

## 1. Frozen line

CR-25 through CR-32 remain **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

IM-13A – SaveGame Snapshot Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `fadacda7f728f57b3b97cbb1771284e5d609d805`.

IM-13B – Deterministic SaveGame Validation Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `0a4b225d86e239cc2b2d80c20166faafe483aa20`.

IM-13C – Deterministic SaveGame Restore Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `21aa0a3e42f84cb713bc681467cd3a0b075f2bff`.

IM-13D – Deterministic Restored Runtime Activation & Derived Rebinding Contract is **COMPLETE / FROZEN / PASS / 0 BLOCKER** at `f34d8012f1562bba7879858b860920a3c67471b8`.

IM-13 – Deterministic SaveGame Snapshot / Restore Foundation is **COMPLETE / FROZEN / PASS / 0 BLOCKER** after Whole-Block regression and real-device verification.

## 2. Binding migration order

- IM-09 – Logistics & Reservation Migration,
- IM-10 – Housing / Population / Gold Integration,
- Navigation – CR-31,
- Path / Wear – CR-32,
- **IM-13 – SaveGame — COMPLETE / FROZEN**,
- IM-14 – UI/Mobile,
- IM-15 – Guidance/Inspector.

## 3. Frozen IM-13 Foundation contract

The reconciled IM-13 Foundation consists exactly of frozen A+B+C+D:

- A: canonical versioned authoritative snapshot/capture,
- B: deterministic side-effect-free validation,
- C: all-or-nothing authoritative restore with Stable-ID/allocator continuity,
- D: atomic activation of restored B plus dependent transient/derived rebinding.

Persisted truth remains World/Map, CoreDomainStores, Gold and CR-32 PATH/ROAD wear. Population, Reachability/Navigation results, pathfinder/routes, wear-aware traversal costs, render projection and Camera/View state are not competing persisted truth.

The frozen end-to-end Foundation chain is:

`active Runtime A -> Capture -> Serialize/Parse -> Validate -> Restore B -> Activate B -> active Runtime B -> Capture B`

with canonical Capture A/Capture B identity.

## 4. IM-13 Whole-Block Completion / Regression / Freeze Gate

Status: **COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Accepted evidence:

- Whole-Block node regression `src/dev/im-13-freeze-gate.node.js` PASS,
- CI SUCCESS including frozen CR-31/CR-32 regression plus Whole-IM-13 A+B+C+D regression,
- full branch diff against frozen CR-32 reviewed within IM-13 scope,
- Pages deployment SUCCESS,
- real iPhone/Safari evidence 2026-09-07 20:10 local: READY, visible identity `IM-13 – Whole-Block Completion / Regression / Freeze Gate`, PASS / 0 BLOCKER, A Snapshot PASS, B Validation PASS, C Restore PASS, D Activation/Rebinding PASS and canonical Capture A -> Restore/Activate B -> Capture B IDENTISCH.

## 5. Explicitly locked follow-up work

The IM-13 freeze does not automatically authorize later work. The following remain locked until separately reconciled/authorized:

- IM-14 UI/Mobile,
- IM-15 Guidance/Inspector,
- Save-Slots and storage adapters,
- LocalStorage/file-system save/load,
- Autosave,
- Cloud/Multiplayer synchronization,
- compression/encryption,
- historical schema migration beyond schemaVersion 1,
- new gameplay or ownership changes.

## 6. Current gate

There is no automatically authorized successor. The next permissible action is reconciliation/definition of the next migration block against the now frozen IM-13 boundary.

---

**Updated:** 2026-09-07 — Whole-IM-13 PASS / 0 BLOCKER with real iPhone/Safari evidence; IM-13 frozen as a whole.
