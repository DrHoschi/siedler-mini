import assert from 'node:assert/strict';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { ActiveRuntimeProductionOutputAvailabilityOrchestration as OutputAvailability } from '../runtime/active-runtime-production-output-availability-orchestration.js';
import { ActiveRuntimeProductionSupplyOrchestration as RuntimeSupply } from '../runtime/active-runtime-production-supply-orchestration.js';
import { SettledOutputHqDeliveryDemandTrigger as IM36 } from '../domain/settled-output-hq-delivery-demand-trigger.js';

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

function fixture({ amount = 3 } = {}) {
  let composition = createBaselineMiniworldScenario({ includeSaveContinuity: true, includeProductionSupply: true });
  const a = composition.authoritative;
  const hq = hqId(a.domains);
  const recipe = a.productionRecipes[0];
  const producer = recipe.buildingId;
  const type = recipe.outputs[0].resourceTypeId;
  const receipt = Object.freeze({
    kind: 'production-effect-receipt',
    settlementId: 'production-settlement:im36:1',
    buildingId: producer,
    inputs: Object.freeze([]),
    outputs: Object.freeze([{ resourceTypeId: type, amount }]),
    stockBefore: Object.freeze([{ resourceTypeId: type, quantity: 0 }]),
    stockAfter: Object.freeze([{ resourceTypeId: type, quantity: amount }]),
  });
  const stock = { kind: 'building-stock', buildingId: producer, resourceTypeId: type, quantity: amount };
  composition = Object.freeze({ ...composition, authoritative: Object.freeze({
    ...a,
    buildingStocks: replaceStock(a.buildingStocks, stock),
    productionSettlementIds: Object.freeze([receipt.settlementId]),
    productionEffectReceipts: Object.freeze([receipt]),
  }) });
  const publish = value => { composition = value; };
  const output = new OutputAvailability({ getComposition: () => composition, publishComposition: publish });
  const supply = new RuntimeSupply({ getComposition: () => composition, publishComposition: publish });
  const publication = output.publishSettledComposition(composition);
  return { hq, producer, type, receipt, publication, supply, get composition() { return composition; } };
}

