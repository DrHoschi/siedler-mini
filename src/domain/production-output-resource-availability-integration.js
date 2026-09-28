import { BuildingStockContract } from './building-stock-contract.js';
import { SettlementEffectReceiptContract } from '../savegame/settlement-effect-receipt-contract.js';

const SOURCE = 'IM-27_PRODUCTION_OUTPUT';
function arrays(value,label){if(!Array.isArray(value))throw new TypeError(`${label} array required`);return value;}
function effectKey(settlementId,resourceTypeId){return `${settlementId}|${resourceTypeId}`;}
function resources(resourceState){return resourceState.ids().map(id=>resourceState.get(id));}
function availableRepresented(resourceState,claims,buildingId,resourceTypeId){
  return resources(resourceState).filter(r=>r?.ownerId===buildingId&&r.definitionId===resourceTypeId&&r.metadata?.source===SOURCE)
    .reduce((sum,r)=>sum+(claims?claims.availableAmount(r.id):(r.state==='CONSUMED'?0:r.amount)),0);
}
function existingFor(resourceState,key){
  return resources(resourceState).find(r=>r?.metadata?.source===SOURCE&&r.metadata?.effectKey===key)??null;
}

export class ProductionOutputResourceAvailabilityIntegration {
  static materialize({receipt,settledIds,buildingStocks,resourceState,claims=null}={}){
    if(!resourceState||typeof resourceState.ids!=='function'||typeof resourceState.get!=='function'||typeof resourceState.getDefinition!=='function'||typeof resourceState.createResource!=='function')throw new TypeError('ResourceState-compatible instance required');
    if(claims!=null&&typeof claims.availableAmount!=='function')throw new TypeError('ResourceClaims-compatible instance required');
    const effect=SettlementEffectReceiptContract.production(receipt);
    const fences=arrays(settledIds,'settledIds');
    if(!fences.includes(effect.settlementId))return Object.freeze({kind:'production-output-resource-availability',status:'NOT_MATERIALIZED',reason:'SETTLEMENT_FENCE_MISSING',settlementId:effect.settlementId,resources:Object.freeze([]),mutation:false});
    const stocks=arrays(buildingStocks,'buildingStocks').map(x=>BuildingStockContract.define(x));
    const plan=effect.outputs.map(output=>{
      if(!resourceState.getDefinition(output.resourceTypeId))throw new TypeError(`unknown output resource definition: ${output.resourceTypeId}`);
      const key=effectKey(effect.settlementId,output.resourceTypeId),existing=existingFor(resourceState,key);
      if(existing){
        if(existing.ownerId!==effect.buildingId||existing.definitionId!==output.resourceTypeId||existing.amount!==output.amount)throw new Error('existing IM-27 resource does not match production effect');
        return Object.freeze({output,key,existing});
      }
      const stock=stocks.find(x=>x.buildingId===effect.buildingId&&x.resourceTypeId===output.resourceTypeId);
      if(!stock)throw new Error('authoritative output BuildingStock required');
      const represented=availableRepresented(resourceState,claims,effect.buildingId,output.resourceTypeId);
      if(output.amount>stock.quantity-represented)throw new Error('production output representation exceeds authoritative available BuildingStock');
      return Object.freeze({output,key,existing:null});
    });
    const created=[];
    const materialized=plan.map(item=>{
      if(item.existing)return item.existing;
      const r=resourceState.createResource({
        definitionId:item.output.resourceTypeId,amount:item.output.amount,state:'AVAILABLE',
        location:{kind:'owner',refId:effect.buildingId},ownerId:effect.buildingId,
        metadata:{source:SOURCE,effectKey:item.key,settlementId:effect.settlementId,buildingId:effect.buildingId,resourceTypeId:item.output.resourceTypeId},
      });
      created.push(r);return r;
    });
    return Object.freeze({kind:'production-output-resource-availability',status:created.length?'MATERIALIZED':'ALREADY_MATERIALIZED',settlementId:effect.settlementId,resources:Object.freeze(materialized),mutation:created.length>0});
  }
}
