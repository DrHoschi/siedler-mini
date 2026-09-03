# CR-09 – Path / Route Foundation Freeze Gate

## Scope
CR-09 is frozen only if CR-09A, CR-09B and CR-09C regress together without blockers.

The combined chain under test is:

`RouteContract → DeterministicGridPathfinder → RouteMovementIntegration → CarrierMovementContract`

## Required invariants
- CR-09A RouteContract regression passes.
- CR-09B deterministic Grid Pathfinding regression passes.
- CR-09C Movement ↔ Route Integration regression passes.
- The pathfinder produces a valid RouteContract.
- The generated waypoint order is preserved by movement.
- Partial and large movement steps do not skip route order.
- Final arrival ends exactly at the route target with carrier state `IDLE` and no active movement target.
- Repeated identical inputs produce identical route/movement results.
- Inputs and route data are not mutated.

## Explicitly not part of CR-09
- road preference
- road or terrain costs
- obstacle detection or avoidance
- dynamic replanning
- alternative-route scoring
- TransportJob lifecycle changes
- pickup/delivery policy changes

## Gate
Run `npm run test:cr09` and the full `npm run ci` regression.

Only PASS / 0 BLOCKER plus device PASS allows CR-09 – Path / Route Foundation to become FROZEN.
