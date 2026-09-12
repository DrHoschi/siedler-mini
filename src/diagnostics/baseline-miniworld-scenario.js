import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { HousingHomeCapacityIntegrationContract } from '../domain/housing-home-capacity-integration-contract.js';
import { DeterministicHousingPopulationIntegration } from '../domain/deterministic-housing-population-integration.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { ResidentialBuildingAdmissionContract } from '../domain/residential-building-admission-contract.js';
import { ResidentialHousingCapacityOccupancyIntegration } from '../domain/residential-housing-capacity-occupancy-integration.js';
import { ResidentHousingAssignmentIntegration } from '../domain/resident-housing-assignment-integration.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { CarrierContract } from '../transport/carrier-contract.js';
import { CarrierMovementContract } from '../transport/carrier-movement-contract.js';
import { WorldBackedTraversabilitySource } from '../transport/world-backed-traversability-source.js';
import { WorldBackedPathClassificationSource } from '../transport/world-backed-path-classification-source.js';
import { DeterministicWorldReachabilityIntegration } from '../transport/deterministic-world-reachability-integration.js';
import { RuntimeEntityNavigationValidationIntegration } from '../transport/runtime-entity-navigation-validation-integration.js';

export const BASELINE_MINIWORLD_SCENARIO_ID = 'BASELINE_MINIWORLD';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function createBaselineMiniworldScenario() {
  const world = new WorldStore();
  const map = new MapStructure(world, {
    name: 'CR-32A World-backed Path Classification Contract Miniworld',
    width: 8,
    height: 6,
    cellSize: 1,
    metadata: { foundation: 'CR-32A-WORLD-BACKED-PATH-CLASSIFICATION-CONTRACT' },
  });
  const domains = new CoreDomainStores();

  function createVisibleBuilding(definitionId, position) {
    const buildingId = domains.buildings.allocateId();
    return domains.buildings.create({
      identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId }),
      lifecycle: BuildingLifecycleStateContract.define({ buildingId }),
      position,
    }, { id: buildingId });
  }

  function completedConstructionFor(buildingId) {
    const pending = BuildingConstructionProgressTransitionContract.define({ buildingId, progress: 0 });
    const inProgress = BuildingConstructionProgressTransitionContract.advance(pending, 0.5);
    const completed = BuildingConstructionProgressTransitionContract.advance(inProgress, 1);
    return ConstructionCompletionIntegration.complete({
      previousProgress: pending,
      transitions: [inProgress, completed],
      progress: completed,
    });
  }

  function createVisiblePerson(position, { carrierCapacity = null } = {}) {
    const personId = domains.units.allocateId();
    const data = {
      identity: PersonResidentIdentityContract.define({ personId }),
      position,
    };
    if (carrierCapacity != null) {
      data.carrier = CarrierContract.define({
        unitId: personId,
        capacity: carrierCapacity,
        location: {
          kind: 'cell',
          refId: map.cellIdAt(Math.floor(position.x), Math.floor(position.y)),
        },
      });
    }
    return domains.units.create(data, { id: personId });
  }

  const pathTile = map.createTile({
    technicalName: 'path.cr32a.browser-evidence',
    classification: 'terrain',
    passability: 'UNSPECIFIED',
    traversalType: 'PATH',
  });
  const roadTile = map.createTile({
    technicalName: 'road.cr32a.browser-evidence',
    classification: 'terrain',
    passability: 'UNSPECIFIED',
    traversalType: 'ROAD',
  });
  map.setTileAt(1, 4, pathTile.id);
  map.setTileAt(2, 4, roadTile.id);

  const hq = createVisibleBuilding('HQ', { x: 2, y: 2 });
  createVisibleBuilding('WOODCUTTER', { x: 5, y: 3 });
  const storehouse = createVisibleBuilding('STOREHOUSE', { x: 3.5, y: 4.5 });
  const carrierPerson = createVisiblePerson({ x: 1.25, y: 1.5 }, { carrierCapacity: 2 });
  const secondPerson = createVisiblePerson({ x: 4.25, y: 2.25 });
  const thirdPerson = createVisiblePerson({ x: 6.25, y: 4.25 });

  const hqHousing = HousingHomeCapacityIntegrationContract.defineHousing({
    buildingIdentity: hq.identity,
    capacity: 2,
  });
  const storehouseHousing = HousingHomeCapacityIntegrationContract.defineHousing({
    buildingIdentity: storehouse.identity,
    capacity: 1,
  });

  const housingPopulation = DeterministicHousingPopulationIntegration.integrate({
    domains,
    housings: [hqHousing, storehouseHousing],
    assignments: [],
  });

  function residentialHousingIntegration(building, housing) {
    const operationalAdmission = OperationalBuildingAdmissionContract.evaluate({
      constructionCompletion: completedConstructionFor(building.id),
      lifecycle: building.lifecycle,
    });
    const residentialAdmission = ResidentialBuildingAdmissionContract.evaluate({
      operationalAdmission,
      buildingIdentity: building.identity,
      housingCapability: housing,
    });
    return ResidentialHousingCapacityOccupancyIntegration.integrate({
      residentialAdmission,
      assignments: [],
    });
  }

  const residentHousingAssignment = ResidentHousingAssignmentIntegration.integrate({
    housingIntegrations: [
      residentialHousingIntegration(hq, hqHousing),
      residentialHousingIntegration(storehouse, storehouseHousing),
    ],
    personIdentities: [
      carrierPerson.identity,
      secondPerson.identity,
      thirdPerson.identity,
    ],
    assignments: [],
  });

  const goldEconomy = new GoldEconomyOwner({ initialGold: 0 });
  const goldSettlement = goldEconomy.settle({
    population: housingPopulation.population,
    goldPerResident: 1,
  });

  const pathClassification = new WorldBackedPathClassificationSource({ map, world });
  const pathClassificationEntries = pathClassification.entries();
  const traversability = new WorldBackedTraversabilitySource({ map, domains });
  const blockedStaticCells = traversability.entries();
  const reachabilityEvidence = DeterministicWorldReachabilityIntegration.evaluate({
    map,
    traversability,
    startPosition: { x: 0.25, y: 0.25 },
    targetPosition: { x: 7.25, y: 5.25 },
  });

  const personNavigationValidation = RuntimeEntityNavigationValidationIntegration.validatePerson({
    domains,
    map,
    traversability,
    personId: secondPerson.id,
    targetPosition: { x: 7.25, y: 5.25 },
  });

  const carrierMovementEvidence = CarrierMovementContract.define({
    unitId: carrierPerson.id,
    currentPosition: carrierPerson.position,
    state: 'MOVING',
    targetPosition: { x: 7.25, y: 0.25 },
  });
  const carrierNavigationValidation = RuntimeEntityNavigationValidationIntegration.validateCarrierMovement({
    domains,
    map,
    traversability,
    movement: carrierMovementEvidence,
  });
  const runtimeNavigationValidations = Object.freeze([
    personNavigationValidation,
    carrierNavigationValidation,
  ]);
  const runtimeValidationPass = runtimeNavigationValidations.every(entry => entry.valid);
  const classificationPass = pathClassification.typeAt({ x: 1, y: 4 }) === 'PATH'
    && pathClassification.classAt({ x: 2, y: 4 }) === 'ROAD'
    && pathClassificationEntries.length === 2;

  return deepFreeze({
    kind: 'active-runtime-composition',
    scenarioId: BASELINE_MINIWORLD_SCENARIO_ID,
    authoritative: {
      world,
      map,
      domains,
      housingPopulation,
      residentHousingAssignment,
      goldEconomy,
      goldSettlement,
      pathClassification,
      pathClassificationEntries,
      traversability,
      reachabilityEvidence,
      personNavigationValidation,
      carrierMovementEvidence,
      carrierNavigationValidation,
      runtimeNavigationValidations,
      blockedStaticCells,
      runtimeValidationPass,
      classificationPass,
    },
  });
}
