import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { ActiveRuntimeProductionSupplyOrchestration as RuntimeSupply } from '../runtime/active-runtime-production-supply-orchestration.js';
import { ProductionInputDemandReconnectionIntegration as IM33 } from '../domain/production-input-demand-reconnection-integration.js';

function check(results, name, fn) {
  try { fn(); results.push(Object.freeze({ name, pass: true })); }
  catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error.message) })); }
}

function building(domains, definitionId, id) {
  return domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId: id, definitionId }),
    position: { x: 0, y: 0 },
  }, { id });
}

function fixture({ hqQuantity = 2, demandAmount = 2 } = {}) {
  const world = new WorldStore();
  const domains = new CoreDomainStores();
  const hq = building(domains, 'HQ', 'building:00000001');
  const producer = building(domains, 'WOODCUTTER', 'building:00000002');
  const resourceState = new ResourceState({ world, resourceStore: domains.resources, referenceStores: [domains.buildings] });
  const claims = new ResourceClaims({ resourceState });
  const demands = new ResourceDemands({ resourceState, claims });
  const boards = resourceState.createDefinition({ technicalName: 'boards', label: 'Boards' }, { id: 'resource-type:00000002' });
  const demand = demands.create({
    consumerId: producer.id,
    definitionId: boards.id,
    amount: demandAmount,
    metadata: { source: 'IM-23_PRODUCTION_INPUT', buildingId: producer.id, resourceTypeId: boards.id },
  }, { id: 'demand:00000933' });
  let composition = Object.freeze({ kind: 'active-runtime-composition', authoritative: Object.freeze({
    domains,
    resourceState,
    resourceClaims: claims,
    resourceDemands: demands,
    buildingStocks: Object.freeze([
      BuildingStockContract.define({ buildingId: hq.id, resourceTypeId: boards.id, quantity: hqQuantity }),
      BuildingStockContract.define({ buildingId: producer.id, resourceTypeId: boards.id, quantity: 0 }),
    ]),
    buildingStockTransportReservations: Object.freeze([]),
    workforceAssignments: Object.freeze([]),
  }) });
  const runtime = new RuntimeSupply({ getComposition: () => composition, publishComposition: value => { composition = value; } });
  return { hq, producer, boards, demand, runtime, get composition() { return composition; } };
}

