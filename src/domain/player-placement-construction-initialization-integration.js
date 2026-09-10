import { parseStableId } from '../world/stable-id.js';
import { BuildingConstructionStateContract } from './building-construction-state-contract.js';

function requireAdmittedConstruction(value) {
  if (!value || value.kind !== 'player-construction-runtime-admission-result') {
    throw new TypeError('player construction runtime admission result required');
  }
  if (value.status !== 'ADMITTED' || value.admitted !== true || value.reason !== 'RUNTIME_RUNNING') {
    throw new TypeError('admitted RUNNING player construction result required');
  }

  const parsed = parseStableId(value.buildingId);
  if (!parsed || parsed.kind !== 'building') {
    throw new TypeError(`invalid admitted building id: ${value.buildingId}`);
  }

  const definitionId = String(value.definitionId ?? '').trim();
  if (!definitionId) throw new TypeError('admitted construction requires definitionId');

  return Object.freeze({
    admission: value,
    buildingId: parsed.id,
    definitionId,
  });
}

export class PlayerPlacementConstructionInitializationIntegration {
  static initialize(admissionResult) {
    const admitted = requireAdmittedConstruction(admissionResult);
    const constructionState = BuildingConstructionStateContract.define({
      buildingId: admitted.buildingId,
      state: BuildingConstructionStateContract.states.PENDING,
    });

    return Object.freeze({
      kind: 'player-placement-construction-initialization',
      buildingId: admitted.buildingId,
      definitionId: admitted.definitionId,
      constructionState,
      sourceAdmission: admitted.admission,
    });
  }
}
