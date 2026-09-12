function requirePopulation(value) {
  if (!value || value.kind !== 'authoritative-population-projection') {
    throw new TypeError('frozen IM-19D authoritative population projection required');
  }
  if (!Number.isSafeInteger(value.count) || value.count < 0) {
    throw new TypeError('invalid authoritative population count');
  }
  if (!Array.isArray(value.personIds) || value.personIds.length !== value.count) {
    throw new TypeError('population personIds/count mismatch');
  }
  if (new Set(value.personIds).size !== value.personIds.length) {
    throw new Error('duplicate person ids in authoritative population');
  }
  if (!Number.isSafeInteger(value.occupiedHousingSlots) || value.occupiedHousingSlots !== value.count) {
    throw new Error('population/housing occupancy mismatch');
  }
  return value;
}

function requireHousingAssignment(value) {
  if (!value || value.kind !== 'resident-housing-assignment-integration') {
    throw new TypeError('frozen IM-19C resident housing assignment integration required');
  }
  if (!Array.isArray(value.housingStates) || !Array.isArray(value.assignments)) {
    throw new TypeError('complete resident housing assignment integration required');
  }
  return value;
}

function normalizeHousingStates(values) {
  const states = values.map((value) => {
    if (!value || value.kind !== 'residential-housing-capacity-occupancy-integration') {
      throw new TypeError('frozen IM-19B housing state required');
    }
    const ints = ['capacity', 'occupancy', 'availableSlots'];
    for (const key of ints) {
      if (!Number.isSafeInteger(value[key]) || value[key] < 0) {
        throw new TypeError(`invalid housing ${key}: ${value[key]}`);
      }
    }
    if (value.occupancy + value.availableSlots !== value.capacity || value.withinCapacity !== true) {
      throw new Error(`invalid housing capacity invariant for ${value.buildingId}`);
    }
    if (value.status !== 'AVAILABLE' && value.status !== 'FULL') {
      throw new TypeError(`invalid housing status: ${value.status}`);
    }
    return Object.freeze({
      buildingId: value.buildingId,
      status: value.status,
      capacity: value.capacity,
      occupancy: value.occupancy,
      availableSlots: value.availableSlots,
      canAcceptResident: value.canAcceptResident === true
    });
  }).sort((a, b) => a.buildingId.localeCompare(b.buildingId));

  const ids = states.map((value) => value.buildingId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('duplicate projected housing building id');
  }
  return Object.freeze(states);
}

function requireGoldSettlement(value) {
  if (!value || value.kind !== 'operational-economy-gold-settlement') {
    throw new TypeError('frozen IM-19F operational economy gold settlement required');
  }
  if (typeof value.settlementId !== 'string' || value.settlementId.trim().length === 0) {
    throw new TypeError('gold settlement id required');
  }
  const state = value.stateAfter;
  if (!state || state.kind !== 'gold-economy-state' || state.physical !== false) {
    throw new TypeError('authoritative non-physical Gold state required');
  }
  if (!Number.isSafeInteger(state.balance) || state.balance < 0) {
    throw new TypeError('invalid authoritative Gold balance');
  }
  return value;
}

function requireGoldState(value) {
  if (!value || value.kind !== 'gold-economy-state' || value.physical !== false) {
    throw new TypeError('current non-physical Gold state required');
  }
  if (!Number.isSafeInteger(value.balance) || value.balance < 0) {
    throw new TypeError('invalid current Gold balance');
  }
  return value;
}

function sameGoldState(left, right) {
  return left.kind === right.kind
    && left.balance === right.balance
    && left.physical === right.physical;
}

