# CR-09A – Route Contract

Status: IMPLEMENTED / TEST GATE ADDED

## Purpose

CR-09A introduces the smallest possible data contract for describing a route between an already known start position and target position.

It answers only:

> What route is defined from this start to this target?

It does not answer how that route is found or how a carrier follows it.

## Contract

`RouteContract.define(...)` creates an immutable route with exactly these domain fields:

- `kind: 'route'`
- `state`
- `startPosition`
- `targetPosition`
- `waypoints`

Positions use the same `{ x, y }` shape already established by CR-08. Both coordinates must be finite numbers.

### Waypoint semantics

`waypoints` is an ordered array of intermediate positions only.

- The array order is preserved exactly.
- Start and target remain separate contract fields and are not inserted automatically.
- An empty waypoint array is valid and represents a route description with no intermediate points.
- CR-09A performs no adjacency, reachability, grid, obstacle or cost validation.

### Route states

The contract recognizes only:

- `DEFINED` – a route description exists.
- `ACTIVE` – reserved lifecycle state for later route execution integration.
- `COMPLETED` – reserved lifecycle state for later route execution integration.

CR-09A itself performs no state transition and has no execution behavior.

## Invariants

A valid route must satisfy all of the following:

1. `startPosition` is a finite `{ x, y }` position.
2. `targetPosition` is a finite `{ x, y }` position.
3. Start and target are different positions.
4. `waypoints` is an array.
5. Every waypoint is a finite `{ x, y }` position.
6. Waypoint order is preserved.
7. The produced route and all nested route data are frozen.
8. Input objects are not mutated.
9. `state` is one of `DEFINED`, `ACTIVE`, `COMPLETED`.

## Explicitly out of scope

CR-09A contains no:

- path or route search
- grid pathfinding
- automatic waypoint generation
- road preference or road costs
- terrain costs
- obstacle detection or avoidance
- reachability analysis
- carrier assignment
- carrier movement
- speed, velocity or movement progress
- TransportJob integration
- automatic route lifecycle transitions

## Boundary to adjacent blocks

### CR-08 – FROZEN

CR-08 owns controlled carrier movement and direct-target movement execution. CR-09A does not change those contracts or services.

### CR-09B – planned

CR-09B may introduce deterministic grid pathfinding that produces route data matching this contract.

### CR-09C – planned

CR-09C may integrate CR-08 movement with routes so a carrier consumes the ordered intermediate waypoints and then the final target.

Road costs, preferred paths and obstacle policies remain separate later concerns.

## Test gate

Run:

```sh
npm run test:cr09a
```

The CR-09A self-test checks contract shape, immutability, waypoint ordering, validation, legal states, no input mutation and the absence of pathfinding/movement policy fields.
