# CR-09C – Movement ↔ Route Integration

## Purpose
CR-09C connects the frozen CR-08 movement primitive to an already-defined CR-09 route. A carrier now follows the route in order instead of targeting the final destination directly.

## Contract boundary
- Input: existing `RouteContract` + existing `CarrierMovementContract` + positive movement distance.
- Ordered movement targets are `route.waypoints`, followed by `route.targetPosition`.
- CR-08 `DirectTargetMovementExecution` remains the movement primitive for each individual segment.
- Reaching the final target returns an IDLE carrier at the exact route target.
- A large movement budget may consume several route segments, but never changes their order.

## Explicitly out of scope
- route/path search or recalculation
- grid-path generation changes
- road preference or road costs
- terrain costs
- obstacles, avoidance or reachability logic
- TransportJob state transitions
- pickup/delivery settlement
- carrier assignment

CR-09C only answers: **How does an existing carrier movement follow an existing route waypoint by waypoint?**

## Gate
`npm run test:cr09c`

CR-09A and CR-09B remain regression prerequisites. After CR-09C PASS / 0 Blocker, CR-09 receives a separate combined freeze gate.