export function projectPlayerPopulationHousingGold({
  populationProjection,
  housingAssignmentIntegration,
  goldSettlement,
  currentGoldState
} = {}) {
  const population = requirePopulation(populationProjection);
  const housingAssignment = requireHousingAssignment(housingAssignmentIntegration);
  const housingStates = normalizeHousingStates(housingAssignment.housingStates);
  const settlement = requireGoldSettlement(goldSettlement);
  const goldState = requireGoldState(currentGoldState);

  if (!sameGoldState(settlement.stateAfter, goldState)) {
    throw new Error('Player Gold projection does not match authoritative current Gold state');
  }

  const totalCapacity = housingStates.reduce((sum, value) => sum + value.capacity, 0);
  const totalOccupancy = housingStates.reduce((sum, value) => sum + value.occupancy, 0);
  const totalAvailableSlots = housingStates.reduce((sum, value) => sum + value.availableSlots, 0);

  if (totalOccupancy !== population.count || totalOccupancy !== population.occupiedHousingSlots) {
    throw new Error('Player Population/Housing projection authority mismatch');
  }
  if (totalOccupancy + totalAvailableSlots !== totalCapacity) {
    throw new Error('Player Housing aggregate capacity invariant failed');
  }

  const housingStatus = housingStates.length === 0
    ? 'NO_HOUSING'
    : totalAvailableSlots > 0
      ? 'AVAILABLE'
      : 'FULL';

  return Object.freeze({
    kind: 'player-population-housing-gold-projection',
    population: Object.freeze({
      count: population.count,
      personIds: Object.freeze(population.personIds.slice())
    }),
    housing: Object.freeze({
      status: housingStatus,
      buildingCount: housingStates.length,
      capacity: totalCapacity,
      occupancy: totalOccupancy,
      availableSlots: totalAvailableSlots,
      buildings: housingStates
    }),
    gold: Object.freeze({
      balance: goldState.balance,
      physical: false,
      settlementId: settlement.settlementId
    }),
    sources: Object.freeze({
      populationProjection: population,
      housingAssignmentIntegration: housingAssignment,
      goldSettlement: settlement,
      currentGoldState: goldState
    })
  });
}

function ensureSurface() {
  let surface = document.querySelector('[data-im19g-population-housing-gold-state]');
  if (surface) return surface;
  const footer = document.querySelector('.player-action-region');
  if (!footer) return null;
  surface = document.createElement('output');
  surface.dataset.im19gPopulationHousingGoldState = 'true';
  surface.setAttribute('aria-live', 'polite');
  surface.textContent = 'Siedlung · noch keine autoritative Projektion';
  footer.append(surface);
  return surface;
}

export function renderPlayerPopulationHousingGoldProjection(projection, surface = ensureSurface()) {
  if (!projection || projection.kind !== 'player-population-housing-gold-projection') {
    throw new TypeError('Player Population/Housing/Gold projection required');
  }
  if (!surface) return projection;

  surface.dataset.housingStatus = projection.housing.status;
  surface.dataset.population = String(projection.population.count);
  surface.dataset.housingOccupancy = String(projection.housing.occupancy);
  surface.dataset.housingCapacity = String(projection.housing.capacity);
  surface.dataset.gold = String(projection.gold.balance);
  surface.textContent = `Siedlung · Bevölkerung ${projection.population.count} · Wohnen ${projection.housing.occupancy}/${projection.housing.capacity} · Gold ${projection.gold.balance}`;
  return projection;
}

export function projectFromRuntime(runtime = window.CleanRuntime) {
  if (!runtime?.populationProjection
    || !runtime?.residentHousingAssignment
    || !runtime?.goldSettlement
    || !runtime?.goldEconomy) {
    throw new TypeError('complete IM-19G runtime sources required');
  }
  return projectPlayerPopulationHousingGold({
    populationProjection: runtime.populationProjection,
    housingAssignmentIntegration: runtime.residentHousingAssignment,
    goldSettlement: runtime.goldSettlement,
    currentGoldState: runtime.goldEconomy.snapshot()
  });
}

export function refreshPlayerPopulationHousingGoldProjection(
  runtime = window.CleanRuntime,
  surface = ensureSurface()
) {
  return renderPlayerPopulationHousingGoldProjection(projectFromRuntime(runtime), surface);
}

export const PlayerPopulationHousingGoldProjection = Object.freeze({
  project: projectPlayerPopulationHousingGold,
  projectFromRuntime,
  render: renderPlayerPopulationHousingGoldProjection,
  refresh: refreshPlayerPopulationHousingGoldProjection,
  capabilities: Object.freeze({
    populationAuthority: false,
    residentAuthority: false,
    housingAuthority: false,
    homeAssignmentAuthority: false,
    goldAuthority: false,
    goldSettlementAuthority: false,
    economyAuthority: false,
    inspectorGraphUi: false
  })
});

if (typeof window !== 'undefined') {
  window.IM19GPlayerPopulationHousingGoldProjection = PlayerPopulationHousingGoldProjection;
  if (window.CleanRuntime) refreshPlayerPopulationHousingGoldProjection(window.CleanRuntime);
}
