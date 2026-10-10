import assert from 'node:assert/strict';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { ProductionOutputResourceAvailabilityIntegration as IM27 } from '../domain/production-output-resource-availability-integration.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobService } from '../transport/transport-job-service.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { BuildingStockTransportReservationService } from '../domain/building-stock-transport-reservation-service.js';
import { DeliverySettlementContract } from '../transport/delivery-settlement-contract.js';
import { DeliverySettlementService } from '../transport/delivery-settlement-service.js';
import { ActiveRuntimeProductionSupplyOrchestration as RuntimeSupply } from '../runtime/active-runtime-production-supply-orchestration.js';

function check(results, name, fn) {
  try { fn(); results.push(Object.freeze({ name, pass: true })); }
  catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error.message) })); }
}

function stockKey(value) { return `${value.buildingId}|${value.resourceTypeId}`; }

function replaceStock(stocks, next) {
  return Object.freeze([...stocks.filter(value => stockKey(value) !== stockKey(next)), next].sort((a, b) => stockKey(a).localeCompare(stockKey(b))));
}

function hqId(domains) {
  return domains.buildings.ids().map(id => domains.buildings.get(id)).find(value => value.identity?.definitionId === 'HQ')?.id;
}

function fixture({ outputAmount = 2, hqClaimAmount = 2, inputDemandAmount = 2, includeInputDemand = true } = {}) {
  let composition = createBaselineMiniworldScenario({ includeSaveContinuity: true, includeProductionSupply: true });
  const a = composition.authoritative;
  const hq = hqId(a.domains);
  const recipe = a.productionRecipes[0];
  const producer = recipe.buildingId;
  const type = recipe.outputs[0].resourceTypeId;
  const receipt = {
    kind: 'production-effect-receipt',
    settlementId: 'production-settlement:im34:1',
    buildingId: producer,
    inputs: [],
    outputs: [{ resourceTypeId: type, amount: outputAmount }],
    stockBefore: [{ resourceTypeId: type, quantity: 0 }],
    stockAfter: [{ resourceTypeId: type, quantity: outputAmount }],
  };
  const producerStock = { kind: 'building-stock', buildingId: producer, resourceTypeId: type, quantity: outputAmount };
  const stocks = replaceStock(a.buildingStocks, producerStock);
  const materialized = IM27.materialize({
    receipt,
    settledIds: [receipt.settlementId],
    buildingStocks: stocks,
    resourceState: a.resourceState,
    claims: a.resourceClaims,
  });
  const resource = materialized.resources[0];
  const hqDemand = a.resourceDemands.create({
    consumerId: hq,
    definitionId: type,
    amount: hqClaimAmount,
    metadata: { source: 'IM-32_HQ_INTAKE', hqBuildingId: hq, sourceBuildingId: producer },
  }, { id: 'demand:00000934' });
  const matching = new ResourceMatching({ resourceState: a.resourceState, claims: a.resourceClaims, demands: a.resourceDemands });
  const assignment = new ResourceAssignment({ resourceState: a.resourceState, claims: a.resourceClaims, demands: a.resourceDemands }).assignMatch(matching.matchDemand(hqDemand.id));
  const job = new TransportJobService({
    jobStore: a.domains.jobs,
    claims: a.resourceClaims,
    demands: a.resourceDemands,
    resourceState: a.resourceState,
  }).createFromAssignment(assignment).jobs[0];
  const reservation = BuildingStockTransportReservationContract.define({
    id: 'transport-reservation:00000934',
    sourceBuildingId: producer,
    targetBuildingId: hq,
    resourceTypeId: type,
    amount: job.amount,
    state: 'ACTIVE',
  });
  BuildingStockTransportReservationService.reserve({ stock: producerStock, reservations: [], reservation });
  const execution = { kind: 'transport-execution', jobId: job.id, unitId: 'unit:00000002', state: 'DELIVERED' };
  const delivery = { kind: 'delivered-cargo', jobId: job.id, unitId: execution.unitId, resourceId: job.resourceId, targetId: hq, amount: job.amount };
  const claim = a.resourceClaims.get(job.claimId);
  const settlement = DeliverySettlementContract.fromDelivered({ job, execution, delivery, claim, demand: a.resourceDemands.get(job.demandId), resource: a.resourceState.get(job.resourceId) });
  const deliveryCommit = new DeliverySettlementService({ resources: a.resourceState, claims: a.resourceClaims, demands: a.resourceDemands }).commit({ settlement, job, execution, delivery });
  const workforceState = { kind: 'workforce-assignment-state', personId: execution.unitId, availability: 'ASSIGNED', assignmentId: 'assignment:00000934' };
  const dispatch = {
    kind: 'workforce-aware-transport-dispatch',
    reservation,
    job,
    workforce: { personId: execution.unitId, assignedState: workforceState },
    executionAssignment: { jobId: job.id, unitId: execution.unitId },
    compatibilityRefs: { assignmentId: workforceState.assignmentId },
  };
  const inputDemand = includeInputDemand ? a.resourceDemands.create({
    consumerId: producer,
    definitionId: type,
    amount: inputDemandAmount,
    metadata: { source: 'IM-23_PRODUCTION_INPUT', buildingId: producer, resourceTypeId: type },
  }, { id: 'demand:00000935' }) : null;
  composition = Object.freeze({ ...composition, authoritative: Object.freeze({
    ...a,
    buildingStocks: stocks,
    buildingStockTransportReservations: Object.freeze([reservation]),
    workforceAssignments: Object.freeze([...a.workforceAssignments, workforceState]),
  }) });
  const runtime = new RuntimeSupply({ getComposition: () => composition, publishComposition: value => { composition = value; } });
  return { hq, producer, type, resource, delivery, deliveryCommit, dispatch, reservation, workforceState, inputDemand, runtime, get composition() { return composition; } };
}

