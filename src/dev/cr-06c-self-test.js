import { TransportExecutionContract } from '../transport/transport-execution-contract.js';
import { PickupExecutionService } from '../transport/pickup-execution-service.js';
import { DeliveryExecutionService } from '../transport/delivery-execution-service.js';

export function runCr06cSelfTest() {
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
    sourceLocation: Object.freeze({ kind: 'cell', refId: 'cell:00000001' }),
    targetId: 'building:00000001', amount: 3
  });
  const assignment = Object.freeze({ jobId: job.id, unitId: 'unit:00000001' });
  const resource = Object.freeze({
    id: job.resourceId, definitionId: job.definitionId, state: 'RESERVED', amount: 3,
    location: Object.freeze({ ...job.sourceLocation })
  });

  function pickedUpFixture() {
    const pickup = new PickupExecutionService();
    const execution = TransportExecutionContract.begin(job, assignment);
    const result = pickup.pickup({ job, assignment, execution, resource });
    return { execution: result.execution, cargo: result.cargo };
  }

  check('delivery-transitions-picked-up-to-to-dropoff', () => {
    const { execution, cargo } = pickedUpFixture();
    const result = new DeliveryExecutionService().beginDropoff({ job, assignment, execution, cargo });
    return result.execution.state === 'TO_DROPOFF'
      && result.execution.jobId === job.id
      && result.execution.unitId === assignment.unitId;
  });

  check('delivery-transitions-to-dropoff-to-delivered', () => {
    const { execution, cargo } = pickedUpFixture();
    const service = new DeliveryExecutionService();
    const toDropoff = service.beginDropoff({ job, assignment, execution, cargo });
    const delivered = service.deliver({ job, assignment, execution: toDropoff.execution, cargo });
    return delivered.execution.state === 'DELIVERED';
  });

  check('delivery-logically-hands-cargo-to-job-target', () => {
    const { execution, cargo } = pickedUpFixture();
    const service = new DeliveryExecutionService();
    const toDropoff = service.beginDropoff({ job, assignment, execution, cargo });
    const result = service.deliver({ job, assignment, execution: toDropoff.execution, cargo });
    const stored = service.deliveryForJob(job.id);
    return result.delivery.kind === 'delivered-cargo'
      && result.delivery.targetId === job.targetId
      && result.delivery.resourceId === job.resourceId
      && result.delivery.unitId === assignment.unitId
      && result.delivery.amount === job.amount
      && stored?.targetId === job.targetId;
  });

  check('delivery-requires-matching-job-assignment-execution-and-cargo', () => {
    const { execution, cargo } = pickedUpFixture();
    const service = new DeliveryExecutionService();
    return rejects(() => service.beginDropoff({ job, assignment: { ...assignment, unitId: 'unit:00000002' }, execution, cargo }))
      && rejects(() => service.beginDropoff({ job, assignment, execution: { ...execution, jobId: 'transport-job:00000002' }, cargo }))
      && rejects(() => service.beginDropoff({ job, assignment, execution, cargo: { ...cargo, resourceId: 'resource:00000002' } }));
  });

  check('delivery-rejects-skipped-or-wrong-states', () => {
    const initial = TransportExecutionContract.begin(job, assignment);
    const { execution, cargo } = pickedUpFixture();
    const service = new DeliveryExecutionService();
    return rejects(() => service.beginDropoff({ job, assignment, execution: initial, cargo }))
      && rejects(() => service.deliver({ job, assignment, execution, cargo }));
  });

  check('delivery-is-single-completion-per-job', () => {
    const { execution, cargo } = pickedUpFixture();
    const service = new DeliveryExecutionService();
    const toDropoff = service.beginDropoff({ job, assignment, execution, cargo });
    service.deliver({ job, assignment, execution: toDropoff.execution, cargo });
    return rejects(() => service.deliver({ job, assignment, execution: toDropoff.execution, cargo }));
  });

  check('delivery-does-not-consume-resource-or-claim', () => {
    const { execution, cargo } = pickedUpFixture();
    const before = JSON.stringify({ job, assignment, resource, cargo });
    const service = new DeliveryExecutionService();
    const toDropoff = service.beginDropoff({ job, assignment, execution, cargo });
    service.deliver({ job, assignment, execution: toDropoff.execution, cargo });
    return JSON.stringify({ job, assignment, resource, cargo }) === before
      && resource.state === 'RESERVED';
  });

  check('cr06c-adds-no-pathfinding-routing-or-movement', () => {
    const { execution, cargo } = pickedUpFixture();
    const service = new DeliveryExecutionService();
    const toDropoff = service.beginDropoff({ job, assignment, execution, cargo });
    const result = service.deliver({ job, assignment, execution: toDropoff.execution, cargo });
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
