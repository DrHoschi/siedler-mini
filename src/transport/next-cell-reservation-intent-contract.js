import { RouteContract } from './route-contract.js';

function asUnitId(value) {
  const id = String(value ?? '').trim();
  if (!/^unit:\d{8}$/.test(id)) throw new TypeError(`carrierId requires unit stable id: ${value}`);
  return id;
}

function asCell(value, name) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new TypeError(`${name}.x and ${name}.y must be safe integers`);
  }
  return Object.freeze({x,y});
}

function sameCell(a,b) {
  return a.x === b.x && a.y === b.y;
}

function routePoints(route) {
  return Object.freeze([route.startPosition, ...route.waypoints, route.targetPosition]);
}

export class NextCellReservationIntentContract {
  static define({carrierId, route, currentPosition, nextCell} = {}) {
    const normalizedRoute = RouteContract.define(route);
    if (normalizedRoute.state === 'COMPLETED') {
      throw new Error('completed route cannot declare a next-cell reservation intent');
    }

    const current = asCell(currentPosition, 'currentPosition');
    const next = asCell(nextCell, 'nextCell');
    const points = routePoints(normalizedRoute);
    const currentIndex = points.findIndex(point => sameCell(point,current));

    if (currentIndex < 0) {
      throw new Error('currentPosition must be an reached route point');
    }
    if (currentIndex >= points.length - 1) {
      throw new Error('route target has no next cell to reserve');
    }
    if (!sameCell(points[currentIndex + 1],next)) {
      throw new Error('nextCell must be the immediate next route cell');
    }

    return Object.freeze({
      kind:'next-cell-reservation-intent',
      status:'DECLARED',
      carrierId:asUnitId(carrierId),
      route:normalizedRoute,
      currentPosition:current,
      nextCell:next
    });
  }
}
