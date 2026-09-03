import { runCr06aSelfTest } from './cr-06a-self-test.js';
import { runCr06bSelfTest } from './cr-06b-self-test.js';
import { runCr06cSelfTest } from './cr-06c-self-test.js';
import { TransportExecutionContract } from '../transport/transport-execution-contract.js';
import { PickupExecutionService } from '../transport/pickup-execution-service.js';
import { DeliveryExecutionService } from '../transport/delivery-execution-service.js';

function makeFixture(suffix = '00000001') {
  const job = Object.freeze({
    id: `transport-job:${suffix}`,
    kind: 'transport-job',
    status: 'PENDING',
    resourceId: `resource:${suffix}`,
    definitionId: 'resource-type:00000001',
    sourceLocation: Object.freeze({ kind: 'cell', refId: 'cell:00000001' }),
    targetId: 'building:00000001',
    amount: 3
  });
  const assignment = Object.freeze({ jobId: job.id, unitId: `unit:${suffix}` });
  const resource = Object.freeze({
    id: job.resourceId,
    definitionId: job.definitionId,
    state: 'RESERVED',
    amount: 3,
    location: Object.freeze({ ...job.sourceLocation })
  });
  const execution = TransportExecutionContract.begin(job, assignment);
  return Object.freeze({ job, assignment, resource, execution });
}

function rejects(fn) {
  try { fn(); return false; }
  catch { return true; }
}

function forbiddenStatePresent(value) {
  if (!value || typeof value !== 'object') return false;
  const forbidden = new Set([
    'route', 'path', 'pathfinding', 'position', 'coordinates', 'targetposition',
    'progress', 'movement', 'velocity', 'speed'
  ]);
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key.toLowerCase())) return true;
    if (child && typeof child === 'object' && forbiddenStatePresent(child)) return true;
  }
  return false;
}

export function runCr06FreezeGate() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  check('cr06a-state-contract-regression-pass', () => runCr06aSelfTest().pass);
  check('cr06b-pickup-regression-pass', () => runCr06bSelfTest().pass);
  check('cr06c-delivery-regression-pass', () => runCr06cSelfTest().pass);

  check('execution-chain-is-strict-and-complete', () => {
    const { job, assignment, resource, execution } = makeFixture();
    const pickup = new PickupExecutionService();
    const delivery = new DeliveryExecutionService();
    const picked = pickup.pickup({ job, assignment, execution, resource });
    const toDropoff = delivery.beginDropoff({ job, assignment, execution: picked.execution, cargo: picked.cargo });
    const delivered = delivery.deliver({ job, assignment, execution: toDropoff.execution, cargo: picked.cargo });
    return execution.state === 'TO_PICKUP'
      && picked.execution.state === 'PICKED_UP'
      && toDropoff.execution.state === 'TO_DROPOFF'
      && delivered.execution.state === 'DELIVERED'
      && rejects(() => TransportExecutionContract.transition(execution, 'TO_DROPOFF'))
      && rejects(() => TransportExecutionContract.transition(picked.execution, 'TO_PICKUP'))
      && rejects(() => TransportExecutionContract.transition(delivered.execution, 'TO_DROPOFF'));
  });

  check('cargo-cannot-be-double-bound', () => {
    const fixture = makeFixture();
    const pickup = new PickupExecutionService();
    pickup.pickup(fixture);
    return rejects(() => pickup.pickup(fixture)) && pickup.snapshot().length === 1;
  });

  check('cargo-cannot-be-double-delivered', () => {
    const { job, assignment, resource, execution } = makeFixture();
    const pickup = new PickupExecutionService();
    const delivery = new DeliveryExecutionService();
    const picked = pickup.pickup({ job, assignment, execution, resource });
    const toDropoff = delivery.beginDropoff({ job, assignment, execution: picked.execution, cargo: picked.cargo });
    delivery.deliver({ job, assignment, execution: toDropoff.execution, cargo: picked.cargo });
    return rejects(() => delivery.deliver({ job, assignment, execution: toDropoff.execution, cargo: picked.cargo }))
      && delivery.snapshot().length === 1;
  });

  check('pickup-and-delivery-stay-bound-to-exact-job-carrier-resource', () => {
    const { job, assignment, resource, execution } = makeFixture();
    const pickup = new PickupExecutionService();
    const delivery = new DeliveryExecutionService();
    const picked = pickup.pickup({ job, assignment, execution, resource });
    const wrongAssignment = { ...assignment, unitId: 'unit:00000002' };
    const wrongCargo = { ...picked.cargo, resourceId: 'resource:00000002' };
    return picked.cargo.jobId === job.id
      && picked.cargo.unitId === assignment.unitId
      && picked.cargo.resourceId === resource.id
      && picked.cargo.amount === job.amount
      && rejects(() => delivery.beginDropoff({ job, assignment: wrongAssignment, execution: picked.execution, cargo: picked.cargo }))
      && rejects(() => delivery.beginDropoff({ job, assignment, execution: picked.execution, cargo: wrongCargo }));
  });

  check('delivered-record-target-is-exact-job-target', () => {
    const { job, assignment, resource, execution } = makeFixture();
    const pickup = new PickupExecutionService();
    const delivery = new DeliveryExecutionService();
    const picked = pickup.pickup({ job, assignment, execution, resource });
    const toDropoff = delivery.beginDropoff({ job, assignment, execution: picked.execution, cargo: picked.cargo });
    const result = delivery.deliver({ job, assignment, execution: toDropoff.execution, cargo: picked.cargo });
    return result.delivery.targetId === job.targetId
      && result.delivery.jobId === job.id
      && result.delivery.unitId === assignment.unitId
      && result.delivery.resourceId === resource.id;
  });

  check('delivery-does-not-consume-or-mutate-reserved-resource', () => {
    const { job, assignment, resource, execution } = makeFixture();
    const before = JSON.stringify(resource);
    const pickup = new PickupExecutionService();
    const delivery = new DeliveryExecutionService();
    const picked = pickup.pickup({ job, assignment, execution, resource });
    const toDropoff = delivery.beginDropoff({ job, assignment, execution: picked.execution, cargo: picked.cargo });
    delivery.deliver({ job, assignment, execution: toDropoff.execution, cargo: picked.cargo });
    return JSON.stringify(resource) === before && resource.state === 'RESERVED';
  });

  check('scope-gate-zero-pathfinding-routing-or-movement', () => {
    const { job, assignment, resource, execution } = makeFixture();
    const pickup = new PickupExecutionService();
    const delivery = new DeliveryExecutionService();
    const picked = pickup.pickup({ job, assignment, execution, resource });
    const toDropoff = delivery.beginDropoff({ job, assignment, execution: picked.execution, cargo: picked.cargo });
    const delivered = delivery.deliver({ job, assignment, execution: toDropoff.execution, cargo: picked.cargo });
    return !forbiddenStatePresent(execution)
      && !forbiddenStatePresent(picked)
      && !forbiddenStatePresent(toDropoff)
      && !forbiddenStatePresent(delivered)
      && !forbiddenStatePresent(pickup.snapshot())
      && !forbiddenStatePresent(delivery.snapshot());
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results: Object.freeze(results.map(Object.freeze))
  });
}
