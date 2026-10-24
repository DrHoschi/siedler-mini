import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { BuildingConstructionProgressTransitionContract as Progress } from '../domain/building-construction-progress-transition-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { HousingHomeCapacityIntegrationContract as Housing } from '../domain/housing-home-capacity-integration-contract.js';
import { ResidentialBuildingAdmissionContract } from '../domain/residential-building-admission-contract.js';
import { ResidentialHousingCapacityOccupancyIntegration } from '../domain/residential-housing-capacity-occupancy-integration.js';
import { ResidentHousingAssignmentIntegration } from '../domain/resident-housing-assignment-integration.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { ProductionInputDemandReconnectionIntegration } from '../domain/production-input-demand-reconnection-integration.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { CarrierContract } from '../transport/carrier-contract.js';
import { WorldBackedTraversabilitySource } from '../transport/world-backed-traversability-source.js';
import { WorldBackedPathClassificationSource } from '../transport/world-backed-path-classification-source.js';
import { projectAuthoritativePopulation } from '../ui/authoritative-population-projection.js';

export const NEW_GAME_FOUNDER_ORIGIN = 'NEW_GAME_FOUNDER';
export const NEW_GAME_ECONOMY_BASELINE = Object.freeze({ founderCount:6, carrierCapacity:4, wood:20, stone:20, gold:100 });
const PROFILES = Object.freeze([
  ['CARRIER','CAN_SIMPLE_TRANSPORT'], ['BUILDER','CAN_BUILD'], ['LUMBERJACK','CAN_LUMBERJACK'],
  ['QUARRY_WORKER','CAN_QUARRY'], ['FISHER','CAN_FISH'], ['HUNTER','CAN_HUNT'],
].map(profile => Object.freeze(profile)));
const frozen = values => Object.freeze(values);

function createComposition(started) {
  // Map foundation only: the Start menu must not create a saved game's founders.
  const world = new WorldStore();
  const map = new MapStructure(world, { name:'Neue Siedler', width:8, height:6, cellSize:1 });
  const domains = new CoreDomainStores();
  const resourceState = new ResourceState({ world, resourceStore:domains.resources, referenceStores:[domains.buildings] });
  const resourceClaims = new ResourceClaims({ resourceState });
  const resourceDemands = new ResourceDemands({ resourceState, claims:resourceClaims });
  const housingCapabilities=[], workforceProfiles=[], workforceAssignments=[], constructionProgress=[], buildingStocks=[];
  const housingIntegrations=[], personIdentities=[];
  if (started) {
    const buildingId = domains.buildings.allocateId();
    const hq = domains.buildings.create({
      identity:BuildingIdentityOwnershipContract.define({ buildingId, definitionId:'HQ' }),
      lifecycle:BuildingLifecycleStateContract.define({ buildingId }), position:{ x:2, y:2 },
    }, { id:buildingId });
    const housing = Housing.defineHousing({ buildingIdentity:hq.identity, capacity:NEW_GAME_ECONOMY_BASELINE.founderCount, populationPolicy:'NO_AUTO_POPULATION' });
    housingCapabilities.push(housing);
    const pending=Progress.define({ buildingId }), inProgress=Progress.advance(pending,0.5), complete=Progress.advance(inProgress,1);
    constructionProgress.push(complete);
    const constructionCompletion=ConstructionCompletionIntegration.complete({ previousProgress:pending, transitions:[inProgress,complete], progress:complete });
    const operationalAdmission=OperationalBuildingAdmissionContract.evaluate({ constructionCompletion, lifecycle:hq.lifecycle });
    const residentialAdmission=ResidentialBuildingAdmissionContract.evaluate({ operationalAdmission, buildingIdentity:hq.identity, housingCapability:housing });
    housingIntegrations.push(ResidentialHousingCapacityOccupancyIntegration.integrate({ residentialAdmission, assignments:[] }));
    for (const [index,[specialization,capability]] of PROFILES.entries()) {
      const personId=domains.units.allocateId(), identity=PersonResidentIdentityContract.define({ personId });
      const position={ x:1.25+index%3, y:3.25+Math.floor(index/3) };
      const person={ identity, position, residentClass:'GENERAL_RESIDENT', residentOrigin:NEW_GAME_FOUNDER_ORIGIN };
      if (specialization==='CARRIER') person.carrier=CarrierContract.define({ unitId:personId, capacity:NEW_GAME_ECONOMY_BASELINE.carrierCapacity, state:'AVAILABLE', location:{ kind:'cell', refId:map.cellIdAt(Math.floor(position.x),Math.floor(position.y)) } });
      domains.units.create(person,{ id:personId }); personIdentities.push(identity);
      workforceProfiles.push(PersonWorkforceProfileContract.define({ personId, specialization, capabilities:['CAN_MOVE',capability] }));
      workforceAssignments.push(WorkforceAssignmentStateContract.define({ personId, availability:'FREE' }));
    }
    for (const technicalName of ['wood','stone']) {
      const type=resourceState.createDefinition({ technicalName, label:technicalName==='wood'?'Holz':'Stein' });
      buildingStocks.push(BuildingStockContract.define({ buildingId, resourceTypeId:type.id, quantity:NEW_GAME_ECONOMY_BASELINE[technicalName] }));
      // IM-33 exposes these same HQ goods to logistics; it does not add inventory.
      ProductionInputDemandReconnectionIntegration.materializeHqStock({ domains, resourceState, claims:resourceClaims, buildingStocks, hqBuildingId:buildingId, resourceTypeId:type.id });
    }
  }
  const residentHousingAssignment=ResidentHousingAssignmentIntegration.integrate({ housingIntegrations, personIdentities, assignments:[] });
  const populationProjection=projectAuthoritativePopulation({ assignmentIntegration:residentHousingAssignment, personIdentities });
  const pathClassification=new WorldBackedPathClassificationSource({ map, world });
  const traversability=new WorldBackedTraversabilitySource({ map, domains });
  return Object.freeze({ kind:'active-runtime-composition', scenarioId:started?'IM38_NEW_GAME_ECONOMY':'IM38_START_MENU', authoritative:Object.freeze({
    world, map, domains, resourceState, resourceClaims, resourceDemands,
    goldEconomy:new GoldEconomyOwner({ initialGold:started?NEW_GAME_ECONOMY_BASELINE.gold:0 }), goldFlowAdmission:null, goldSettlement:null,
    housingCapabilities:frozen(housingCapabilities), residentHousingAssignment, populationProjection, homeAssignments:residentHousingAssignment.assignments,
    workforceProfiles:frozen(workforceProfiles), workforceAssignments:frozen(workforceAssignments),
    workforceRequirements:frozen([]), workforceBindings:frozen([]), carrierBindings:frozen([]), transportExecutions:frozen([]),
    productionRecipes:frozen([]), productionCycleTimes:frozen([]), productionCycleProgressions:frozen([]),
    constructionProgress:frozen(constructionProgress), buildingStocks:frozen(buildingStocks), buildingStockTransportReservations:frozen([]),
    productionSettlementIds:frozen([]), goldSettlementIds:frozen([]), productionEffectReceipts:frozen([]), goldEffectReceipts:frozen([]),
    pathUsageWear:Object.freeze({ entries:()=>frozen([]) }), pathClassification, pathClassificationEntries:pathClassification.entries(),
    traversability, blockedStaticCells:traversability.entries(),
  }) });
}

export function createNewGameEconomyComposition() { return createComposition(true); }
export function createStartMenuComposition() { return createComposition(false); }
