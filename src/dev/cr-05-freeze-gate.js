import { runCr05aSelfTest } from './cr-05a-self-test.js';
import { runCr05bSelfTest } from './cr-05b-self-test.js';
import { runCr05cSelfTest } from './cr-05c-self-test.js';
import { CarrierAssignmentService } from '../transport/carrier-assignment-service.js';
import { TransportJobContract } from '../transport/transport-job-contract.js';

function makeCarrier(unitId, capacity = 2) {
  return { unitId, capacity, state: 'AVAILABLE', location: { kind: 'cell', refId: 'cell:00000001' } };
}

function makeJob(id, status = 'PENDING', amount = 2) {
  return TransportJobContract.define({
    id,
    claimId: `claim:${id.slice(-8)}`,
    demandId: `demand:${id.slice(-8)}`,
    resourceId: `resource:${id.slice(-8)}`,
    definitionId: 'resource-type:00000001',
    sourceLocation: { kind: 'cell', refId: 'cell:00000002' },
    targetId: 'building:00000001',
    amount,
    status
  });
}

function forbiddenStatePresent(value) {
  if (!value || typeof value !== 'object') return false;
  const forbidden = new Set(['route', 'path', 'pathfinding', 'position', 'progress', 'movement', 'pickup', 'dropoff']);
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key.toLowerCase())) return true;
    if (child && typeof child === 'object' && forbiddenStatePresent(child)) return true;
  }
  return false;
}

export function runCr05FreezeGate() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  check('cr05a-contract-regression-pass', () => runCr05aSelfTest().pass);
  check('cr05b-assignment-regression-pass', () => runCr05bSelfTest().pass);
  check('cr05c-release-regression-pass', () => runCr05cSelfTest().pass);

  check('no-carrier-can-be-double-assigned', () => {
    const service = new CarrierAssignmentService({ carriers: [
      makeCarrier('unit:00000001'),
      makeCarrier('unit:00000002')
    ] });
    service.assign(makeJob('transport-job:00000001'));
    service.assign(makeJob('transport-job:00000002'));
    const assignments = service.snapshot().assignments;
    return assignments.length === 2 && new Set(assignments.map(item => item.unitId)).size === assignments.length;
  });

  check('every-active-assignment-has-exactly-one-occupied-carrier', () => {
    const service = new CarrierAssignmentService({ carriers: [
      makeCarrier('unit:00000003'),
      makeCarrier('unit:00000001'),
      makeCarrier('unit:00000002')
    ] });
    service.assign(makeJob('transport-job:00000001'));
    service.assign(makeJob('transport-job:00000002'));
    const snapshot = service.snapshot();
    const occupied = snapshot.carriers.filter(carrier => carrier.state === 'OCCUPIED');
    return snapshot.assignments.length === 2
      && occupied.length === 2
      && snapshot.assignments.every(assignment => service.carrierForJob(assignment.jobId)?.state === 'OCCUPIED');
  });

  check('release-restores-availability-and-removes-only-that-assignment', () => {
    const service = new CarrierAssignmentService({ carriers: [
      makeCarrier('unit:00000001'),
      makeCarrier('unit:00000002')
    ] });
    service.assign(makeJob('transport-job:00000001'));
    service.assign(makeJob('transport-job:00000002'));
    const released = service.release(makeJob('transport-job:00000001', 'RELEASED'));
    return released.released === true
      && released.carrier.state === 'AVAILABLE'
      && service.assignmentForJob('transport-job:00000001') === null
      && service.assignmentForJob('transport-job:00000002')?.unitId === 'unit:00000002'
      && service.getCarrier('unit:00000002')?.state === 'OCCUPIED';
  });

  check('released-carrier-is-deterministically-reusable-without-duplicates', () => {
    const service = new CarrierAssignmentService({ carriers: [
      makeCarrier('unit:00000001'),
      makeCarrier('unit:00000002')
    ] });
    service.assign(makeJob('transport-job:00000001'));
    service.assign(makeJob('transport-job:00000002'));
    service.release(makeJob('transport-job:00000001', 'CANCELLED'));
    const third = service.assign(makeJob('transport-job:00000003'));
    const assignments = service.snapshot().assignments;
    return third.unitId === 'unit:00000001'
      && new Set(assignments.map(item => item.unitId)).size === assignments.length;
  });

  check('scope-gate-zero-pathfinding-routing-or-movement', () => {
    const service = new CarrierAssignmentService({ carriers: [makeCarrier('unit:00000001')] });
    const job = makeJob('transport-job:00000001');
    const before = JSON.stringify(job);
    service.assign(job);
    const assignedSnapshot = service.snapshot();
    service.release(makeJob('transport-job:00000001', 'CANCELLED'));
    const releasedSnapshot = service.snapshot();
    return JSON.stringify(job) === before
      && !forbiddenStatePresent(assignedSnapshot)
      && !forbiddenStatePresent(releasedSnapshot);
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results: Object.freeze(results.map(Object.freeze))
  });
}
