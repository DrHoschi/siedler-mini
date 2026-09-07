import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { CarrierContract } from './carrier-contract.js';
import { CarrierMovementContract } from './carrier-movement-contract.js';
import { DeterministicWorldReachabilityIntegration } from './deterministic-world-reachability-integration.js';

function requireDomains(domains) {
  if (!domains?.units || typeof domains.units.get !== 'function') {
    throw new TypeError('CoreDomainStores-compatible domains.units required');
  }
  return domains;
}

function requireUnit(domains, unitId) {
  const entity = domains.units.get(unitId);
  if (!entity) throw new Error(`unknown runtime unit: ${unitId}`);
  return entity;
}

function normalizePosition(value, name) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError(`${name}.x and ${name}.y must be finite`);
  }
  return Object.freeze({ x, y });
}

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function makeResult({ entityKind, unitId, currentPosition, targetPosition, valid, reason, reachability = null }) {
  return Object.freeze({
    kind: 'runtime-entity-navigation-validation',
    entityKind,
    unitId,
    currentPosition,
    targetPosition,
    valid: Boolean(valid),
    reason,
    reachability,
  });
}

function evaluateNavigation({ map, traversability, currentPosition, targetPosition, entityKind, unitId }) {
  const start = normalizePosition(currentPosition, 'currentPosition');
  const target = targetPosition == null ? start : normalizePosition(targetPosition, 'targetPosition');
  const reachability = DeterministicWorldReachabilityIntegration.evaluate({
    map,
    traversability,
    startPosition: start,
    targetPosition: target,
  });

  return makeResult({
    entityKind,
    unitId,
    currentPosition: start,
    targetPosition: targetPosition == null ? null : target,
    valid: reachability.reachable,
    reason: reachability.reachable
      ? (targetPosition == null ? 'POSITION_VALID' : 'TARGET_REACHABLE')
      : reachability.reason,
    reachability,
  });
}

export class RuntimeEntityNavigationValidationIntegration {
  static validatePerson({ domains, map, traversability, personId, targetPosition = null } = {}) {
    const currentDomains = requireDomains(domains);
    const entity = requireUnit(currentDomains, personId);
    const identity = PersonResidentIdentityContract.define({
      personId: entity?.identity?.personId,
      existenceState: entity?.identity?.existenceState,
    });
    if (identity.personId !== personId) throw new Error(`person identity mismatch: ${personId}`);

    return evaluateNavigation({
      map,
      traversability,
      currentPosition: entity.position,
      targetPosition,
      entityKind: 'person',
      unitId: personId,
    });
  }

  static validateCarrierMovement({ domains, map, traversability, movement } = {}) {
    const currentDomains = requireDomains(domains);
    const record = CarrierMovementContract.define(movement);
    const entity = requireUnit(currentDomains, record.unitId);
    const carrier = CarrierContract.define(entity.carrier);
    if (carrier.unitId !== record.unitId) throw new Error(`carrier identity mismatch: ${record.unitId}`);

    const entityPosition = normalizePosition(entity.position, 'entity.position');
    if (!samePosition(entityPosition, record.currentPosition)) {
      return makeResult({
        entityKind: 'carrier',
        unitId: record.unitId,
        currentPosition: entityPosition,
        targetPosition: record.targetPosition,
        valid: false,
        reason: 'ENTITY_POSITION_MISMATCH',
      });
    }

    return evaluateNavigation({
      map,
      traversability,
      currentPosition: entityPosition,
      targetPosition: record.targetPosition,
      entityKind: 'carrier',
      unitId: record.unitId,
    });
  }
}
