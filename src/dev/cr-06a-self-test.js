import { TransportExecutionContract } from '../transport/transport-execution-contract.js';

export function runCr06aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => {
    try { fn(); return false; }
    catch { return true; }
  };

  const job = Object.freeze({
    id: 'transport-job:00000001',
    kind: 'transport-job',
    status: 'PENDING'
  });
  const assignment = Object.freeze({
    jobId: 'transport-job:00000001',
    unitId: 'unit:00000001'
  });

  check('assigned-pending-job-begins-to-pickup', () => {
    const execution = TransportExecutionContract.begin(job, assignment);
    return execution.kind === 'transport-execution'
      && execution.jobId === job.id
      && execution.unitId === assignment.unitId
      && execution.state === 'TO_PICKUP';
  });

  check('execution-record-is-frozen', () => Object.isFrozen(TransportExecutionContract.begin(job, assignment)));

  check('execution-requires-pending-transport-job', () => rejects(() => TransportExecutionContract.begin({ ...job, status: 'CANCELLED' }, assignment))
    && rejects(() => TransportExecutionContract.begin({ ...job, kind: 'other-job' }, assignment)));

  check('execution-requires-matching-carrier-assignment', () => rejects(() => TransportExecutionContract.begin(job, { ...assignment, jobId: 'transport-job:00000002' }))
    && rejects(() => TransportExecutionContract.begin(job, { ...assignment, unitId: 'carrier:00000001' })));

  check('execution-state-sequence-is-deterministic', () => {
    const toPickup = TransportExecutionContract.begin(job, assignment);
    const pickedUp = TransportExecutionContract.transition(toPickup, 'PICKED_UP');
    const toDropoff = TransportExecutionContract.transition(pickedUp, 'TO_DROPOFF');
    const delivered = TransportExecutionContract.transition(toDropoff, 'DELIVERED');
    return pickedUp.state === 'PICKED_UP'
      && toDropoff.state === 'TO_DROPOFF'
      && delivered.state === 'DELIVERED';
  });

  check('execution-rejects-skipped-transitions', () => rejects(() => TransportExecutionContract.transition(
    TransportExecutionContract.begin(job, assignment),
    'TO_DROPOFF'
  )) && rejects(() => TransportExecutionContract.transition(
    TransportExecutionContract.begin(job, assignment),
    'DELIVERED'
  )));

  check('execution-rejects-backward-transitions', () => {
    const pickedUp = TransportExecutionContract.transition(TransportExecutionContract.begin(job, assignment), 'PICKED_UP');
    return rejects(() => TransportExecutionContract.transition(pickedUp, 'TO_PICKUP'));
  });

  check('delivered-is-terminal', () => {
    const pickedUp = TransportExecutionContract.transition(TransportExecutionContract.begin(job, assignment), 'PICKED_UP');
    const toDropoff = TransportExecutionContract.transition(pickedUp, 'TO_DROPOFF');
    const delivered = TransportExecutionContract.transition(toDropoff, 'DELIVERED');
    return rejects(() => TransportExecutionContract.transition(delivered, 'TO_PICKUP'))
      && rejects(() => TransportExecutionContract.transition(delivered, 'PICKED_UP'))
      && rejects(() => TransportExecutionContract.transition(delivered, 'TO_DROPOFF'));
  });

  check('cr06a-adds-no-pathfinding-or-movement-state', () => {
    const execution = TransportExecutionContract.begin(job, assignment);
    return !('route' in execution)
      && !('path' in execution)
      && !('position' in execution)
      && !('progress' in execution)
      && !('speed' in execution)
      && !('velocity' in execution)
      && !('coordinates' in execution)
      && !('targetPosition' in execution);
  });

  check('execution-transition-does-not-mutate-job-or-assignment', () => {
    const beforeJob = JSON.stringify(job);
    const beforeAssignment = JSON.stringify(assignment);
    const execution = TransportExecutionContract.begin(job, assignment);
    TransportExecutionContract.transition(execution, 'PICKED_UP');
    return JSON.stringify(job) === beforeJob && JSON.stringify(assignment) === beforeAssignment;
  });

  return Object.freeze({ pass: results.every(result => result.pass), results: Object.freeze(results.map(Object.freeze)) });
}
