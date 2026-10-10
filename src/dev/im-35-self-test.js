import assert from 'node:assert/strict';
import { Runtime } from '../runtime/runtime.js';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { ProductionOutputResourceAvailabilityIntegration as IM27 } from '../domain/production-output-resource-availability-integration.js';
import { TransportJobService } from '../transport/transport-job-service.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { BuildingStockTransportReservationService } from '../domain/building-stock-transport-reservation-service.js';
import { DeliverySettlementContract } from '../transport/delivery-settlement-contract.js';
import { DeliverySettlementService } from '../transport/delivery-settlement-service.js';
import { ActiveRuntimeProductionSupplyOrchestration as RuntimeSupply } from '../runtime/active-runtime-production-supply-orchestration.js';
import { ActiveRuntimeProductionCycleTimeProgression } from '../runtime/active-runtime-production-cycle-time-progression.js';
import { ActiveRuntimeProductionCycleExecutionOrchestration } from '../runtime/active-runtime-production-cycle-execution-orchestration.js';
import { ActiveRuntimeProductionReEvaluationOrchestration as IM29 } from '../runtime/active-runtime-production-re-evaluation-orchestration.js';

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
function runtimeConfig() {
  return { simulation: { phases: ['input','world','demand','assignment','intent','movement','work','economy','recovery','events','maintenance'], fixedStepMs: 100 } };
}

function fixture({ returnAmount = 3, inputDemandAmount = 3, includeRecipe = true, includeWorkforce = true } = {}) {
  let composition = createBaselineMiniworldScenario({ includeSaveContinuity: true, includeProductionSupply: true });
  const a = composition.authoritative;
  const hq = hqId(a.domains);
  const recipe = a.productionRecipes[0];
  const producer = recipe.buildingId;
  const type = recipe.inputs[0].resourceTypeId;
  const receipt = Object.freeze({
    kind: 'production-effect-receipt',
    settlementId: 'production-settlement:im35:1',
    buildingId: producer,
    inputs: [],
    outputs: Object.freeze([{ resourceTypeId: type, amount: returnAmount }]),
    stockBefore: Object.freeze([{ resourceTypeId: type, quantity: 0 }]),
    stockAfter: Object.freeze([{ resourceTypeId: type, quantity: returnAmount }]),
  });
  const producerStock = { kind: 'building-stock', buildingId: producer, resourceTypeId: type, quantity: returnAmount };
  const stocks = replaceStock(a.buildingStocks, producerStock);
  const produced = IM27.materialize({ receipt, settledIds: [receipt.settlementId], buildingStocks: stocks, resourceState: a.resourceState, claims: a.resourceClaims }).resources[0];
  const hqDemand = a.resourceDemands.create({
    consumerId: hq,
    definitionId: type,
    amount: returnAmount,
    metadata: { source: 'IM-32_HQ_INTAKE', hqBuildingId: hq, sourceBuildingId: producer },
  }, { id: 'demand:00000935' });
  const hqClaim = a.resourceDemands.reserve({
    demandId: hqDemand.id,
    resourceId: produced.id,
    amount: returnAmount,
    metadata: { source: 'IM-35_SOURCE_BOUND_HQ_INTAKE_FIXTURE' },
  });
  const job = new TransportJobService({ jobStore: a.domains.jobs, claims: a.resourceClaims, demands: a.resourceDemands, resourceState: a.resourceState }).createFromClaimIds([hqClaim.id]).jobs[0];
  const hqReservation = BuildingStockTransportReservationContract.define({
    id: 'transport-reservation:00000935',
    sourceBuildingId: producer,
    targetBuildingId: hq,
    resourceTypeId: type,
    amount: job.amount,
    state: 'ACTIVE',
  });
  BuildingStockTransportReservationService.reserve({ stock: producerStock, reservations: [], reservation: hqReservation });
  const hqExecution = { kind: 'transport-execution', jobId: job.id, unitId: 'unit:00000002', state: 'DELIVERED' };
  const hqDelivery = { kind: 'delivered-cargo', jobId: job.id, unitId: hqExecution.unitId, resourceId: job.resourceId, targetId: hq, amount: job.amount };
  const hqSettlement = DeliverySettlementContract.fromDelivered({ job, execution: hqExecution, delivery: hqDelivery, claim: a.resourceClaims.get(job.claimId), demand: a.resourceDemands.get(job.demandId), resource: a.resourceState.get(job.resourceId) });
  const hqDeliveryCommit = new DeliverySettlementService({ resources: a.resourceState, claims: a.resourceClaims, demands: a.resourceDemands }).commit({ settlement: hqSettlement, job, execution: hqExecution, delivery: hqDelivery });
  const hqWorkforceState = { kind: 'workforce-assignment-state', personId: hqExecution.unitId, availability: 'ASSIGNED', assignmentId: 'assignment:00000935' };
  const hqDispatch = {
    kind: 'workforce-aware-transport-dispatch',
    reservation: hqReservation,
    job,
    workforce: { personId: hqExecution.unitId, assignedState: hqWorkforceState },
    executionAssignment: { jobId: job.id, unitId: hqExecution.unitId },
    compatibilityRefs: { assignmentId: hqWorkforceState.assignmentId },
  };
  const inputDemand = a.resourceDemands.create({
    consumerId: producer,
    definitionId: type,
    amount: inputDemandAmount,
    metadata: { source: 'IM-23_PRODUCTION_INPUT', buildingId: producer, resourceTypeId: type },
  }, { id: 'demand:00000936' });
  composition = Object.freeze({ ...composition, authoritative: Object.freeze({
    ...a,
    buildingStocks: stocks,
    buildingStockTransportReservations: Object.freeze([hqReservation]),
    workforceAssignments: Object.freeze([...a.workforceAssignments, hqWorkforceState]),
    productionRecipes: includeRecipe ? a.productionRecipes : Object.freeze([]),
    workforceBindings: includeWorkforce ? a.workforceBindings : Object.freeze([]),
  }) });
  const supply = new RuntimeSupply({ getComposition: () => composition, publishComposition: value => { composition = value; } });
  const intake = supply.publishSourceBoundOutputToHq({
    dispatch: hqDispatch,
    delivery: hqDelivery,
    deliveryCommit: hqDeliveryCommit,
    reservationId: hqReservation.id,
    workforceState: hqWorkforceState,
    hqBuildingId: hq,
    reconnectionResourceId: 'resource:00000935',
    reconnectionReservationIds: ['transport-reservation:00000936'],
  });
  return { hq, producer, type, recipe, inputDemand, intake, supply, get composition() { return composition; }, set composition(value) { composition = value; } };
}

