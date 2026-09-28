import { BuildingStockContract } from './building-stock-contract.js';
import { SettlementEffectReceiptContract } from '../savegame/settlement-effect-receipt-contract.js';

const SOURCE = 'IM-27_PRODUCTION_OUTPUT';
function arrays(value,label){if(!Array.isArray(value))throw new TypeError(`${label} array required`);return value;}
function key(settlementId,resourceTypeId){return `${settlementId}|${resourceTypeId}`;}
function represented(resourceState,claims,buildingId,resourceTypeId,exceptKey=null){
  return resourceState.ids().map(id=>resourceState.get(id)).filter(r=>
    r?.ownerId===buildingId&&r.definitionId===resourceTypeId&&r.metadata?.source===SOURCE&&
    (exceptKey==null||r.metadata?.effectKey!==exceptKey)
  ).reduce((sum,r)=>sum+(claims?claims.availableAmount(r.id):(r.state==='CONSUMED'?0:r.amount)),0);
}
function existingFor(resourceState,effectKey){
  return resourceState.ids().map(id=>resourceState.get(id)).find(r=>r?.metadata?.source===SOURCE&&r.metadata?.effectKey===effectKey)??null;
}

export class ProductionOutputResourceAvailabilityIntegration {
  static materialize({receipt,settledIds,buildingStocks,resourceState,claims=null}={}){
    if(!resourceState||typeof resourceState.ids!=='function'||typeof resourceState.get!=='function'||typeof resourceState.createResource!=='function')throw new TypeError('ResourceState-compatible instance required');
    if(claims!=null&&typeof claims.availableAmount!=='function')throw new TypeError('ResourceClaims-compatible instance required');
    const effect=SettlementEffectReceiptContract.production(receipt);
    const fences=arrays(settledIds,'settledIds');
    if(!fences.includes(effect.settlementId))return Object.freeze({kind:'production-output-resource-availability',status:'NOT_MATERIALIZED',reason:'SETTLEMENT_FENCE_MISSING',settlementId:effect.settlementId,resources:Object.freeze([]),mutation:false});
    const stocks=arrays(buildingStocks,'buildingStocks').map(x=>BuildingStockContract.define(x));
    const resources=[];
    for(const output of effect.outputs){
      const effectKey=key(effect.settlementId,output.resourceTypeId),existing=existingFor(resourceState,effectKey);
      if(existing){
        if(existing.ownerId!==effect.buildingId||existing.definitionId!==output.resourceTypeId||existing.amount!==output.amount)throw new Error('existing IM-27 resource does not match production effect');
        resources.push(existing);continue;
      }
      const stock=stocks.find(x=>x.buildingId===effect.buildingId&&x.resourceTypeId===output.resourceTypeId);
      if(!stock)throw new Error('authoritative output BuildingStock required');
      const already=represented(resourceState,claims,effect.buildingId,output.resourceTypeId);
      if(output.amount>stock.quantity-already)throw new Error('production output representation exceeds authoritative available BuildingStock');
      resources.push(resourceState.createResource({
        definitionId:output.resourceTypeId,amount:output.amount,state:'AVAILABLE',
        location:{kind:'owner',refId:effect.buildingId},ownerId:effect.buildingId,
        metadata:{source:SOURCE,effectKey,settlementId:effect.settlementId,buildingId:effect.buildingId,resourceTypeId:output.resourceTypeId},
      }));
    }
    return Object.freeze({kind:'production-output-resource-availability',status:'MATERIALIZED',settlementId:effect.settlementId,resources:Object.freeze(resources),mutation:resources.some(r=>r.metadata?.settlementId===effect.settlementId)&&effect.outputs.some(o=>!false)});
  }
}
