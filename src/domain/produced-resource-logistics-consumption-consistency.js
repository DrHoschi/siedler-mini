const SOURCE='IM-27_PRODUCTION_OUTPUT';
function produced(v){if(!v||v.kind!=='resource'||v.metadata?.source!==SOURCE)throw new TypeError('IM-27 produced resource required');return v;}
export class ProducedResourceLogisticsConsumptionConsistency{
 static verify({deliveryCommit,buildingStockSettlement,resourceState,claims}={}){
  if(deliveryCommit?.kind!=='delivery-settlement-commit')throw new TypeError('existing delivery-settlement-commit required');
  if(buildingStockSettlement?.kind!=='delivered-transport-building-stock-settlement')throw new TypeError('existing BuildingStock delivery settlement required');
  if(!resourceState||typeof resourceState.get!=='function')throw new TypeError('ResourceState-compatible instance required');
  if(!claims||typeof claims.get!=='function'||typeof claims.availableAmount!=='function'||typeof claims.consumedAmount!=='function'||typeof claims.reservedAmount!=='function')throw new TypeError('ResourceClaims-compatible instance required');
  const s=deliveryCommit.settlement,c=claims.get(s.claimId),r=produced(resourceState.get(s.resourceId)),p=buildingStockSettlement;
  if(deliveryCommit.claim?.id!==s.claimId||deliveryCommit.claim?.state!=='CONSUMED'||!c||c.state!=='CONSUMED')throw new Error('existing logistics settlement must consume claim first');
  if(c.resourceId!==r.id||c.amount!==s.amount)throw new Error('consumed claim/resource amount mismatch');
  if(p.delivery?.resourceId!==r.id||p.jobId!==s.jobId||p.amount!==s.amount||p.delivery?.amount!==s.amount)throw new Error('BuildingStock delivery does not match logistics settlement');
  if(p.sourceStock?.buildingId!==r.ownerId||p.sourceStock?.resourceTypeId!==r.definitionId)throw new Error('source BuildingStock does not match produced resource');
  if(p.targetStock?.buildingId!==s.targetId||p.targetStock?.resourceTypeId!==r.definitionId)throw new Error('target BuildingStock does not match logistics settlement');
  if(p.reservation?.state!=='RELEASED')throw new Error('BuildingStock reservation must be RELEASED');
  const available=claims.availableAmount(r.id);
  if(available>p.sourceStock.quantity)throw new Error('produced resource availability exceeds authoritative source BuildingStock');
  if(r.state==='CONSUMED'&&available!==0)throw new Error('consumed resource remains available');
  return Object.freeze({kind:'produced-resource-logistics-consumption-consistency',status:'CONSISTENT',resourceId:r.id,claimId:c.id,jobId:s.jobId,amount:s.amount,availableAfter:available,sourceQuantityAfter:p.sourceStock.quantity,mutation:false});
 }
}