function publishArgs(f, overrides = {}) {
  return {
    dispatch: f.dispatch,
    delivery: f.delivery,
    deliveryCommit: f.deliveryCommit,
    reservationId: f.reservation.id,
    workforceState: f.workforceState,
    hqBuildingId: f.hq,
    reconnectionResourceId: 'resource:00000934',
    reconnectionReservationIds: ['transport-reservation:00000935'],
    ...overrides,
  };
}

export function runIM34SelfTest() {
  const results = [];
  check(results, 'successful-hq-intake-automatically-reconnects-open-production-input-demand', () => {
    const f = fixture();
    const result = f.runtime.publishSourceBoundOutputToHq(publishArgs(f));
    const owners = f.composition.authoritative;
    const demand = owners.resourceDemands.get(f.inputDemand.id);
    const hqResource = owners.resourceState.get('resource:00000934');
    const reservations = owners.buildingStockTransportReservations;
    assert.equal(result.status, 'INTAKEN');
    assert.equal(result.reconnection.status, 'RECONNECTED');
    assert.equal(result.reconnection.materialization.status, 'MATERIALIZED');
    assert.equal(hqResource.ownerId, f.hq);
    assert.equal(hqResource.definitionId, f.type);
    assert.equal(demand.status, 'RESERVED');
    assert.equal(reservations.some(value => value.sourceBuildingId === f.hq && value.targetBuildingId === f.producer && value.state === 'ACTIVE'), true);
  });
  check(results, 'already-intaken-idempotency-does-not-repeat-reconnection', () => {
    const f = fixture();
    f.runtime.publishSourceBoundOutputToHq(publishArgs(f));
    const before = JSON.stringify({
      resources: f.composition.authoritative.resourceState.snapshot(),
      claims: f.composition.authoritative.resourceClaims.snapshot(),
      demands: f.composition.authoritative.resourceDemands.snapshot(),
      jobs: f.composition.authoritative.domains.jobs.snapshot(),
      reservations: f.composition.authoritative.buildingStockTransportReservations,
    });
    const again = f.runtime.publishSourceBoundOutputToHq(publishArgs(f, { reconnectionReservationIds: [] }));
    assert.equal(again.status, 'ALREADY_INTAKEN');
    assert.equal(again.reconnection, null);
    assert.equal(JSON.stringify({
      resources: f.composition.authoritative.resourceState.snapshot(),
      claims: f.composition.authoritative.resourceClaims.snapshot(),
      demands: f.composition.authoritative.resourceDemands.snapshot(),
      jobs: f.composition.authoritative.domains.jobs.snapshot(),
      reservations: f.composition.authoritative.buildingStockTransportReservations,
    }), before);
  });
  check(results, 'failed-hq-intake-does-not-trigger-reconnection', () => {
    const f = fixture();
    assert.throws(() => f.runtime.publishSourceBoundOutputToHq(publishArgs(f, { deliveryCommit: null })));
    const owners = f.composition.authoritative;
    assert.equal(owners.resourceState.ids().some(id => owners.resourceState.get(id)?.metadata?.source === 'IM-33_HQ_STOCK_RECONNECTION'), false);
    assert.equal(owners.buildingStockTransportReservations.length, 1);
  });
  check(results, 'missing-open-production-input-demand-is-safe-and-non-blocking', () => {
    const f = fixture({ includeInputDemand: false });
    const result = f.runtime.publishSourceBoundOutputToHq(publishArgs(f, { reconnectionReservationIds: [] }));
    const owners = f.composition.authoritative;
    assert.equal(result.status, 'INTAKEN');
    assert.equal(result.reconnection.status, 'RECONNECTED');
    assert.equal(result.reconnection.connections.length, 0);
    assert.equal(owners.resourceDemands.ids().filter(id => owners.resourceDemands.get(id)?.metadata?.source === 'IM-23_PRODUCTION_INPUT').length, 0);
    assert.equal(owners.buildingStockTransportReservations.length, 1);
  });
  check(results, 'partial-hq-availability-connects-only-real-accepted-amount', () => {
    const f = fixture({ outputAmount: 1, hqClaimAmount: 1, inputDemandAmount: 2 });
    const result = f.runtime.publishSourceBoundOutputToHq(publishArgs(f));
    const demand = f.composition.authoritative.resourceDemands.get(f.inputDemand.id);
    assert.equal(result.reconnection.connections[0].status, 'DISPATCHED_TO_EXISTING_LOGISTICS');
    assert.equal(demand.status, 'PARTIAL');
    assert.equal(demand.reservedAmount, 1);
    assert.equal(demand.remainingAmount, 1);
  });
  check(results, 'im34-adds-no-production-settlement-save-or-routing-authority', () => {
    const prototype = RuntimeSupply.prototype;
    assert.equal(typeof prototype.save, 'undefined');
    assert.equal(typeof prototype.restore, 'undefined');
    assert.equal(typeof prototype.route, 'undefined');
    assert.equal(typeof prototype.settleProduction, 'undefined');
  });
  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ status: blockerCount ? 'FAIL' : 'PASS', blockerCount, results: Object.freeze(results) });
}
