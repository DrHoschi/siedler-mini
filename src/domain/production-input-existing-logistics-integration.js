import { parseStableId } from '../world/stable-id.js';
import { BuildingStockContract } from './building-stock-contract.js';
import { BuildingStockTransportReservationContract } from './building-stock-transport-reservation-contract.js';
import { BuildingStockTransportReservationService } from './building-stock-transport-reservation-service.js';

const SOURCE='IM-23_PRODUCTION_INPUT';
function stable(value,kind,label){const p=parseStableId(value);if(!p||p.kind!==kind)throw new TypeError(`invalid ${label}: ${value}`);return p.id;}
function blocked(value){
  if(!value||value.kind!=='operational-production-execution'||value.status!=='BLOCKED_INPUT')throw new TypeError('IM-23 requires frozen IM-18E BLOCKED_INPUT execution');
  const buildingId=stable(value.buildingId,'building','production building id');
  if(!Array.isArray(value.missingInputs)||!value.missingInputs.length)throw new TypeError('BLOCKED_INPUT execution requires missingInputs');
  return Object.freeze({buildingId,missingInputs:Object.freeze(value.missingInputs.map(input=>{
    const resourceTypeId=stable(input.resourceTypeId,'resource-type','missing input resource type'),required=Number(input.required),available=Number(input.available);
    if(!Number.isSafeInteger(required)||required<1||!Number.isSafeInteger(available)||available<0||available>=required)throw new TypeError('invalid IM-18E missing input quantities');
    return Object.freeze({resourceTypeId,missingAmount:required-available});
  }))});
}
function openDemand(d,b,r){return d&&d.consumerId===b&&d.definitionId===r&&['OPEN','PARTIAL','RESERVED'].includes(d.status)&&d.metadata?.source===SOURCE&&d.metadata?.buildingId===b&&d.metadata?.resourceTypeId===r;}

export class ProductionInputExistingLogisticsIntegration{
  #resourceState;#claims;#demands;#matching;#assignment;#transportJobs;
  constructor({resourceState,claims,demands,matching,assignment,transportJobs}={}){
    if(!resourceState||typeof resourceState.get!=='function')throw new TypeError('ResourceState-compatible instance required');
    if(!claims||typeof claims.get!=='function')throw new TypeError('ResourceClaims-compatible instance required');
    if(!demands||typeof demands.get!=='function'||typeof demands.ids!=='function'||typeof demands.create!=='function')throw new TypeError('ResourceDemands-compatible instance required');
    if(!matching||typeof matching.matchDemand!=='function')throw new TypeError('ResourceMatching-compatible instance required');
    if(!assignment||typeof assignment.assignMatch!=='function')throw new TypeError('ResourceAssignment-compatible instance required');
    if(!transportJobs||typeof transportJobs.createFromAssignment!=='function')throw new TypeError('TransportJobService-compatible instance required');
    this.#resourceState=resourceState;this.#claims=claims;this.#demands=demands;this.#matching=matching;this.#assignment=assignment;this.#transportJobs=transportJobs;
  }
  admitBlockedInputs({execution,demandIds=[]}={}){
    const value=blocked(execution);if(!Array.isArray(demandIds))throw new TypeError('demandIds must be an array');
    const fresh=value.missingInputs.filter(x=>!this.#find(value.buildingId,x.resourceTypeId));
    if(demandIds.length!==fresh.length)throw new Error(`one demand id required per newly admitted production input need: ${fresh.length}`);
    let n=0;
    const requirements=value.missingInputs.map(input=>{
      let demand=this.#find(value.buildingId,input.resourceTypeId),created=false;
      if(!demand){demand=this.#demands.create({consumerId:value.buildingId,definitionId:input.resourceTypeId,amount:input.missingAmount,metadata:{source:SOURCE,buildingId:value.buildingId,resourceTypeId:input.resourceTypeId}},{id:demandIds[n++]});created=true;}
      return Object.freeze({kind:'production-input-requirement',buildingId:value.buildingId,resourceTypeId:input.resourceTypeId,demandId:demand.id,missingAmount:input.missingAmount,created,demand});
    });
    return Object.freeze({kind:'production-input-demand-admission',buildingId:value.buildingId,requirements:Object.freeze(requirements)});
  }
  connect({requirement,sourceStocks=[],existingTransportReservations=[],reservationIds=[]}={}){
    if(!requirement||requirement.kind!=='production-input-requirement')throw new TypeError('production-input-requirement required');
    const buildingId=stable(requirement.buildingId,'building','production building id'),demandId=stable(requirement.demandId,'demand','production input demand id'),resourceTypeId=stable(requirement.resourceTypeId,'resource-type','production input resource type');
    const demand=this.#demands.get(demandId);if(!openDemand(demand,buildingId,resourceTypeId))throw new Error('production input requirement no longer matches an open authoritative demand');
    const match=this.#matching.matchDemand(demandId);
    if(match.matchedAmount===0)return Object.freeze({kind:'production-input-existing-logistics-integration',status:'WAITING_FOR_AVAILABLE_RESOURCES',buildingId,demandId,resourceTypeId,match,assignment:null,reservations:Object.freeze([]),transportJobs:null});
    if(!Array.isArray(sourceStocks)||!Array.isArray(existingTransportReservations)||!Array.isArray(reservationIds))throw new TypeError('sourceStocks, existingTransportReservations and reservationIds must be arrays');
    if(reservationIds.length!==match.selections.length)throw new Error(`one transport reservation id required per matched resource selection: ${match.selections.length}`);
    const stocks=sourceStocks.map(x=>BuildingStockContract.define(x)),all=[...existingTransportReservations],planned=[];
    match.selections.forEach((selection,index)=>{
      const resource=this.#resourceState.get(selection.resourceId);if(!resource)throw new TypeError(`unknown matched resource: ${selection.resourceId}`);
      const sourceBuildingId=stable(resource.ownerId,'building','resource owner building id'),stock=stocks.find(x=>x.buildingId===sourceBuildingId&&x.resourceTypeId===resourceTypeId);
      if(!stock)throw new Error(`no matching authoritative BuildingStock for resource owner: ${sourceBuildingId}`);
      const reservation=BuildingStockTransportReservationContract.define({id:reservationIds[index],sourceBuildingId,targetBuildingId:buildingId,resourceTypeId,amount:selection.amount,state:'ACTIVE'});
      BuildingStockTransportReservationService.reserve({stock,reservations:all,reservation});all.push(reservation);planned.push(reservation);
    });
    const assigned=this.#assignment.assignMatch(match);
    for(const id of assigned.claimIds){const claim=this.#claims.get(id);if(!claim||claim.state!=='ACTIVE'||claim.demandId!==demandId||claim.consumerId!==buildingId)throw new Error(`production input logistics claim invariant failed: ${id}`);}
    const jobs=this.#transportJobs.createFromAssignment(assigned);
    if(jobs.jobs.some(j=>j.demandId!==demandId||j.targetId!==buildingId||j.definitionId!==resourceTypeId))throw new Error('production input transport job invariant failed');
    return Object.freeze({kind:'production-input-existing-logistics-integration',status:'DISPATCHED_TO_EXISTING_LOGISTICS',buildingId,demandId,resourceTypeId,match,assignment:assigned,reservations:Object.freeze(planned),transportJobs:jobs});
  }
  #find(buildingId,resourceTypeId){return this.#demands.ids().map(id=>this.#demands.get(id)).find(d=>openDemand(d,buildingId,resourceTypeId))??null;}
}
