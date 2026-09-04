function asUnitId(value){const id=String(value??'').trim();if(!/^unit:\d{8}$/.test(id))throw new TypeError(`carrierId requires unit stable id: ${value}`);return id;}
function asCell(value){const x=Number(value?.x),y=Number(value?.y);if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))throw new TypeError('cell.x and cell.y must be safe integers');return Object.freeze({x,y});}
function asStep(value,name){const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw new TypeError(`${name} must be a non-negative safe integer`);return n;}
export class CellReservationContract{
 static define({carrierId,cell,validFromStep,validUntilStep,status='REQUESTED'}={}){
  const from=asStep(validFromStep,'validFromStep');
  const until=asStep(validUntilStep,'validUntilStep');
  if(until<from)throw new TypeError('validUntilStep must be >= validFromStep');
  if(status!=='REQUESTED')throw new TypeError('CR-19A reservation status must be REQUESTED');
  return Object.freeze({kind:'cell-reservation',carrierId:asUnitId(carrierId),cell:asCell(cell),validFromStep:from,validUntilStep:until,status:'REQUESTED'});
 }
}
