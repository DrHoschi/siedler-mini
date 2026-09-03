import { TransportExecutionContract } from '../transport/transport-execution-contract.js';
import { PickupExecutionService } from '../transport/pickup-execution-service.js';

export function runCr06bSelfTest() {
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
    id: 'transport-job:00000001', kind: 'transport-job', status: 'PENDING',
    resourceId: 'resource:00000001', definitionId: 'resource-type:00000001',
    sourceLocation: Object.freeze({ kind: 'cell', refId: 'cell:00000001' }), amount: 3
  });
  const assignment = Object.freeze({ jobId: job.id, unitId: 'unit:00000001' });
  const resource = Object.freeze({
    id: job.resourceId, definitionId: job.definitionId, state: 'RESERVED', amount: 3,
    location: Object.freeze({ ...job.sourceLocation })
  });
  const execution = TransportExecutionContract.begin(job, assignment);

  check('pickup-transitions-to-picked-up', () => {
    const service = new PickupExecutionService();
    const result = service.pickup({ job, assignment, execution, resource });
    return result.execution.state === 'PICKED_UP'
      && result.execution.jobId === job.id
      && result.execution.unitId === assignment.unitId;
  });

  check('pickup-logically-binds-resource-to-carrier', () => {
    const service = new PickupExecutionService();
    const result = service.pickup({ job, assignment, execution, resource });
    const cargo = service.cargoForJob(job.id);
    return result.cargo.kind === 'carrier-cargo'
      && result.cargo.resourceId === resource.id
      && result.cargo.unitId === assignment.unitId
      && result.cargo.amount === job.amount
      && cargo?.resourceId === resource.id;
  });

  check('pickup-requires-matching-assignment-and-execution', () => {
    const service = new PickupExecutionService();
    return rejects(() => service.pickup({ job, assignment: { ...assignment, unitId: 'unit:00000002' }, execution, resource }))
      && rejects(() => service.pickup({ job, assignment, execution: { ...execution, jobId: 'transport-job:00000002' }, resource }));
  });

  check('pickup-requires-to-pickup-state', () => {
    const pickedUp = TransportExecutionContract.transition(execution, 'PICKED_UP');
    return rejects(() => new PickupExecutionService().pickup({ job, assignment, execution: pickedUp, resource }));
  });

  check('pickup-requires-reserved-matching-resource-at-source', () => {
    return rejects(() => new PickupExecutionService().pickup({ job, assignment, execution, resource: { ...resource, state: 'AVAILABLE' } }))
      && rejects(() => new PickupExecutionService().pickup({ job, assignment, execution, resource: { ...resource, id: 'resource:00000002' } }))
      && rejects(() => new PickupExecutionService().pickup({ job, assignment, execution, resource: { ...resource, location: { kind: 'cell', refId: 'cell:00000002' } } }));
  });

  check('same-resource-cannot-be-picked-up-by-two-jobs', () => {
    const service = new PickupExecutionService();
    service.pickup({ job, assignment, execution, resource });
    const job2 = { ...job, id: 'transport-job:00000002' };
    const assignment2 = { jobId: job2.id, unitId: 'unit:00000002' };
    const execution2 = TransportExecutionContract.begin(job2, assignment2);
    return rejects(() => service.pickup({ job: job2, assignment: assignment2, execution: execution2, resource }));
  });

  check('pickup-does-not-mutate-frozen-inputs', () => {
    const before = JSON.stringify({ job, assignment, execution, resource });
    new PickupExecutionService().pickup({ job, assignment, execution, resource });
    return JSON.stringify({ job, assignment, execution, resource }) === before;
  });

  check('cr06b-adds-no-pathfinding-routing-or-movement', () => {
    const result = new PickupExecutionService().pickup({ job, assignment, execution, resource });
    const serialized = JSON.stringify(result);
    return !serialized.includes('route')
      && !serialized.includes('path')
      && !serialized.includes('position')
      && !serialized.includes('velocity')
      && !serialized.includes('speed')
      && !serialized.includes('progress');
  });

  return Object.freeze({ pass: results.every(result => result.pass), results: Object.freeze(results.map(Object.freeze)) });
}