function publishReturnDelivery(f) {
  const connection = f.intake.reconnection.connections[0];
  const job = connection.transportJobs.jobs[0];
  const reservation = connection.reservations[0];
  const execution = { kind: 'transport-execution', jobId: job.id, unitId: 'unit:00000003', state: 'DELIVERED' };
  const delivery = { kind: 'delivered-cargo', jobId: job.id, unitId: execution.unitId, resourceId: job.resourceId, targetId: f.producer, amount: job.amount };
  const owners = f.composition.authoritative;
  const settlement = DeliverySettlementContract.fromDelivered({
    job,
    execution,
    delivery,
    claim: owners.resourceClaims.get(job.claimId),
    demand: owners.resourceDemands.get(job.demandId),
    resource: owners.resourceState.get(job.resourceId),
  });
  new DeliverySettlementService({ resources: owners.resourceState, claims: owners.resourceClaims, demands: owners.resourceDemands }).commit({ settlement, job, execution, delivery });
  const workforceState = { kind: 'workforce-assignment-state', personId: execution.unitId, availability: 'ASSIGNED', assignmentId: 'assignment:00000936' };
  const dispatch = {
    kind: 'workforce-aware-transport-dispatch',
    reservation,
    job,
    workforce: { personId: execution.unitId, assignedState: workforceState },
    executionAssignment: { jobId: job.id, unitId: execution.unitId },
    compatibilityRefs: { assignmentId: workforceState.assignmentId },
  };
  const current = f.composition.authoritative;
  const sourceStock = current.buildingStocks.find(value => value.buildingId === reservation.sourceBuildingId && value.resourceTypeId === reservation.resourceTypeId);
  const targetStock = current.buildingStocks.find(value => value.buildingId === reservation.targetBuildingId && value.resourceTypeId === reservation.resourceTypeId);
  return f.supply.publishDeliveredBuildingStock({ dispatch, delivery, reservation, workforceState, sourceStock, targetStock });
}

function evaluationFixture(f) {
  const runtime = new Runtime(runtimeConfig());
  runtime.boot();
  let composition = f.composition;
  const getComposition = () => composition;
  const publishComposition = value => { composition = value; };
  const progression = new ActiveRuntimeProductionCycleTimeProgression({ runtime, getComposition, publishComposition, publishSettledComposition: publishComposition });
  const cycleExecution = new ActiveRuntimeProductionCycleExecutionOrchestration({ runtime, getComposition, publishComposition, progression });
  const im29 = new IM29({ runtime, getComposition, cycleExecution, resolveProductionContext: (id, c) => progression.resolve(id, c) });
  return { runtime, im29, cycleExecution, get composition() { return composition; } };
}

