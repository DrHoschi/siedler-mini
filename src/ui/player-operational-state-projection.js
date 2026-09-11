const PLAYER_OPERATIONAL_STATES = Object.freeze({
  NO_WORKER: 'NO_WORKER',
  WAITING_FOR_INPUT: 'WAITING_FOR_INPUT',
  READY_TO_PRODUCE: 'READY_TO_PRODUCE',
  PRODUCTION_SETTLED: 'PRODUCTION_SETTLED'
});

function requireAdmission(value) {
  if (!value || value.kind !== 'operational-building-admission' || value.status !== 'OPERATIONAL') {
    throw new TypeError('frozen IM-18A operational building admission required');
  }
  return value;
}

function requireWorkforce(value, buildingId) {
  if (value == null) return null;
  if (value.kind !== 'operational-building-workforce-assignment' || value.buildingId !== buildingId) {
    throw new TypeError('frozen IM-18C workforce assignment required');
  }
  return value;
}

function requireExecution(value, buildingId) {
  if (value == null) return null;
  if (value.kind !== 'operational-production-execution' || value.buildingId !== buildingId) {
    throw new TypeError('frozen IM-18E production execution required');
  }
  return value;
}

function requireSettlement(value, buildingId) {
  if (value == null) return null;
  if (value.kind !== 'input-consumption-output-settlement' || value.buildingId !== buildingId) {
    throw new TypeError('frozen IM-18F production settlement required');
  }
  return value;
}

export function projectPlayerOperationalState({ operationalAdmission, workforceAssignment = null, execution = null, settlement = null } = {}) {
  const admission = requireAdmission(operationalAdmission);
  const workforce = requireWorkforce(workforceAssignment, admission.buildingId);
  const productionExecution = requireExecution(execution, admission.buildingId);
  const productionSettlement = requireSettlement(settlement, admission.buildingId);

  if (productionExecution && workforce?.status !== 'ASSIGNED') throw new Error('production execution requires assigned workforce');
  if (productionSettlement && productionExecution?.status !== 'READY') throw new Error('production settlement requires READY execution');

  const status = productionSettlement
    ? PLAYER_OPERATIONAL_STATES.PRODUCTION_SETTLED
    : workforce?.status !== 'ASSIGNED'
      ? PLAYER_OPERATIONAL_STATES.NO_WORKER
      : productionExecution?.status === 'READY'
        ? PLAYER_OPERATIONAL_STATES.READY_TO_PRODUCE
        : PLAYER_OPERATIONAL_STATES.WAITING_FOR_INPUT;

  return Object.freeze({
    kind: 'player-operational-state-projection',
    buildingId: admission.buildingId,
    status,
    workforceAssigned: workforce?.status === 'ASSIGNED',
    productionStatus: productionExecution?.status ?? null,
    settlementId: productionSettlement?.settlementId ?? null,
    sources: Object.freeze({ operationalAdmission: admission, workforceAssignment: workforce, execution: productionExecution, settlement: productionSettlement })
  });
}

function ensureSurface() {
  let surface = document.querySelector('[data-im18g-operational-state]');
  if (surface) return surface;
  const footer = document.querySelector('.player-action-region');
  if (!footer) return null;
  surface = document.createElement('output');
  surface.dataset.im18gOperationalState = 'true';
  surface.setAttribute('aria-live', 'polite');
  surface.textContent = 'Betriebszustand · noch keine autoritative Projektion';
  footer.append(surface);
  return surface;
}

export function renderPlayerOperationalStateProjection(projection, surface = ensureSurface()) {
  if (!projection || projection.kind !== 'player-operational-state-projection') throw new TypeError('player operational state projection required');
  if (!surface) return projection;
  surface.dataset.status = projection.status;
  const labels = Object.freeze({ NO_WORKER: 'Kein Arbeiter', WAITING_FOR_INPUT: 'Wartet auf Input', READY_TO_PRODUCE: 'Produktionsbereit', PRODUCTION_SETTLED: 'Produktion abgeschlossen' });
  surface.textContent = `Betriebszustand · ${labels[projection.status]} · ${projection.buildingId}`;
  return projection;
}

export const PlayerOperationalStateProjection = Object.freeze({
  states: PLAYER_OPERATIONAL_STATES,
  project: projectPlayerOperationalState,
  render: renderPlayerOperationalStateProjection,
  capabilities: Object.freeze({ buildingAuthority:false, runtimeAuthority:false, workforceAuthority:false, recipeAuthority:false, productionAuthority:false, buildingStockAuthority:false, settlementAuthority:false })
});

if (typeof window !== 'undefined') window.IM18GPlayerOperationalStateProjection = PlayerOperationalStateProjection;