export function runIM33SelfTest() {
  const results = [];
  check(results, 'hq-stock-representation-makes-open-im23-demand-matchable', () => {
    const f = fixture();
    const result = f.runtime.reconnectHqIntakeToProductionInputs({
      hqBuildingId: f.hq.id,
      resourceTypeId: f.boards.id,
      resourceId: 'resource:00000933',
      reservationIds: ['transport-reservation:00000933'],
    });
    const owners = f.composition.authoritative;
    const resource = owners.resourceState.get('resource:00000933');
    const demand = owners.resourceDemands.get(f.demand.id);
    const job = owners.domains.jobs.ids().map(id => owners.domains.jobs.get(id))[0];
    const reservation = owners.buildingStockTransportReservations[0];
    assert.equal(result.status, 'RECONNECTED');
    assert.equal(result.materialization.status, 'MATERIALIZED');
    assert.equal(resource.ownerId, f.hq.id);
    assert.equal(resource.metadata.source, 'IM-33_HQ_STOCK_RECONNECTION');
    assert.equal(demand.status, 'RESERVED');
    assert.equal(job.targetId, f.producer.id);
    assert.equal(reservation.sourceBuildingId, f.hq.id);
    assert.equal(reservation.targetBuildingId, f.producer.id);
  });
  check(results, 'repeated-reconnect-reuses-bound-supply-without-duplicate-job-or-reservation', () => {
    const f = fixture();
    const args = { hqBuildingId: f.hq.id, resourceTypeId: f.boards.id, resourceId: 'resource:00000933', reservationIds: ['transport-reservation:00000933'] };
    f.runtime.reconnectHqIntakeToProductionInputs(args);
    const before = JSON.stringify({
      resources: f.composition.authoritative.resourceState.snapshot(),
      claims: f.composition.authoritative.resourceClaims.snapshot(),
      demands: f.composition.authoritative.resourceDemands.snapshot(),
      jobs: f.composition.authoritative.domains.jobs.snapshot(),
      reservations: f.composition.authoritative.buildingStockTransportReservations,
    });
    const again = f.runtime.reconnectHqIntakeToProductionInputs({ hqBuildingId: f.hq.id, resourceTypeId: f.boards.id, reservationIds: [] });
    assert.equal(again.connections.length, 0);
    assert.equal(JSON.stringify({
      resources: f.composition.authoritative.resourceState.snapshot(),
      claims: f.composition.authoritative.resourceClaims.snapshot(),
      demands: f.composition.authoritative.resourceDemands.snapshot(),
      jobs: f.composition.authoritative.domains.jobs.snapshot(),
      reservations: f.composition.authoritative.buildingStockTransportReservations,
    }), before);
  });
  check(results, 'partial-hq-stock-reconnects-only-real-available-amount', () => {
    const f = fixture({ hqQuantity: 1, demandAmount: 2 });
    const result = f.runtime.reconnectHqIntakeToProductionInputs({
      hqBuildingId: f.hq.id,
      resourceTypeId: f.boards.id,
      resourceId: 'resource:00000933',
      reservationIds: ['transport-reservation:00000933'],
    });
    const demand = f.composition.authoritative.resourceDemands.get(f.demand.id);
    assert.equal(result.connections[0].status, 'DISPATCHED_TO_EXISTING_LOGISTICS');
    assert.equal(demand.status, 'PARTIAL');
    assert.equal(demand.reservedAmount, 1);
    assert.equal(demand.remainingAmount, 1);
  });
  check(results, 'no-hq-stock-does-not-create-resource-claim-job-or-reservation', () => {
    const f = fixture({ hqQuantity: 0 });
    const result = f.runtime.reconnectHqIntakeToProductionInputs({
      hqBuildingId: f.hq.id,
      resourceTypeId: f.boards.id,
      resourceId: 'resource:00000933',
      reservationIds: [],
    });
    const owners = f.composition.authoritative;
    assert.equal(result.status, 'NO_HQ_STOCK');
    assert.equal(owners.resourceState.ids().length, 0);
    assert.equal(owners.resourceClaims.ids().length, 0);
    assert.equal(owners.domains.jobs.size, 0);
    assert.equal(owners.buildingStockTransportReservations.length, 0);
  });
  check(results, 'consumed-claim-reconciliation-preserves-remaining-physical-hq-availability', () => {
    const f = fixture({ hqQuantity: 2, demandAmount: 2 });
    f.runtime.reconnectHqIntakeToProductionInputs({ hqBuildingId: f.hq.id, resourceTypeId: f.boards.id, resourceId: 'resource:00000933', reservationIds: ['transport-reservation:00000933'] });
    const claimId = f.composition.authoritative.resourceClaims.ids()[0];
    f.composition.authoritative.resourceDemands.consumeClaim(claimId);
    const owners = f.composition.authoritative;
    const reconnected = IM33.materializeHqStock({
      domains: owners.domains,
      resourceState: owners.resourceState,
      claims: owners.resourceClaims,
      buildingStocks: Object.freeze([BuildingStockContract.define({ buildingId: f.hq.id, resourceTypeId: f.boards.id, quantity: 0 })]),
      hqBuildingId: f.hq.id,
      resourceTypeId: f.boards.id,
    });
    assert.equal(reconnected.resource.amount, 2);
    assert.equal(owners.resourceClaims.availableAmount('resource:00000933'), 0);
  });
  check(results, 'wrong-target-non-hq-is-rejected', () => {
    const f = fixture();
    assert.throws(() => f.runtime.reconnectHqIntakeToProductionInputs({
      hqBuildingId: f.producer.id,
      resourceTypeId: f.boards.id,
      resourceId: 'resource:00000933',
      reservationIds: [],
    }));
  });
  check(results, 'im33-owns-no-production-transport-settlement-demand-creation-or-save-authority', () => {
    assert.equal(typeof IM33.produce, 'undefined');
    assert.equal(typeof IM33.dispatch, 'undefined');
    assert.equal(typeof IM33.settle, 'undefined');
    assert.equal(typeof IM33.createDemand, 'undefined');
    assert.equal(typeof IM33.save, 'undefined');
    assert.equal(typeof IM33.restore, 'undefined');
  });
  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ status: blockerCount ? 'FAIL' : 'PASS', blockerCount, results: Object.freeze(results) });
}
