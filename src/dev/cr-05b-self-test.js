import { CarrierAssignmentService } from '../transport/carrier-assignment-service.js';
import { TransportJobContract } from '../transport/transport-job-contract.js';

function makeCarrier(unitId, capacity = 2, state = 'AVAILABLE') {
  return { unitId, capacity, state, location: { kind: 'cell', refId: 'cell:00000001' } };
}

function makeJob(id = 'transport-job:00000001', amount = 2, status = 'PENDING') {
  return TransportJobContract.define({
    id,
    claimId: 'claim:00000001',
    demandId: 'demand:00000001',
    resourceId: 'resource:00000001',
    definitionId: 'resource-type:00000001',
    sourceLocation: { kind: 'cell', refId: 'cell:00000002' },
    targetId: 'building:00000001',
    amount,
    status
  });
}

export function runCr05bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => {
    try { fn(); return false; }
    catch { return true; }
  };

  check('carrier-selection-is-deterministic-by-unit-id', () => {
    const service = new CarrierAssignmentService({ carriers: [
      makeCarrier('unit:00000003'),
      makeCarrier('unit:00000001'),
      makeCarrier('unit:00000002')
    ] });
    return service.assign(makeJob()).unitId === 'unit:00000001';
  });

  check('assigned-carrier-becomes-occupied', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier('unit:00000001')] });
    const result = service.assign(makeJob());
    return result.carrier.state === 'OCCUPIED'
      && service.getCarrier('unit:00000001')?.state === 'OCCUPIED';
  });

  check('assignment-is-recorded-job-to-unit', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier('unit:00000002')] });
    service.assign(makeJob());
    const assignment = service.assignmentForJob('transport-job:00000001');
    return assignment?.jobId === 'transport-job:00000001'
      && assignment?.unitId === 'unit:00000002'
      && service.carrierForJob('transport-job:00000001')?.unitId === 'unit:00000002';
  });

  check('same-job-assignment-is-idempotent', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier('unit:00000001')] });
    const job = makeJob();
    const first = service.assign(job);
    const second = service.assign(job);
    return first.created === true
      && second.created === false
      && first.unitId === second.unitId
      && service.snapshot().assignments.length === 1;
  });

  check('occupied-carrier-is-not-reused-for-another-job', () => {
    const service = new CarrierAssignmentService({ carriers: [
      makeCarrier('unit:00000001'),
      makeCarrier('unit:00000002')
    ] });
    const first = service.assign(makeJob('transport-job:00000001'));
    const second = service.assign(makeJob('transport-job:00000002'));
    return first.unitId === 'unit:00000001' && second.unitId === 'unit:00000002';
  });

  check('carrier-capacity-is-respected', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier('unit:00000001', 1)] });
    return rejects(() => service.assign(makeJob('transport-job:00000001', 2)));
  });

  check('only-pending-transport-job-can-be-assigned', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier('unit:00000001')] });
    return rejects(() => service.assign(makeJob('transport-job:00000001', 2, 'CANCELLED')))
      && rejects(() => service.assign({ ...makeJob(), id: 'job:00000001' }));
  });

  check('duplicate-carrier-unit-id-is-rejected', () => rejects(() => new CarrierAssignmentService({ carriers: [
    makeCarrier('unit:00000001'),
    makeCarrier('unit:00000001')
  ] })));

  check('assignment-does-not-add-routing-or-movement-state', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier('unit:00000001')] });
    const job = makeJob();
    const beforeJob = JSON.stringify(job);
    const result = service.assign(job);
    const afterJob = JSON.stringify(job);
    const carrier = result.carrier;
    return beforeJob === afterJob
      && !('carrierId' in job)
      && !('route' in carrier)
      && !('path' in carrier)
      && !('progress' in carrier)
      && !('position' in carrier)
      && !('pickup' in carrier)
      && !('dropoff' in carrier);
  });

  return Object.freeze({ pass: results.every(result => result.pass), results: Object.freeze(results.map(Object.freeze)) });
}
