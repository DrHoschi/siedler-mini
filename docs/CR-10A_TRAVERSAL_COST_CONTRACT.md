# CR-10A – Traversal Cost Contract

## Purpose
CR-10A defines only the immutable data contract used to describe traversal cost. It does not alter the frozen CR-09 pathfinder.

## Fields
- `baseCost`: finite number > 0; neutral default `1`.
- `traversalType`: `NEUTRAL`, `PATH`, or `ROAD` classification only.
- `costMultiplier`: finite number > 0; neutral default `1`.
- `traversalCost`: deterministic derived value `baseCost * costMultiplier`.

## Important boundary
The type does **not** itself imply a cheaper or preferred route. With defaults, NEUTRAL, PATH and ROAD all cost exactly `1`. Actual preference/policy belongs to later CR-10 blocks.

## Explicitly out of scope
- changes to `DeterministicGridPathfinder`
- cost-aware route search
- automatic road preference
- terrain cost policy
- obstacles / blocked cells
- route recalculation
- movement changes
- TransportJob / carrier assignment changes

## Gate
`npm run test:cr10a`

CR-09 remains a frozen regression prerequisite.
