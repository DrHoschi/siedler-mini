# CR-10B – Deterministic Cost-Aware Pathfinding

## Purpose
CR-10B introduces the first pathfinder that may choose among otherwise traversable grid routes by comparing CR-10A traversal costs.

## Rules
- Orthogonal 4-neighbor grid movement only.
- Cost is paid when entering a cell.
- Every visited cell remains traversable; CR-10B has no blocked-cell concept.
- `costAt({x,y})` supplies a CR-10A-compatible traversal-cost record.
- Missing `costAt` means neutral cost `1` everywhere.
- Lowest total traversal cost wins.
- Equal-cost alternatives use a fixed deterministic neighbor/insertion tie-break.
- Result is a standard frozen CR-09 `RouteContract`.

## Compatibility
With neutral costs everywhere, CR-10B must reproduce the frozen CR-09 deterministic X-first route.

## Explicitly out of scope
- automatic ROAD or PATH discounts
- road preference policy
- blocked cells or obstacles
- obstacle avoidance
- dynamic cost changes during movement
- route recalculation / re-routing
- movement integration changes
- TransportJob or carrier assignment changes

## Gate
`npm run test:cr10b`

CR-09 remains frozen. CR-10A is the traversal-cost data prerequisite.