export function runIM35SelfTest() {
  const results = [];
  check(results, 'im34-return-delivery-requests-im29-and-registers-one-ready-cycle', () => {
    const f = fixture();
    const publication = publishReturnDelivery(f);
    const e = evaluationFixture(f);
    const request = e.im29.requestProductionInputReturnDelivery({ publication });
    const flush = e.im29.flush();
    const handoff = flush.results[0].handoff;
    assert.equal(request.kind, 'im35-production-input-return-delivery-re-evaluation-request');
    assert.equal(request.status, 'PENDING');
    assert.equal(publication.settlement.targetStock.buildingId, f.producer);
    assert.equal(handoff.status, 'REGISTERED');
    assert.equal(e.runtime.scheduler.systemCount(), 1);
    assert.notEqual(e.cycleExecution.activeRegistration({ buildingId: f.producer, cycleId: handoff.cycleId }), null);
  });
  check(results, 'dispatch-and-reservation-alone-do-not-trigger-re-evaluation', () => {
    const f = fixture();
    const e = evaluationFixture(f);
    assert.equal(e.im29.pendingCount(), 0);
    assert.equal(e.runtime.scheduler.systemCount(), 0);
    assert.equal(f.intake.reconnection.connections[0].status, 'DISPATCHED_TO_EXISTING_LOGISTICS');
  });
  check(results, 'partial-insufficient-return-delivery-keeps-building-blocked', () => {
    const f = fixture({ returnAmount: 2, inputDemandAmount: 2 });
    const publication = publishReturnDelivery(f);
    const e = evaluationFixture(f);
    const request = e.im29.requestProductionInputReturnDelivery({ publication });
    const flush = e.im29.flush();
    assert.equal(request.status, 'PENDING');
    assert.equal(flush.results[0].handoff.status, 'NOT_REGISTERED');
    assert.equal(flush.results[0].handoff.reason, 'BLOCKED_INPUT');
    assert.equal(e.runtime.scheduler.systemCount(), 0);
  });
  check(results, 'duplicate-return-delivery-re-evaluation-does-not-create-parallel-registration', () => {
    const f = fixture();
    const publication = publishReturnDelivery(f);
    const e = evaluationFixture(f);
    e.im29.requestProductionInputReturnDelivery({ publication });
    const first = e.im29.flush().results[0].handoff;
    e.im29.requestProductionInputReturnDelivery({ publication });
    const second = e.im29.flush().results[0].handoff;
    assert.equal(first.status, 'REGISTERED');
    assert.equal(second.status, 'ALREADY_REGISTERED');
    assert.equal(second.duplicatePrevented, true);
    assert.equal(e.runtime.scheduler.systemCount(), 1);
  });
  check(results, 'missing-recipe-or-workforce-fails-closed', () => {
    const noRecipe = fixture({ includeRecipe: false });
    const recipePublication = publishReturnDelivery(noRecipe);
    const recipeEval = evaluationFixture(noRecipe);
    recipeEval.im29.requestProductionInputReturnDelivery({ publication: recipePublication });
    assert.equal(recipeEval.im29.flush().results[0].reason, 'RECIPE_MISSING');
    const noWorkforce = fixture({ includeWorkforce: false });
    const workforcePublication = publishReturnDelivery(noWorkforce);
    const workforceEval = evaluationFixture(noWorkforce);
    workforceEval.im29.requestProductionInputReturnDelivery({ publication: workforcePublication });
    assert.equal(workforceEval.im29.flush().results[0].status, 'NOT_EVALUATED');
  });
  check(results, 'non-delivered-publication-is-not-an-im35-trigger', () => {
    const e = evaluationFixture(fixture());
    const request = e.im29.requestProductionInputReturnDelivery({ publication: { kind: 'im24-delivered-supply-publication', status: 'PENDING' } });
    assert.equal(request.status, 'NOT_REQUESTED');
    assert.equal(e.im29.pendingCount(), 0);
  });
  check(results, 'im35-adds-no-settlement-save-routing-or-matching-authority', () => {
    assert.equal(typeof IM29.prototype.settleProduction, 'undefined');
    assert.equal(typeof IM29.prototype.save, 'undefined');
    assert.equal(typeof IM29.prototype.restore, 'undefined');
    assert.equal(typeof IM29.prototype.route, 'undefined');
    assert.equal(typeof IM29.prototype.match, 'undefined');
    assert.equal(typeof RuntimeSupply.prototype.settleProduction, 'undefined');
  });
  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ status: blockerCount ? 'FAIL' : 'PASS', blockerCount, results: Object.freeze(results) });
}