export function runIM36SelfTest() {
  const results = [];
  check(results, 'settled-output-materialization-triggers-one-source-bound-hq-delivery-demand', () => {
    const f = fixture();
    const result = f.supply.triggerSettledOutputHqDelivery({
      publication: f.publication,
      demandId: 'demand:00000936',
      reservationId: 'transport-reservation:00000936',
    });
    const owners = f.composition.authoritative;
    const resource = owners.resourceState.get(result.results[0].resourceId);
    const demand = owners.resourceDemands.get('demand:00000936');
    const job = owners.domains.jobs.ids().map(id => owners.domains.jobs.get(id)).find(value => value.demandId === demand.id);
    const reservation = owners.buildingStockTransportReservations.find(value => value.id === 'transport-reservation:00000936');
    assert.equal(result.status, 'TRIGGERED');
    assert.equal(result.results[0].status, 'TRIGGERED');
    assert.equal(resource.metadata.source, 'IM-27_PRODUCTION_OUTPUT');
    assert.equal(demand.consumerId, f.hq);
    assert.equal(demand.metadata.source, 'IM-36_SETTLED_OUTPUT_HQ_DELIVERY');
    assert.equal(demand.metadata.resourceId, resource.id);
    assert.equal(demand.status, 'RESERVED');
    assert.equal(job.resourceId, resource.id);
    assert.equal(job.targetId, f.hq);
    assert.equal(reservation.sourceBuildingId, f.producer);
    assert.equal(reservation.targetBuildingId, f.hq);
    assert.equal(reservation.amount, resource.amount);
  });
  check(results, 'trigger-does-not-credit-hq-before-existing-logistics-and-im32-intake', () => {
    const f = fixture();
    f.supply.triggerSettledOutputHqDelivery({ publication: f.publication, demandId: 'demand:00000936', reservationId: 'transport-reservation:00000936' });
    const hqStock = f.composition.authoritative.buildingStocks.find(value => value.buildingId === f.hq && value.resourceTypeId === f.type);
    assert.equal(hqStock, undefined);
  });
  check(results, 'duplicate-trigger-does-not-create-second-demand-job-or-reservation', () => {
    const f = fixture();
    const args = { publication: f.publication, demandId: 'demand:00000936', reservationId: 'transport-reservation:00000936' };
    f.supply.triggerSettledOutputHqDelivery(args);
    const before = JSON.stringify({
      demands: f.composition.authoritative.resourceDemands.snapshot(),
      claims: f.composition.authoritative.resourceClaims.snapshot(),
      jobs: f.composition.authoritative.domains.jobs.snapshot(),
      reservations: f.composition.authoritative.buildingStockTransportReservations,
    });
    const again = f.supply.triggerSettledOutputHqDelivery({ publication: f.publication });
    assert.equal(again.results[0].status, 'ALREADY_TRIGGERED');
    assert.equal(JSON.stringify({
      demands: f.composition.authoritative.resourceDemands.snapshot(),
      claims: f.composition.authoritative.resourceClaims.snapshot(),
      jobs: f.composition.authoritative.domains.jobs.snapshot(),
      reservations: f.composition.authoritative.buildingStockTransportReservations,
    }), before);
  });
  check(results, 'partial-available-output-reserves-only-real-available-amount', () => {
    const f = fixture({ amount: 3 });
    const resource = f.publication.materializations[0].resources[0];
    const otherDemand = f.composition.authoritative.resourceDemands.create({
      consumerId: f.hq,
      definitionId: f.type,
      amount: 2,
      metadata: { source: 'fixture-preclaim' },
    }, { id: 'demand:00000935' });
    f.composition.authoritative.resourceDemands.reserve({ demandId: otherDemand.id, resourceId: resource.id, amount: 2, metadata: { source: 'fixture-preclaim' } });
    const result = f.supply.triggerSettledOutputHqDelivery({ publication: f.publication, demandId: 'demand:00000936', reservationId: 'transport-reservation:00000936' });
    assert.equal(result.results[0].demand.targetAmount, 1);
    assert.equal(result.results[0].reservations[0].amount, 1);
  });
  check(results, 'wrong-target-missing-resource-and-consumed-output-fail-closed', () => {
    const wrongHq = fixture();
    const wrong = wrongHq.supply.triggerSettledOutputHqDelivery({
      publication: wrongHq.publication,
      hqBuildingId: wrongHq.producer,
      demandId: 'demand:00000936',
      reservationId: 'transport-reservation:00000936',
    });
    assert.equal(wrong.results[0].status, 'NO_VALID_HQ');
    const missing = wrongHq.supply.triggerSettledOutputHqDelivery({
      resource: { kind: 'resource', id: 'resource:99999999' },
      demandId: 'demand:00000937',
      reservationId: 'transport-reservation:00000937',
    });
    assert.equal(missing.results[0].status, 'NOT_TRIGGERED');
    const consumed = fixture();
    const resource = consumed.publication.materializations[0].resources[0];
    consumed.composition.authoritative.resourceState.setState(resource.id, 'CONSUMED');
    const consumedResult = consumed.supply.triggerSettledOutputHqDelivery({ publication: consumed.publication, demandId: 'demand:00000936', reservationId: 'transport-reservation:00000936' });
    assert.equal(consumedResult.results[0].reason, 'RESOURCE_CONSUMED');
  });
  check(results, 'im36-adds-no-settlement-materialization-routing-save-or-matching-authority', () => {
    assert.equal(typeof IM36.settleProduction, 'undefined');
    assert.equal(typeof IM36.materialize, 'undefined');
    assert.equal(typeof IM36.route, 'undefined');
    assert.equal(typeof IM36.save, 'undefined');
    assert.equal(typeof IM36.restore, 'undefined');
    assert.equal(typeof IM36.matchDemand, 'undefined');
  });
  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ status: blockerCount ? 'FAIL' : 'PASS', blockerCount, results: Object.freeze(results) });
}
