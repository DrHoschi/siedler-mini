function normalizePoint(point,name='position') {
  const x=Number(point?.x);
  const y=Number(point?.y);
  if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)) throw new TypeError(`${name} x/y must be safe integers`);
  return Object.freeze({x,y});
}

function assertRecoveryIntent(intent) {
  if(!intent||intent.kind!=='yield-recovery-intent'||intent.status!=='PENDING') {
    throw new TypeError('recoveryIntent must be a CR-17A pending yield recovery intent');
  }
}

function assertSource(source,name) {
  if(typeof source!=='function') throw new TypeError(`${name} must be a function`);
}

export class DeterministicRecoveryTargetSelector {
  static select({recoveryIntent,currentCell,contains,isTraversable,occupancyAt}={}) {
    assertRecoveryIntent(recoveryIntent);
    const current=normalizePoint(currentCell,'currentCell');
    assertSource(contains,'contains');
    assertSource(isTraversable,'isTraversable');
    assertSource(occupancyAt,'occupancyAt');

    const candidates=[
      {x:current.x-1,y:current.y},
      {x:current.x,y:current.y-1},
      {x:current.x,y:current.y+1},
      {x:current.x+1,y:current.y}
    ].filter(cell=>contains(cell.x,cell.y))
      .filter(cell=>isTraversable(cell)===true)
      .filter(cell=>{
        const occupancy=occupancyAt(cell);
        return occupancy?.kind==='cell-occupancy'&&occupancy.state==='FREE'&&occupancy.carrierId===null;
      })
      .sort((a,b)=>a.x-b.x||a.y-b.y);

    if(candidates.length===0) {
      return Object.freeze({kind:'recovery-target-selection',status:'NONE',carrierId:recoveryIntent.carrierId,targetCell:null,policy:'LOCAL_FREE_CARDINAL_XY_ASC'});
    }

    return Object.freeze({
      kind:'recovery-target-selection',
      status:'SELECTED',
      carrierId:recoveryIntent.carrierId,
      targetCell:normalizePoint(candidates[0],'targetCell'),
      policy:'LOCAL_FREE_CARDINAL_XY_ASC'
    });
  }
}
