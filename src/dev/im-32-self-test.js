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
import { ActiveRuntimeProductionSupplyOrchestration as IM32Runtime } from '../runtime/active-runtime-production-supply-orchestration.js';
import { SourceBoundOutputHqIntake as IM32 } from '../domain/source-bound-output-hq-intake.js';

function check(results, name, fn) {
  try { fn(); results.push(Object.freeze({ name, pass: true })); }
  catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error.message) })); }
}

function stockKey(value) {
  return `${value.buildingId}|${value.resourceTypeId}`;
}

function replaceStock(stocks, next) {
  return Object.freeze([...stocks.filter(value => stockKey(value) !== stockKey(next)), next].sort((a, b) => stockKey(a).localeCompare(stockKey(b))));
}

function hqId(domains) {
  return domains.buildings.ids().map(id => domains.buildings.get(id)).find(value => value.identity?.definitionId === 'HQ')?.id;
}

function fixture({ amount = 3, claimAmount = 2 } = {}) {
  let composition = createBaselineMiniworldScenario({ includeSaveContinuity: true, includeProductionSupply: true });
  const a = composition.authoritative;
  const hq = hqId(a.domains);
  const recipe = a.productionRecipes[0];
  const producer = recipe.buildingId;
  const type = recipe.outputs[0].resourceTypeId;
  const receipt = {
    kind: 'production-effect-receipt',
    settlementId: 'production-settlement:im32:1',
    buildingId: producer,
    inputs: [],
    outputs: [{ resourceTypeId: type, amount }],
    stockBefore: [{ resourceTypeId: type, quantity: 0 }],
    stockAfter: [{ resourceTypeId: type, quantity: amount }],
  };
  const producerStock = { kind: 'building-stock', buildingId: producer, resourceTypeId: type, quantity: amount };
  const stocks = replaceStock(a.buildingStocks, producerStock);
  const materialized = IM27.materialize({
    receipt,
    settledIds: [receipt.settlementId],
    buildingStocks: stocks,
    resourceState: a.resourceState,
    claims: a.resourceClaims,
  });
  const resource = materialized.resources[0];
  const demand = a.resourceDemands.create({
    consumerId: hq,
    definitionId: type,
    amount: claimAmount,
    metadata: { source: 'IM-32_HQ_INTAKE', hqBuildingId: hq, sourceBuildingId: producer },
  }, { id: 'demand:00000932' });
  const matching = new ResourceMatching({ resourceState: a.resourceState, claims: a.resourceClaims, demands: a.resourceDemands });
  const assignment = new ResourceAssignment({ resourceState: a.resourceState, claims: a.resourceClaims, demands: a.resourceDemands }).assignMatch(matching.matchDemand(demand.id));
  const job = new TransportJobService({
    jobStore: a.domains.jobs,
    claims: a.resourceClaims,
    demands: a.resourceDemands,
    resourceState: a.resourceState,
  }).createFromAssignment(assignment).jobs[0];
  const reservation = BuildingStockTransportReservationContract.define({
    id: 'transport-reservation:00000932',
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
  const workforceState = { kind: 'workforce-assignment-state', personId: execution.unitId, availability: 'ASSIGNED', assignmentId: 'assignment:00000932' };
  const dispatch = {
    kind: 'workforce-aware-transport-dispatch',
    reservation,
    job,
    workforce: { personId: execution.unitId, assignedState: workforceState },
    executionAssignment: { jobId: job.id, unitId: execution.unitId },
    compatibilityRefs: { assignmentId: workforceState.assignmentId },
  };
  composition = Object.freeze({ ...composition, authoritative: Object.freeze({
    ...a,
    buildingStocks: stocks,
    buildingStockTransportReservations: Object.freeze([reservation]),
    workforceAssignments: Object.freeze([...a.workforceAssignments, workforceState]),
  }) });
  const publish = next => { composition = next; };
  return {
    hq,
    producer,
    type,
    resource,
    delivery,
    deliveryCommit,
    dispatch,
    reservation,
    workforceState,
    runtime: new IM32Runtime({ getComposition: () => composition, publishComposition: publish }),
    get composition() { return composition; },
  };
}

export function runIM32SelfTest() {
  const results = [];
  check(results, 'source-bound-produced-output-credits-hq-only-after-delivery', () => {
    const f = fixture();
    assert.equal(f.composition.authoritative.buildingStocks.find(s => s.buildingId === f.hq && s.resourceTypeId === f.type), undefined);
    const result = f.runtime.publishSourceBoundOutputToHq({
      dispatch: f.dispatch,
      delivery: f.delivery,
      deliveryCommit: f.deliveryCommit,
      reservationId: f.reservation.id,
      workforceState: f.workforceState,
      hqBuildingId: f.hq,
    });
    assert.equal(result.status, 'INTAKEN');
    assert.equal(f.composition.authoritative.buildingStocks.find(s => s.buildingId === f.producer && s.resourceTypeId === f.type).quantity, 1);
    assert.equal(f.composition.authoritative.buildingStocks.find(s => s.buildingId === f.hq && s.resourceTypeId === f.type).quantity, 2);
    assert.equal(f.composition.authoritative.buildingStockTransportReservations[0].state, 'RELEASED');
  });
  check(results, 'repeated-hq-intake-is-idempotent-and-does-not-credit-twice', () => {
    const f = fixture();
    const args = { dispatch: f.dispatch, delivery: f.delivery, deliveryCommit: f.deliveryCommit, reservationId: f.reservation.id, workforceState: f.workforceState, hqBuildingId: f.hq };
    f.runtime.publishSourceBoundOutputToHq(args);
    const before = JSON.stringify(f.composition.authoritative.buildingStocks);
    const again = f.runtime.publishSourceBoundOutputToHq(args);
    assert.equal(again.status, 'ALREADY_INTAKEN');
    assert.equal(JSON.stringify(f.composition.authoritative.buildingStocks), before);
  });
  check(results, 'matching-reservation-or-job-does-not-credit-hq-without-delivery-commit', () => {
    const f = fixture();
    assert.throws(() => f.runtime.publishSourceBoundOutputToHq({
      dispatch: f.dispatch,
      delivery: f.delivery,
      deliveryCommit: null,
      reservationId: f.reservation.id,
      workforceState: f.workforceState,
      hqBuildingId: f.hq,
    }));
    assert.equal(f.composition.authoritative.buildingStocks.find(s => s.buildingId === f.hq && s.resourceTypeId === f.type), undefined);
  });
  check(results, 'wrong-target-and-non-hq-intake-fail-closed', () => {
    const f = fixture();
    assert.throws(() => f.runtime.publishSourceBoundOutputToHq({
      dispatch: f.dispatch,
      delivery: f.delivery,
      deliveryCommit: f.deliveryCommit,
      reservationId: f.reservation.id,
      workforceState: f.workforceState,
      hqBuildingId: f.producer,
    }));
  });
  check(results, 'wrong-source-produced-resource-is-rejected', () => {
    const f = fixture();
    f.composition.authoritative.resourceState.relocate(f.resource.id, f.resource.location, f.hq);
    assert.throws(() => f.runtime.publishSourceBoundOutputToHq({
      dispatch: f.dispatch,
      delivery: f.delivery,
      deliveryCommit: f.deliveryCommit,
      reservationId: f.reservation.id,
      workforceState: f.workforceState,
      hqBuildingId: f.hq,
    }));
  });
  check(results, 'im32-domain-owns-no-matching-assignment-transport-production-or-save-authority', () => {
    assert.equal(typeof IM32.matchDemand, 'undefined');
    assert.equal(typeof IM32.assignMatch, 'undefined');
    assert.equal(typeof IM32.createFromAssignment, 'undefined');
    assert.equal(typeof IM32.materialize, 'undefined');
    assert.equal(typeof IM32.restore, 'undefined');
  });
  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ status: blockerCount ? 'FAIL' : 'PASS', blockerCount, results: Object.freeze(results) });
}
