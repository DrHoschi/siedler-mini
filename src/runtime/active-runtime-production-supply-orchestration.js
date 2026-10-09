import { OperationalBuildingProductionRecipeIntegration } from '../domain/operational-building-production-recipe-integration.js';
import { OperationalProductionExecution } from '../domain/operational-production-execution.js';
import { ProductionInputExistingLogisticsIntegration } from '../domain/production-input-existing-logistics-integration.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobService } from '../transport/transport-job-service.js';
import { DeliveredTransportBuildingStockSettlement } from '../domain/delivered-transport-building-stock-settlement.js';
import { ProducedResourceLogisticsConsumptionConsistency } from '../domain/produced-resource-logistics-consumption-consistency.js';
import { SourceBoundOutputHqIntake } from '../domain/source-bound-output-hq-intake.js';
import { ProductionInputDemandReconnectionIntegration } from '../domain/production-input-demand-reconnection-integration.js';

function requireComposition(value) {
  if (value?.kind !== 'active-runtime-composition' || !value.authoritative) throw new TypeError('active runtime composition required');
  return value;
}
function requireArray(value,label){if(!Array.isArray(value))throw new TypeError(`${label} array required`);return value;}
function replaceBy(values,next,key){return Object.freeze([...values.filter(value=>key(value)!==key(next)),next].sort((a,b)=>key(a).localeCompare(key(b))));}
function stockKey(value){return `${value.buildingId}|${value.resourceTypeId}`;}
function reservationKey(value){return value.id;}
function workforceKey(value){return value.personId;}

export class ActiveRuntimeProductionSupplyOrchestration {
  #get; #publish;
  constructor({getComposition,publishComposition}={}){
    if(typeof getComposition!=='function'||typeof publishComposition!=='function')throw new TypeError('composition read/publish seam required');
    this.#get=getComposition;this.#publish=publishComposition;
  }

