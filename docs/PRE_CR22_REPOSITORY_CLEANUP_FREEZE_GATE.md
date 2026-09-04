# Pre-CR22 Repository Cleanup / Roadmap Integration Gate

**Repository:** `DrHoschi/siedler-mini`  
**Branch:** `maintenance/pre-cr22-repository-cleanup`  
**Date:** 2026-09-04  
**Frozen predecessor:** CR-21 – Reservation-Controlled Traffic Execution Foundation  
**CR-21 frozen SHA:** `4cb7261dc2325767070177a68f951df69b7523fd`

## Result

**FINALIZATION CANDIDATE – PASS / 0 BLOCKER, exact baseline SHA pending final CI.**

The Pre-CR22 cleanup closes the repository cleanup and roadmap reconciliation phase without changing the frozen CR-21 gameplay contract.

## Verified evidence

- File / architecture cleanup: PASS / 0 BLOCKER.
- Historical root monolith removed from the active modular development line; marker files remain for legacy directories.
- Active modular runtime remains under `src/**`.
- Visual assets remain preserved.
- Misleading historical root documentation was relocated into `docs/legacy/`.
- README describes the modular runtime rather than the old monolith / Inspector architecture.
- IM ↔ CR reconciliation is documented in `docs/ROADMAP_CURRENT.md`.
- Useful unique content from divergent historical branches was reviewed and extracted into `docs/legacy/pre-cr22/BRANCH_EXTRACTION_SUMMARY.md` before deletion.
- Remote branch reduction is complete: only `main`, `gh-pages`, `frozen/cr-21-reservation-controlled-traffic-execution-foundation` and `maintenance/pre-cr22-repository-cleanup` remain.
- `main` remains historical functional / visual reference only and is not a code or integration target.
- Integrated cleanup candidate CI: GitHub Actions run `33919957496` / run #4800 = SUCCESS.
- Browser/device gate: PASS. The deployed final-cleanup page was manually confirmed on iPad/Safari on 2026-09-04; runtime status showed READY and the status/layout rendered correctly.

## Frozen architectural rule

The new game is a clean modular rebuild. Old `main` may be studied for desired historical behavior and visuals, but future implementation is rebuilt through modular owners, contracts, runtime boundaries and tests.

**Target: functional parity or better, never legacy-code parity.**

## Final baseline rule

After this synchronized finalization commit receives a green CI run, its exact commit SHA must be preserved on a dedicated cleaned-baseline branch. That SHA becomes the sole permitted parent for the next whole CR system branch.

Only after that baseline branch exists may the workflow mark:

**Pre-CR22 Repository Cleanup / Roadmap Integration Gate = PASS / 0 BLOCKER**

and unlock CR-22.
