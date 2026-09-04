# Neue Siedler – Current Development Workflow

**Purpose:** Operative, continuously maintained development control file for `DrHoschi/siedler-mini`.

This file is the first status source ChatGPT should inspect before changing code in this repository. It must be updated whenever the active CR, active branch, freeze state, or next permitted step changes.

## 1. Authoritative repository

- Repository: `DrHoschi/siedler-mini`
- Default branch: `main`
- Current development branch: `feature/cr-21a-next-cell-reservation-intent-contract`
- Current development block: **CR-21A – Next Cell Reservation Intent Contract**
- Current branch head when this file was introduced: `0dadceaeabfb01d8e517f36abf29f373407fd9d4`
- Frozen baseline below the active block: **CR-20 – Reservation Lifecycle Foundation**

## 2. Mandatory source-of-truth order

Before any implementation, review, freeze statement, or next-step recommendation, use this order:

1. Confirm repository is exactly `DrHoschi/siedler-mini`.
2. Read this file from the intended working branch.
3. Confirm the actual active branch and its current HEAD commit.
4. Inspect the current CR implementation, tests/browser gate, CI workflow, and relevant frozen regression tests.
5. Inspect recent commits for the active CR when necessary.
6. Treat old root documentation, old monolith files, legacy branches, old plans, and chat recollections as non-authoritative unless the current branch explicitly references them.
7. Only after these checks may ChatGPT state what is ACTIVE, COMPLETE, FROZEN, blocked, or next.

**Repository state outranks chat memory. Current branch state outranks old documentation.**

## 3. Current status

| Order | Block / Gate | Status | Permitted action |
|---:|---|---|---|
| 1 | CR-20 – Reservation Lifecycle Foundation | FROZEN baseline | Regression only; do not silently modify |
| 2 | CR-21A – Next Cell Reservation Intent Contract | ACTIVE / implemented and gated | Validate exact scope and regressions |
| 3 | CR-21A completion / freeze gate | NEXT | Run full CR-21A gate + required frozen regressions; PASS / 0 blocker required |
| 4 | CR-21A freeze declaration | BLOCKED until step 3 passes | Mark FROZEN only after verified PASS / 0 blocker |
| 5 | Next CR sub-block | LOCKED | Do not start, name, branch, or implement until CR-21A is formally closed and the next scope is explicitly established |

## 4. CR-21A scope contract

CR-21A defines **only** the intent of a carrier to require a reservation for the immediately next already-determined route point.

Required boundary:

- Carrier is located at a reached route point.
- `nextCell` may only describe the directly following waypoint or direct route target.
- Exactly one cell is described.
- No multi-cell lookahead.
- No new `CellReservation` creation as part of this contract.
- No automatic arbitration.
- No movement change.
- No modification of frozen CR-19 or CR-20 behavior.

## 5. Next actions for the current branch

1. Verify the CR-21A implementation matches the scope contract exactly.
2. Verify CR-21A self-test/browser gate and CI naming are wired correctly.
3. Run the CR-21A gate together with the required frozen CR-20 regression.
4. Check for accidental movement, reservation, arbitration, pathfinding, or multi-cell-lookahead behavior outside CR-21A scope.
5. If and only if all checks are PASS / 0 blocker, record CR-21A as FROZEN.
6. Only then establish the next CR/sub-block and create/use its dedicated branch.
7. Update this file in that new branch with the new active CR, branch, frozen baseline, and next permitted gate.

## 6. Freeze rules

A block is **not** FROZEN because:

- implementation exists,
- the browser looks correct,
- one self-test says PASS,
- CI happened to run once,
- a chat response called it complete,
- or the next CR has already been discussed.

A block may be called **FROZEN** only when its defined completion/regression gate has been checked and the result is explicitly **PASS / 0 blocker**.

Frozen blocks are immutable baselines for later CRs. Later work may depend on them and regress them, but must not silently expand or alter their contract.

## 7. Branch rules

- One active CR/sub-block per feature branch.
- Branch name must match the CR and purpose.
- Before writing, verify the target branch; never assume the currently discussed CR equals the checked-out/remote branch.
- Never write current modular work into an old legacy/monolith branch by accident.
- Do not create the next feature branch merely because the next idea is known; first close the current gate.
- A branch name alone does not prove a CR is complete or frozen.

## 8. Test / CI rules

Each CR must carry the tests appropriate to its own contract and must continue to regress the frozen boundary it builds upon.

For CR-21A, the CI currently names the gate as:

`CR-21A Next Cell Reservation Intent Contract gate + CR-20 frozen regression`

When advancing to a later CR, update CI/test naming so it always describes the **actual active gate** and the **actual frozen regression baseline**. Never leave the previous CR name behind.

## 9. Known mistakes that must not recur

### 9.1 Wrong active CR inferred from chat
We previously treated CR-20A/CR-20 as if it were still current even though the repository had already advanced to CR-21A.

**Prevention:** Always inspect repository + active branch + HEAD + current gate before stating the development status.

### 9.2 Exact CR suffix lost
Names such as `CR-20A` were shortened or changed in follow-up wording, which made the scope ambiguous.

**Prevention:** Preserve the exact CR identifier (`A`, `B`, `C`, gate, freeze) in filenames, branch names, test labels, UI text, commits, and status messages.

### 9.3 Freeze declared too early
A working intermediate result was sometimes described as frozen without an explicit completion/regression gate.

**Prevention:** No `FROZEN` status without verified PASS / 0 blocker at the defined freeze gate.

### 9.4 Scope creep into later sub-blocks
Technically obvious follow-up behavior can accidentally be implemented before its own CR.

**Prevention:** The current CR contract is a hard upper boundary. Anything belonging to the next CR remains absent even if implementation would be easy.

### 9.5 Old monolith / legacy material treated as current architecture
The repository still contains older documentation and legacy-era structure. Root `README.md` and `Projekt_Masterliste.md` contain historical information and are not sufficient to determine the current modular CR architecture.

**Prevention:** Current feature-branch code, CR gates, CI, recent commits, and this workflow file outrank old root documentation for development-state decisions.

### 9.6 CI/test labels left on the previous CR
A technically correct implementation can still create confusion if CI, browser text, filenames, or status text retain the previous CR name.

**Prevention:** Naming alignment is part of every CR gate.

## 10. Mandatory ChatGPT pre-write checklist

Before changing repository content, ChatGPT must be able to answer all of these from repository evidence:

- Which repository am I changing?
- Which exact branch am I changing?
- Which exact CR/sub-block is ACTIVE?
- Which blocks are FROZEN baselines?
- What is explicitly inside the active CR scope?
- What is explicitly outside the active CR scope?
- Which tests/gates prove completion?
- What is the next permitted action, not merely the next planned idea?

If any answer is unclear, inspect the repository further before writing.

## 11. Maintenance rule for this file

Update this file as part of the normal CR transition whenever one of these changes:

- active branch,
- active CR/sub-block,
- frozen baseline,
- completion/freeze result,
- next permitted step,
- authoritative status/gate path,
- or a newly discovered process mistake worth preventing.

Do **not** turn this file into a full historical diary. Keep it as a compact current operating contract.

---

**Introduced:** 2026-09-04 during CR-21A.
