# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

Repository state outranks chat memory. Before every write read this file, `docs/ROADMAP_CURRENT.md`, the actual branch/HEAD, current gates and CI.

## 1. Current authoritative state

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main` — historical old-game reference only
- Current whole-CR branch: `feature/cr-30-housing-population-gold-integration-foundation`
- Frozen whole-CR predecessor: **CR-29 – Camera & World View Foundation**
- Frozen whole-CR predecessor marker: `frozen/cr-29-camera-world-view-foundation`
- Frozen whole-CR predecessor commit: `560334f6481aef0398b699d21100d0079ea429f1`
- CR-25 – BuildingStock / Production Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-26 – Workforce Capability & Job Eligibility Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-27 – Game-Facing Logistics Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-28 – Visible World Runtime Integration Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-29 – Camera & World View Foundation: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-30 – Housing / Population / Gold Integration Foundation: **ACTIVE / NOT FROZEN**
- CR-30A – Home & Housing Capacity Contract: **COMPLETE / FROZEN / PASS / 0 BLOCKER**
- CR-30A freeze marker: `frozen/cr-30a-home-housing-capacity-contract`
- CR-30A frozen commit: `f74d6bc1399212650c11196f8f098a419eda6cbf`
- Current authorized substep: **CR-30B – Deterministic Housing & Population Integration**
- CR-30C: **PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**
- Next allowed action: implement and directly verify **CR-30B only** on the existing whole-CR branch.

## 2. CR-30 boundary

CR-30 implements the still-open IM-10 – Housing / Population / Gold Integration boundary after the frozen Logistics/Reservation line and before later Navigation, Path/Wear, SaveGame, UI/Mobile and Inspector work.

CR-23A remains the authoritative stable Person/Resident identity. CR-30 adds housing/home/population/economy integration around that identity without rewriting it.

## 3. CR-30A – Home & Housing Capacity Contract

**COMPLETE / FROZEN / PASS / 0 BLOCKER**.

Frozen implementation boundary:

- stable Building identity may expose immutable `building-housing` with deterministic non-negative capacity,
- stable existing Person identity may receive immutable `resident-home-assignment`,
- one supplied active assignment truth rejects a second assigned Home for the same Person,
- exhausted housing capacity rejects additional assignment,
- Building and Person stable identities remain unchanged,
- CR-23A identity remains free of Home/Housing fields,
- no automatic resident creation, derived Population truth or Gold is introduced.

Implementation evidence:

- `src/domain/housing-home-capacity-integration-contract.js`
- `src/dev/cr-30a-self-test.node.js`
- GitHub Actions run `34057988131` on code HEAD `338db9bd3b91a3d664ea3f80919e43253da2a05f`: frozen regression + CR-24C + CR-28 + whole CR-29 + CR-30A direct self-test = **PASS / 0 BLOCKER**.
- subsequent control-document reconciliation run `34058100873` = **SUCCESS**.
- GitHub Pages deployment for the CR-30A visible build completed successfully on the same CR-30A implementation line.

Browser/device evidence accepted on 2026-09-06:

- real iPad / Safari browser verification supplied by the user,
- page title visibly identifies CR-30A,
- visible panel heading: `CR-30A – Home & Housing Capacity Contract`,
- runtime/test box visibly identifies `CR-30A ACTIVE`,
- 3 Buildings / 3 Persons remain visible on the preserved CR-29 presentation world,
- no stale CR-16/CR-28/CR-29 identity is presented as the current build,
- result: **BROWSER VERIFIED / PASS / 0 BLOCKER**.

Visible/build identity synchronization included document title, visible heading/copy, accessibility label, runtime/test status, cache-busting identifiers, console identity and correction of `RuntimeConfig.build` to `CR-30A-HOME-HOUSING-CAPACITY-CONTRACT`. This changed no frozen camera/render/gameplay behavior.

Freeze decision:

- marker: `frozen/cr-30a-home-housing-capacity-contract`
- commit: `f74d6bc1399212650c11196f8f098a419eda6cbf`
- CR-30A is closed against further unapproved modification.

## 4. CR-30B – Deterministic Housing & Population Integration

**AUTHORIZED / ACTIVE / NOT FROZEN**.

Allowed scope:

- build only on the frozen CR-30A Home/Housing-capacity contract,
- existing real Persons may be assigned to valid housing by one controlled deterministic policy,
- Population must be derived exclusively from real valid resident/home truth,
- no independent mutable Population counter or second Population truth may be introduced,
- only genuinely remaining free housing capacity may create general residents,
- any generated general resident must become a real stable Person before counting toward Population,
- specialist/workforce identities must not be randomly invented by housing integration,
- capacity and one-home invariants from CR-30A remain binding.

Explicit non-scope:

- no Gold yet,
- no SaveGame/restore behavior,
- no UI/Inspector feature work,
- no Navigation/Path/Wear changes,
- no BuildingStock, Workforce, Logistics, camera or render ownership changes except read-only relationships required by this contract,
- no change to CR-23A stable identity semantics.

If the visible browser/test page is used as CR-30B evidence, all visible/build identity surfaces must first be synchronized from CR-30A to **CR-30B – Deterministic Housing & Population Integration**.

## 5. CR-30C – Gold Economy Integration

**PLANNED / NOT YET IMPLEMENTATION-AUTHORIZED**.

Planned boundary: Gold is owned by a clear economy owner and derived/generated from real valid residents. Gold remains explicitly non-physical and must not be inserted into BuildingStock or Logistics. No restore surcharge/additional restore tax.

## 6. CR-30 Completion / Regression / Freeze Gate

After A+B+C are complete, regress CR-30 as a whole against the frozen CR-29 predecessor and all relevant frozen contracts. Only **PASS / 0 BLOCKER** may freeze CR-30. No successor CR is implicitly authorized by that freeze.

## 7. Permanent visible CR / build identity synchronization rule

Before a browser/device gate, before declaring a visible substep PASS, and again before a whole-CR Freeze Gate, verify that every applicable visible/build identity surface names the current authorized CR/substep and does not retain stale predecessor identity. This includes page title, visible heading/copy, runtime/test status, accessibility labels, build/version identifiers, cache-busting/version identifiers and console/build labels.

A stale predecessor label is a verification defect and must be corrected before acceptance.

---

**Updated:** 2026-09-06 — CR-30A accepted with automated and real iPad/Safari browser evidence at PASS / 0 BLOCKER, frozen at `f74d6bc1399212650c11196f8f098a419eda6cbf`, and CR-30B explicitly authorized as the sole next implementation substep.
