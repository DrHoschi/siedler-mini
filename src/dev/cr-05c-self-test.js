import { CarrierAssignmentService } from '../transport/carrier-assignment-service.js';
import { TransportJobContract } from '../transport/transport-job-contract.js';

function makeCarrier(unitId = 'unit:00000001', capacity = 2) {
  return { unitId, capacity, state: 'AVAILABLE', location: { kind: 'cell', refId: 'cell:00000001' } };
}

function makeJob(id = 'transport-job:00000001', status = 'PENDING') {
  return TransportJobContract.define({
    id,
    claimId: 'claim:00000001',
    demandId: 'demand:00000001',
    resourceId: 'resource:00000001',
    definitionId: 'resource-type:00000001',
    sourceLocation: { kind: 'cell', refId: 'cell:00000002' },
    targetId: 'building:00000001',
    amount: 2,
    status
  });
}

export function runCr05cSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => {
    try { fn(); return false; }
    catch { return true; }
  };

  check('cancelled-job-releases-assigned-carrier', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier()] });
    service.assign(makeJob());
    const result = service.release(makeJob('transport-job:00000001', 'CANCELLED'));
    return result.released === true
      && result.unitId === 'unit:00000001'
      && result.carrier.state === 'AVAILABLE';
  });

  check('released-job-releases-assigned-carrier', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier()] });
    service.assign(makeJob());
    const result = service.release(makeJob('transport-job:00000001', 'RELEASED'));
    return result.released === true && service.getCarrier('unit:00000001')?.state === 'AVAILABLE';
  });

  check('assignment-link-is-removed-on-release', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier()] });
    service.assign(makeJob());
    service.release(makeJob('transport-job:00000001', 'CANCELLED'));
    return service.assignmentForJob('transport-job:00000001') === null
      && service.carrierForJob('transport-job:00000001') === null
      && service.snapshot().assignments.length === 0;
  });

  check('release-is-idempotent', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier()] });
    service.assign(makeJob());
    const terminal = makeJob('transport-job:00000001', 'RELEASED');
    const first = service.release(terminal);
    const second = service.release(terminal);
    return first.released === true
      && second.released === false
      && second.unitId === null
      && service.getCarrier('unit:00000001')?.state === 'AVAILABLE';
  });

  check('pending-job-cannot-release-carrier', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier()] });
    service.assign(makeJob());
    return rejects(() => service.release(makeJob('transport-job:00000001', 'PENDING')))
      && service.getCarrier('unit:00000001')?.state === 'OCCUPIED'
      && service.assignmentForJob('transport-job:00000001')?.unitId === 'unit:00000001';
  });

  check('recovered-carrier-can-be-reassigned', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier()] });
    service.assign(makeJob('transport-job:00000001'));
    service.release(makeJob('transport-job:00000001', 'CANCELLED'));
    const next = service.assign(makeJob('transport-job:00000002'));
    return next.unitId === 'unit:00000001' && next.carrier.state === 'OCCUPIED';
  });

  check('release-preserves-carrier-capacity-and-location', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier()] });
    service.assign(makeJob());
    const result = service.release(makeJob('transport-job:00000001', 'RELEASED'));
    return result.carrier.capacity === 2
      && result.carrier.location.kind === 'cell'
      && result.carrier.location.refId === 'cell:00000001';
  });

  check('release-does-not-add-routing-or-movement-state', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier()] });
    service.assign(makeJob());
    const job = makeJob('transport-job:00000001', 'CANCELLED');
    const beforeJob = JSON.stringify(job);
    const result = service.release(job);
    return JSON.stringify(job) === beforeJob
      && !('route' in result.carrier)
      && !('path' in result.carrier)
      && !('progress' in result.carrier)
      && !('position' in result.carrier)
      && !('pickup' in result.carrier)
      && !('dropoff' in result.carrier);
  });

  return Object.freeze({ pass: results.every(result => result.pass), results: Object.freeze(results.map(Object.freeze)) });
}
