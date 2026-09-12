import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import {
  PlayerPopulationHousingGoldProjection,
  projectPlayerPopulationHousingGold
} from '../ui/player-population-housing-gold-projection.js';

function housing(buildingId, capacity, occupancy) {
  return Object.freeze({
    kind: 'residential-housing-capacity-occupancy-integration',
    buildingId,
    status: occupancy < capacity ? 'AVAILABLE' : 'FULL',
    capacity,
    occupancy,
    availableSlots: capacity - occupancy,
    withinCapacity: true,
    canAcceptResident: occupancy < capacity
  });
}

function population() {
  return Object.freeze({
    kind: 'authoritative-population-projection',
    count: 3,
    personIds: Object.freeze(['unit:00000001', 'unit:00000002', 'unit:00000003']),
    occupiedHousingSlots: 3
  });
}

function housingAssignment() {
  return Object.freeze({
    kind: 'resident-housing-assignment-integration',
    assignments: Object.freeze([]),
    createdAssignments: Object.freeze([]),
    housingStates: Object.freeze([
      housing('building:00000002', 1, 1),
      housing('building:00000001', 3, 2)
    ])
  });
}

function goldSettlement() {
  return Object.freeze({
    kind: 'operational-economy-gold-settlement',
    settlementId: 'gold-settlement:00000001',
    flowType: 'POPULATION_INCOME',
    amount: 3,
    stateBefore: Object.freeze({ kind: 'gold-economy-state', balance: 0, physical: false }),
    stateAfter: Object.freeze({ kind: 'gold-economy-state', balance: 3, physical: false })
  });
}

function rejects(fn) {
  try { fn(); return false; } catch { return true; }
}

export function runIM19GSelfTest() {
  const owner = new GoldEconomyOwner({ initialGold: 3 });
  const projection = projectPlayerPopulationHousingGold({
    populationProjection: population(),
    housingAssignmentIntegration: housingAssignment(),
    goldSettlement: goldSettlement(),
    currentGoldState: owner.snapshot()
  });

  const checks = Object.freeze({
    frozenPopulationProjectedReadOnly:
      projection.population.count === 3
      && projection.population.personIds.join('|') === 'unit:00000001|unit:00000002|unit:00000003',
    housingAggregatedFromFrozenStates:
      projection.housing.buildingCount === 2
      && projection.housing.capacity === 4
      && projection.housing.occupancy === 3
      && projection.housing.availableSlots === 1
      && projection.housing.status === 'AVAILABLE'
      && projection.housing.buildings[0].buildingId === 'building:00000001'
      && projection.housing.buildings[1].buildingId === 'building:00000002',
    frozenGoldSettlementProjected:
      projection.gold.balance === 3
      && projection.gold.physical === false
      && projection.gold.settlementId === 'gold-settlement:00000001',
    populationHousingAuthorityMustMatch:
      rejects(() => projectPlayerPopulationHousingGold({
        populationProjection: Object.freeze({ ...population(), count: 2, personIds: Object.freeze(['unit:00000001','unit:00000002']), occupiedHousingSlots: 2 }),
        housingAssignmentIntegration: housingAssignment(),
        goldSettlement: goldSettlement(),
        currentGoldState: owner.snapshot()
      })),
    staleGoldStateRejected:
      rejects(() => projectPlayerPopulationHousingGold({
        populationProjection: population(),
        housingAssignmentIntegration: housingAssignment(),
        goldSettlement: goldSettlement(),
        currentGoldState: Object.freeze({ kind:'gold-economy-state', balance:4, physical:false })
      })),
    housingInvariantRejected:
      rejects(() => projectPlayerPopulationHousingGold({
        populationProjection: population(),
        housingAssignmentIntegration: Object.freeze({
          kind:'resident-housing-assignment-integration',
          assignments:Object.freeze([]),
          housingStates:Object.freeze([
            Object.freeze({
              kind:'residential-housing-capacity-occupancy-integration',
              buildingId:'building:00000001',
              status:'FULL',
              capacity:2,
              occupancy:2,
              availableSlots:1,
              withinCapacity:true,
              canAcceptResident:false
            })
          ])
        }),
        goldSettlement: goldSettlement(),
        currentGoldState: owner.snapshot()
      })),
    immutablePlayerProjection:
      Object.isFrozen(projection)
      && Object.isFrozen(projection.population)
      && Object.isFrozen(projection.housing)
      && Object.isFrozen(projection.housing.buildings)
      && Object.isFrozen(projection.gold)
      && Object.isFrozen(projection.sources),
    zeroMutationAuthority:
      Object.values(PlayerPopulationHousingGoldProjection.capabilities).every((value) => value === false)
      && typeof PlayerPopulationHousingGoldProjection.assignHome === 'undefined'
      && typeof PlayerPopulationHousingGoldProjection.settleGold === 'undefined'
      && typeof PlayerPopulationHousingGoldProjection.setPopulation === 'undefined'
  });

  return Object.freeze({
    kind: 'im-19g-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      population: projection.population.count,
      housingOccupancy: projection.housing.occupancy,
      housingCapacity: projection.housing.capacity,
      housingAvailableSlots: projection.housing.availableSlots,
      gold: projection.gold.balance,
      settlementId: projection.gold.settlementId
    }),
    capabilities: Object.freeze({
      consumesFrozenIM19DPopulation: true,
      consumesFrozenIM19BCHousing: true,
      consumesFrozenIM19FGold: true,
      readOnlyPlayerProjection: true,
      economyExpansion: false,
      inspectorGraphUi: false
    })
  });
}
