import { CarrierContract } from '../transport/carrier-contract.js';
import { TransportJobContract } from '../transport/transport-job-contract.js';

export function runCr05aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => {
    try { fn(); return false; }
    catch { return true; }
  };

  const carrierInput = {
    unitId: 'unit:00000001',
    capacity: 2,
    state: 'AVAILABLE',
    location: { kind: 'cell', refId: 'cell:00000001' }
  };
  const carrier = CarrierContract.define(carrierInput);
  const job = TransportJobContract.define({
    id: 'transport-job:00000001',
    claimId: 'claim:00000001',
    demandId: 'demand:00000001',
    resourceId: 'resource:00000001',
    definitionId: 'resource-type:00000001',
    sourceLocation: { kind: 'cell', refId: 'cell:00000002' },
    targetId: 'building:00000001',
    amount: 2,
    status: 'PENDING'
  });

  check('carrier-contract-normalizes-domain-basis', () => carrier.kind === 'carrier'
    && carrier.unitId === 'unit:00000001'
    && carrier.capacity === 2
    && carrier.state === 'AVAILABLE'
    && carrier.location.kind === 'cell'
    && carrier.location.refId === 'cell:00000001');

  check('carrier-contract-is-deeply-frozen', () => Object.isFrozen(carrier) && Object.isFrozen(carrier.location));

  check('carrier-requires-stable-unit-reference', () => rejects(() => CarrierContract.define({ ...carrierInput, unitId: 'worker:00000001' }))
    && rejects(() => CarrierContract.define({ ...carrierInput, unitId: 'unit:abc' })));

  check('carrier-capacity-must-be-positive-safe-integer', () => rejects(() => CarrierContract.define({ ...carrierInput, capacity: 0 }))
    && rejects(() => CarrierContract.define({ ...carrierInput, capacity: 1.5 })));

  check('carrier-state-is-available-or-occupied-only', () => CarrierContract.define({ ...carrierInput, state: 'occupied' }).state === 'OCCUPIED'
    && rejects(() => CarrierContract.define({ ...carrierInput, state: 'MOVING' })));

  check('carrier-location-requires-stable-reference', () => rejects(() => CarrierContract.define({ ...carrierInput, location: { kind: 'cell', refId: 'invalid' } })));

  check('available-carrier-with-enough-capacity-is-suitable', () => CarrierContract.isSuitableForJob(carrier, job));

  check('occupied-carrier-is-not-suitable', () => !CarrierContract.isSuitableForJob({ ...carrierInput, state: 'OCCUPIED' }, job));

  check('undersized-carrier-is-not-suitable', () => !CarrierContract.isSuitableForJob({ ...carrierInput, capacity: 1 }, job));

  check('only-pending-transport-job-is-suitable', () => !CarrierContract.isSuitableForJob(carrier, { ...job, status: 'CANCELLED' })
    && !CarrierContract.isSuitableForJob(carrier, { ...job, kind: 'other-job' }));

  check('suitability-check-does-not-assign-or-mutate', () => {
    const beforeCarrier = JSON.stringify(carrier);
    const beforeJob = JSON.stringify(job);
    CarrierContract.assertSuitableForJob(carrier, job);
    return JSON.stringify(carrier) === beforeCarrier
      && JSON.stringify(job) === beforeJob
      && !('carrierId' in job)
      && !('jobId' in carrier)
      && !('route' in carrier)
      && !('path' in carrier)
      && !('progress' in carrier);
  });

  return Object.freeze({ pass: results.every(result => result.pass), results: Object.freeze(results.map(Object.freeze)) });
}
