import { OperationalBuildingProductionRecipeIntegration } from '../domain/operational-building-production-recipe-integration.js';
import { OperationalProductionExecution } from '../domain/operational-production-execution.js';
import { ProductionInputExistingLogisticsIntegration } from '../domain/production-input-existing-logistics-integration.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobService } from '../transport/transport-job-service.js';
import { DeliveredTransportBuildingStockSettlement } from '../domain/delivered-transport-building-stock-settlement.js';
import { ProducedResourceLogisticsConsumptionConsistency } from '../domain/produced-resource-logistics-consumption-consistency.js';

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
}