  evaluateAndConnect({buildingId,workforceAssignment,recipe,demandIds=[],reservationIds=[]}={}){
    const composition=requireComposition(this.#get()),owners=composition.authoritative;
    const productionIntegration=OperationalBuildingProductionRecipeIntegration.integrate({workforceAssignment,recipe});
    if(productionIntegration.buildingId!==buildingId)throw new Error('IM-24 production building mismatch');
    const stocks=requireArray(owners.buildingStocks,'buildingStocks');
    const execution=OperationalProductionExecution.evaluate({productionIntegration,stocks:stocks.filter(value=>value.buildingId===buildingId)});
    if(execution.status===OperationalProductionExecution.status.READY){
      return Object.freeze({kind:'im24-active-runtime-production-supply-result',status:'READY',buildingId,execution,productionTriggered:false,mutation:false});
    }
    const matching=new ResourceMatching({resourceState:owners.resourceState,claims:owners.resourceClaims,demands:owners.resourceDemands});
    const assignment=new ResourceAssignment({resourceState:owners.resourceState,claims:owners.resourceClaims,demands:owners.resourceDemands});
    const transportJobs=new TransportJobService({jobStore:owners.domains.jobs,claims:owners.resourceClaims,demands:owners.resourceDemands,resourceState:owners.resourceState});
    const supply=new ProductionInputExistingLogisticsIntegration({resourceState:owners.resourceState,claims:owners.resourceClaims,demands:owners.resourceDemands,matching,assignment,transportJobs});
    const admission=supply.admitBlockedInputs({execution,demandIds});
    const existing=requireArray(owners.buildingStockTransportReservations,'buildingStockTransportReservations');
    let nextReservations=[...existing],offset=0;
    const connections=admission.requirements.map(requirement=>{
      const demand=owners.resourceDemands.get(requirement.demandId);
      if(['RESERVED','FULFILLED'].includes(demand?.status))return Object.freeze({kind:'im24-existing-supply-continuity',status:'EXISTING_BOUND_SUPPLY',demandId:demand.id,requirement});
      const needed=matching.matchDemand(requirement.demandId).selections.length;
      const ids=reservationIds.slice(offset,offset+needed);offset+=needed;
      const result=supply.connect({requirement,sourceStocks:stocks,existingTransportReservations:nextReservations,reservationIds:ids});
      nextReservations.push(...result.reservations);
      return result;
    });
    if(offset!==reservationIds.length)throw new Error('unused IM-24 transport reservation ids');
    if(nextReservations.length!==existing.length){
      this.#publish(Object.freeze({...composition,authoritative:Object.freeze({...owners,buildingStockTransportReservations:Object.freeze(nextReservations)})}));
    }
    return Object.freeze({kind:'im24-active-runtime-production-supply-result',status:'BLOCKED_INPUT',buildingId,execution,admission,connections:Object.freeze(connections),productionTriggered:false});
  }

  publishDeliveredBuildingStock({dispatch,delivery,reservation,workforceState,sourceStock,targetStock,deliveryCommit=null}={}){
    const composition=requireComposition(this.#get()),owners=composition.authoritative;
    const settled=DeliveredTransportBuildingStockSettlement.settle({dispatch,delivery,reservation,workforceState,sourceStock,targetStock});
    const produced=owners.resourceState.get(delivery.resourceId)?.metadata?.source==='IM-27_PRODUCTION_OUTPUT';
    const consistency=produced?ProducedResourceLogisticsConsumptionConsistency.verify({deliveryCommit,buildingStockSettlement:settled,resourceState:owners.resourceState,claims:owners.resourceClaims}):null;
    let stocks=requireArray(owners.buildingStocks,'buildingStocks');
    stocks=replaceBy(stocks,settled.sourceStock,stockKey);stocks=replaceBy(stocks,settled.targetStock,stockKey);
    const reservations=replaceBy(requireArray(owners.buildingStockTransportReservations,'buildingStockTransportReservations'),settled.reservation,reservationKey);
    const workforce=replaceBy(requireArray(owners.workforceAssignments,'workforceAssignments'),settled.workforceState,workforceKey);
    const next=Object.freeze({...composition,authoritative:Object.freeze({...owners,buildingStocks:stocks,buildingStockTransportReservations:reservations,workforceAssignments:workforce})});
    this.#publish(next);
    return Object.freeze({kind:'im24-delivered-supply-publication',status:'DELIVERED_TO_BUILDING_STOCK',settlement:settled,consistency,productionTriggered:false});
  }

  publishSourceBoundOutputToHq({dispatch,delivery,deliveryCommit,reservationId,workforceState,hqBuildingId}={}){
    const composition=requireComposition(this.#get()),owners=composition.authoritative;
    const result=SourceBoundOutputHqIntake.settle({
      domains:owners.domains,
      resourceState:owners.resourceState,
      claims:owners.resourceClaims,
      buildingStocks:owners.buildingStocks,
      buildingStockTransportReservations:owners.buildingStockTransportReservations,
      dispatch,
      delivery,
      deliveryCommit,
      reservationId,
      workforceState,
      hqBuildingId
    });
    if(result.status==='ALREADY_INTAKEN')return result;
    let stocks=requireArray(owners.buildingStocks,'buildingStocks');
    stocks=replaceBy(stocks,result.sourceStock,stockKey);stocks=replaceBy(stocks,result.targetStock,stockKey);
    const reservations=replaceBy(requireArray(owners.buildingStockTransportReservations,'buildingStockTransportReservations'),result.reservation,reservationKey);
    const workforce=replaceBy(requireArray(owners.workforceAssignments,'workforceAssignments'),result.workforceState,workforceKey);
    const next=Object.freeze({...composition,authoritative:Object.freeze({...owners,buildingStocks:stocks,buildingStockTransportReservations:reservations,workforceAssignments:workforce})});
    this.#publish(next);
    return result;
  }

  reconnectHqIntakeToProductionInputs({hqBuildingId,resourceTypeId,resourceId=null,reservationIds=[]}={}){
    const composition=requireComposition(this.#get()),owners=composition.authoritative;
    if(!Array.isArray(reservationIds))throw new TypeError('reservationIds must be an array');
    const materialization=ProductionInputDemandReconnectionIntegration.materializeHqStock({
      domains:owners.domains,
      resourceState:owners.resourceState,
      claims:owners.resourceClaims,
      buildingStocks:owners.buildingStocks,
      hqBuildingId,
      resourceTypeId,
      resourceId
    });
    if(materialization.status==='NO_HQ_STOCK')return Object.freeze({kind:'im33-hq-intake-production-input-demand-reconnection',status:'NO_HQ_STOCK',materialization,connections:Object.freeze([]),mutation:false});
    const demands=ProductionInputDemandReconnectionIntegration.openProductionInputDemands({demands:owners.resourceDemands,resourceTypeId});
    const matching=new ResourceMatching({resourceState:owners.resourceState,claims:owners.resourceClaims,demands:owners.resourceDemands});
    const assignment=new ResourceAssignment({resourceState:owners.resourceState,claims:owners.resourceClaims,demands:owners.resourceDemands});
    const transportJobs=new TransportJobService({jobStore:owners.domains.jobs,claims:owners.resourceClaims,demands:owners.resourceDemands,resourceState:owners.resourceState});
    const supply=new ProductionInputExistingLogisticsIntegration({resourceState:owners.resourceState,claims:owners.resourceClaims,demands:owners.resourceDemands,matching,assignment,transportJobs});
    let nextReservations=[...requireArray(owners.buildingStockTransportReservations,'buildingStockTransportReservations')],offset=0;
    const connections=demands.map(demand=>{
      const match=matching.matchDemand(demand.id);
      if(match.matchedAmount===0)return Object.freeze({kind:'im33-production-input-demand-reconnection',status:'WAITING_FOR_AVAILABLE_HQ_STOCK',demandId:demand.id,match,reservations:Object.freeze([])});
      const ids=reservationIds.slice(offset,offset+match.selections.length);offset+=match.selections.length;
      const result=supply.connect({
        requirement:Object.freeze({kind:'production-input-requirement',buildingId:demand.consumerId,resourceTypeId:demand.definitionId,demandId:demand.id,missingAmount:demand.remainingAmount,created:false,demand}),
        sourceStocks:owners.buildingStocks,
        existingTransportReservations:nextReservations,
        reservationIds:ids
      });
      nextReservations.push(...result.reservations);
      return result;
    });
    if(offset!==reservationIds.length)throw new Error('unused IM-33 transport reservation ids');
    const changed=nextReservations.length!==owners.buildingStockTransportReservations.length;
    if(changed){
      this.#publish(Object.freeze({...composition,authoritative:Object.freeze({...owners,buildingStockTransportReservations:Object.freeze(nextReservations)})}));
    }
    return Object.freeze({kind:'im33-hq-intake-production-input-demand-reconnection',status:'RECONNECTED',materialization,connections:Object.freeze(connections),mutation:materialization.mutation||changed});
  }
}
