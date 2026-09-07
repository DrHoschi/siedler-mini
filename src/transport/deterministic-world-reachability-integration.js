import { DeterministicCostAwarePathfinder } from './deterministic-cost-aware-pathfinder.js';

function requireMap(map) {
  if (!map || typeof map.contains !== 'function' || typeof map.snapshot !== 'function') {
    throw new TypeError('MapStructure-compatible map required');
  }
  return map;
}

function requireTraversability(source) {
  if (!source || typeof source.isTraversable !== 'function') {
    throw new TypeError('WorldBackedTraversabilitySource-compatible source required');
  }
  return source;
}

function normalizeWorldPosition(value, name) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError(`${name}.x and ${name}.y must be finite`);
  }
  return Object.freeze({ x, y });
}

function worldToGrid(map, worldPosition, name) {
  const snapshot = map.snapshot();
  const originX = Number(snapshot?.map?.origin?.x);
  const originY = Number(snapshot?.map?.origin?.y);
  const cellSize = Number(snapshot?.map?.cellSize);
  if (!Number.isFinite(originX) || !Number.isFinite(originY) || !Number.isFinite(cellSize) || !(cellSize > 0)) {
    throw new TypeError('map snapshot requires finite origin and positive cellSize');
  }
  const cell = Object.freeze({
    x: Math.floor((worldPosition.x - originX) / cellSize),
    y: Math.floor((worldPosition.y - originY) / cellSize),
  });
  if (!map.contains(cell.x, cell.y)) {
    throw new RangeError(`${name} outside map: ${worldPosition.x},${worldPosition.y}`);
  }
  return cell;
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function result({ reachable, reason, startWorld, targetWorld, startCell, targetCell }) {
  return Object.freeze({
    kind: 'world-reachability',
    reachable: Boolean(reachable),
    reason,
    startPosition: startWorld,
    targetPosition: targetWorld,
    startCell,
    targetCell,
  });
}

function traversableMapView(map, traversability) {
  return Object.freeze({
    contains(x, y) {
      return map.contains(x, y) && traversability.isTraversable(Object.freeze({ x: Number(x), y: Number(y) }));
    },
  });
}

export class DeterministicWorldReachabilityIntegration {
  static evaluate({ map, traversability, startPosition, targetPosition } = {}) {
    const currentMap = requireMap(map);
    const currentTraversability = requireTraversability(traversability);
    const startWorld = normalizeWorldPosition(startPosition, 'startPosition');
    const targetWorld = normalizeWorldPosition(targetPosition, 'targetPosition');
    const startCell = worldToGrid(currentMap, startWorld, 'startPosition');
    const targetCell = worldToGrid(currentMap, targetWorld, 'targetPosition');

    if (!currentTraversability.isTraversable(startCell)) {
      return result({ reachable: false, reason: 'START_BLOCKED', startWorld, targetWorld, startCell, targetCell });
    }
    if (!currentTraversability.isTraversable(targetCell)) {
      return result({ reachable: false, reason: 'TARGET_BLOCKED', startWorld, targetWorld, startCell, targetCell });
    }
    if (sameCell(startCell, targetCell)) {
      return result({ reachable: true, reason: 'REACHABLE', startWorld, targetWorld, startCell, targetCell });
    }

    try {
      DeterministicCostAwarePathfinder.find({
        map: traversableMapView(currentMap, currentTraversability),
        startPosition: startCell,
        targetPosition: targetCell,
      });
      return result({ reachable: true, reason: 'REACHABLE', startWorld, targetWorld, startCell, targetCell });
    } catch (error) {
      if (error instanceof Error && error.message === 'no traversable route found') {
        return result({ reachable: false, reason: 'NO_TRAVERSABLE_CONNECTION', startWorld, targetWorld, startCell, targetCell });
      }
      throw error;
    }
  }
}
