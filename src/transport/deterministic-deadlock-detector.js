import { WaitDependencyContract } from './wait-dependency-contract.js';

function canonicalCycle(carrierIds) {
  let best=null;
  for (let i=0;i<carrierIds.length;i+=1) {
    const rotated=[...carrierIds.slice(i),...carrierIds.slice(0,i)];
    const key=rotated.join('>');
    if (best===null || key<best.key) best={key,carrierIds:rotated};
  }
  return best;
}

export class DeterministicDeadlockDetector {
  static detect(dependencies = []) {
    if (!Array.isArray(dependencies)) throw new TypeError('dependencies must be an array');

    const nextByCarrier=new Map();
    for (const dependency of dependencies) {
      const normalized=WaitDependencyContract.define(dependency);
      const existing=nextByCarrier.get(normalized.waitingCarrierId);
      if (existing && existing!==normalized.blockingCarrierId) {
        throw new TypeError(`waiting carrier has conflicting dependencies: ${normalized.waitingCarrierId}`);
      }
      nextByCarrier.set(normalized.waitingCarrierId,normalized.blockingCarrierId);
    }

    const deadlocksByKey=new Map();
    const starts=[...nextByCarrier.keys()].sort();

    for (const start of starts) {
      const path=[];
      const indexByCarrier=new Map();
      let current=start;

      while (nextByCarrier.has(current)) {
        if (indexByCarrier.has(current)) {
          const cycle=path.slice(indexByCarrier.get(current));
          const canonical=canonicalCycle(cycle);
          if (!deadlocksByKey.has(canonical.key)) {
            deadlocksByKey.set(canonical.key,Object.freeze({
              kind:'deadlock',
              carrierIds:Object.freeze([...canonical.carrierIds]),
              dependencyCount:canonical.carrierIds.length
            }));
          }
          break;
        }
        indexByCarrier.set(current,path.length);
        path.push(current);
        current=nextByCarrier.get(current);
      }
    }

    const deadlocks=[...deadlocksByKey.entries()]
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([,deadlock])=>deadlock);

    return Object.freeze({
      kind:'deadlock-detection',
      deadlocks:Object.freeze(deadlocks),
      deadlockCount:deadlocks.length
    });
  }
}
