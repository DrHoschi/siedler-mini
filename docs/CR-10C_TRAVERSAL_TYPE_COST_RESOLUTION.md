# CR-10C – Traversal Type → Cost Resolution

## Purpose
CR-10C resolves a grid cell's traversal type to the immutable CR-10A traversal cost contract used by CR-10B.

## Resolution flow
`grid position -> typeAt(position) -> traversal type -> configured CR-10A cost profile -> costAt(position)`

Supported traversal types remain `NEUTRAL`, `PATH`, and `ROAD`.

## Important boundary
CR-10C does not assign an automatic advantage to PATH or ROAD. The default resolver gives every type cost `1`. Different costs only exist when explicitly configured in resolver profiles.

CR-10B remains unchanged and consumes the resolver's `costAt` function through its existing interface.

## Explicitly out of scope
- automatic road preference policy
- blocked or impassable cells
- obstacle detection or avoidance
- dynamic route recalculation / re-routing
- movement changes
- terrain or slope policy

## Gate
`npm run test:cr10c`

After CR-10C PASS / 0 Blocker, CR-10A/B/C receive a separate combined CR-10 freeze gate.
