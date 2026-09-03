import { RouteContract } from './route-contract.js';
import { TraversalCostContract } from './traversal-cost-contract.js';

function normalizeGridPosition(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be a grid position object`);
  const x = Number(value.x);
  const y = Number(value.y);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) throw new TypeError(`${name}.x and ${name}.y must be safe integers`);
  return Object.freeze({x,y});
}

function assertMap(map) {
  if (!map || typeof map.contains !== 'function') throw new TypeError('MapStructure-compatible instance required');
}

function key(position) { return `${position.x},${position.y}`; }
function samePosition(a,b) { return a.x===b.x && a.y===b.y; }

function neighborDeltas(current, target) {
  const xToward=Math.sign(target.x-current.x);
  const yToward=Math.sign(target.y-current.y);
  const candidates=[];
  const push=(dx,dy)=>{if((dx!==0||dy!==0)&&!candidates.some(d=>d[0]===dx&&d[1]===dy)) candidates.push([dx,dy]);};
  push(xToward,0);
  push(0,yToward);
  push(-xToward,0);
  push(0,-yToward);
  push(1,0); push(-1,0); push(0,1); push(0,-1);
  return candidates;
}

function traversalCostAt(costAt, position) {
  const source = typeof costAt === 'function' ? costAt(Object.freeze({x:position.x,y:position.y})) : undefined;
  return TraversalCostContract.define(source).traversalCost;
}

function reconstruct(cameFrom, start, target) {
  const reversed=[];
  let cursor=target;
  while (!samePosition(cursor,start)) {
    reversed.push(Object.freeze({x:cursor.x,y:cursor.y}));
    const previous=cameFrom.get(key(cursor));
    if (!previous) throw new Error('cost-aware path reconstruction failed');
    cursor=previous;
  }
  return reversed.reverse();
}

export class DeterministicCostAwarePathfinder {
  static find({map,startPosition,targetPosition,costAt}={}) {
    assertMap(map);
    const start=normalizeGridPosition(startPosition,'startPosition');
    const target=normalizeGridPosition(targetPosition,'targetPosition');
    if (!map.contains(start.x,start.y)) throw new RangeError(`startPosition outside map: ${start.x},${start.y}`);
    if (!map.contains(target.x,target.y)) throw new RangeError(`targetPosition outside map: ${target.x},${target.y}`);
    if (samePosition(start,target)) throw new Error('targetPosition must differ from startPosition');
    if (costAt != null && typeof costAt !== 'function') throw new TypeError('costAt must be a function when provided');

    let sequence=0;
    const frontier=[{position:start,cost:0,sequence:sequence++}];
    const bestCost=new Map([[key(start),0]]);
    const cameFrom=new Map();

    while (frontier.length>0) {
      frontier.sort((a,b)=>a.cost-b.cost || a.sequence-b.sequence);
      const current=frontier.shift();
      if (current.cost!==bestCost.get(key(current.position))) continue;
      if (samePosition(current.position,target)) {
        const steps=reconstruct(cameFrom,start,target);
        return RouteContract.define({startPosition:start,targetPosition:target,waypoints:steps.slice(0,-1),state:'DEFINED'});
      }

      for (const [dx,dy] of neighborDeltas(current.position,target)) {
        const next=Object.freeze({x:current.position.x+dx,y:current.position.y+dy});
        if (!map.contains(next.x,next.y)) continue;
        const candidateCost=current.cost+traversalCostAt(costAt,next);
        const nextKey=key(next);
        const known=bestCost.get(nextKey);
        if (known===undefined || candidateCost<known) {
          bestCost.set(nextKey,candidateCost);
          cameFrom.set(nextKey,current.position);
          frontier.push({position:next,cost:candidateCost,sequence:sequence++});
        }
      }
    }

    throw new Error('no traversable route found');
  }
}
