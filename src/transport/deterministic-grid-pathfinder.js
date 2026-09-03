import { RouteContract } from './route-contract.js';

function normalizeGridPosition(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be a grid position object`);
  }
  const x = Number(value.x);
  const y = Number(value.y);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new TypeError(`${name}.x and ${name}.y must be safe integers`);
  }
  return Object.freeze({ x, y });
}

function assertMap(map) {
  if (!map || typeof map.contains !== 'function') {
    throw new TypeError('MapStructure-compatible instance required');
  }
}

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

export class DeterministicGridPathfinder {
  static find({ map, startPosition, targetPosition } = {}) {
    assertMap(map);
    const start = normalizeGridPosition(startPosition, 'startPosition');
    const target = normalizeGridPosition(targetPosition, 'targetPosition');

    if (!map.contains(start.x, start.y)) {
      throw new RangeError(`startPosition outside map: ${start.x},${start.y}`);
    }
    if (!map.contains(target.x, target.y)) {
      throw new RangeError(`targetPosition outside map: ${target.x},${target.y}`);
    }
    if (samePosition(start, target)) {
      throw new Error('targetPosition must differ from startPosition');
    }

    const steps = [];
    let x = start.x;
    let y = start.y;

    const xStep = Math.sign(target.x - x);
    while (x !== target.x) {
      x += xStep;
      steps.push(Object.freeze({ x, y }));
    }

    const yStep = Math.sign(target.y - y);
    while (y !== target.y) {
      y += yStep;
      steps.push(Object.freeze({ x, y }));
    }

    return RouteContract.define({
      startPosition: start,
      targetPosition: target,
      waypoints: steps.slice(0, -1),
      state: 'DEFINED'
    });
  }
}
