# CR-09B – Deterministic Grid Pathfinding

## Purpose
CR-09B adds the first automatic route generation between two already-known grid positions. It builds directly on the frozen CR-09A RouteContract.

## Contract
- Input positions are integer grid-cell coordinates `{x,y}`.
- Start and target must exist inside the supplied MapStructure.
- Start and target must differ.
- Output is a CR-09A-compatible `RouteContract` in state `DEFINED`.
- `waypoints` contain ordered intermediate grid cells only; start and target remain in their dedicated fields.

## Deterministic rule
Because CR-09B has no obstacles or costs, the route is the shortest Manhattan path. Tie-breaking is fixed and reproducible:
1. Resolve the X difference completely.
2. Resolve the Y difference completely.

For `(1,1) -> (3,3)`, the traversed cells are `(2,1) -> (3,1) -> (3,2) -> (3,3)` and the RouteContract waypoints are `(2,1), (3,1), (3,2)`.

## Explicitly out of scope
- road preference or road costs
- terrain costs
- obstacles, passability or avoidance
- reachability/failure search around blocked cells
- diagonal movement
- carrier movement or route following
- TransportJob integration
- route lifecycle transitions
- replanning

These belong to later blocks. CR-09C will connect movement to an already-defined route.

## Gate
Run `npm run test:cr09b`. PASS requires all CR-09B checks plus the existing domain regression in CI.
