function sameCell(a,b){return a.x===b.x&&a.y===b.y;}
function assertReservation(r){if(!r||r.kind!=='cell-reservation'||r.status!=='REQUESTED')throw new TypeError('reservations must be CR-19A REQUESTED cell reservations');}
function overlaps(a,b){return a.validFromStep<=b.validUntilStep&&b.validFromStep<=a.validUntilStep;}
export class DeterministicReservationArbitration{
 static decide({reservations}={}){
  if(!Array.isArray(reservations)||reservations.length===0)throw new TypeError('reservations must be a non-empty array');
  reservations.forEach(assertReservation);
  const cell=reservations[0].cell;
  if(!reservations.every(r=>sameCell(r.cell,cell)))throw new TypeError('all competing reservations must target the same cell');
  if(reservations.length>1&&!reservations.every((r,i)=>reservations.every((o,j)=>i===j||overlaps(r,o))))throw new TypeError('competing reservations must overlap in validity');
  const ordered=[...reservations].sort((a,b)=>a.validFromStep-b.validFromStep||a.validUntilStep-b.validUntilStep||a.carrierId.localeCompare(b.carrierId));
  const winner=ordered[0];
  return Object.freeze({kind:'reservation-arbitration-decision',status:'WINNER_SELECTED',cell:Object.freeze({x:cell.x,y:cell.y}),winnerCarrierId:winner.carrierId,winnerReservation:winner,loserCarrierIds:Object.freeze(ordered.slice(1).map(r=>r.carrierId)),policy:'EARLIEST_WINDOW_THEN_LOWEST_STABLE_ID'});
 }
}
