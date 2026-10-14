import { CarrierMovementContract } from './carrier-movement-contract.js';
import { DeliveryExecutionService } from './delivery-execution-service.js';
import { DeliverySettlementContract } from './delivery-settlement-contract.js';
import { DeliverySettlementService } from './delivery-settlement-service.js';
import { MovementTransportExecutionIntegration } from './movement-transport-execution-integration.js';
import { PickupExecutionService } from './pickup-execution-service.js';
import { TransportCompletionService } from './transport-completion-service.js';
import { TransportJobContract } from './transport-job-contract.js';

const cargoFor = b => Object.freeze({ kind: 'carrier-cargo', jobId: b.job.id, unitId: b.unitId, resourceId: b.job.resourceId, amount: Number(b.job.amount) });
function positionFor(state, location) {
  const entity = state.world.get(location.refId) ?? state.domains.buildings.get(location.refId) ?? state.domains.units.get(location.refId);
  const value = entity?.world ?? entity?.position;
  if (!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) throw new Error(`transport recovery location has no position: ${location.refId}`);
  return Object.freeze({ x: Number(value.x), y: Number(value.y) });
}

export class PostContinueTransportExecutionAdapter {
  #state; #bindings = new Map(); #executions = new Map(); #terminalEvidence = new Map(); #movement = new Map(); #cargo = new Map();
  #pickup = new PickupExecutionService(); #delivery = new DeliveryExecutionService(); #settlement; #completion; #publishSupply; #readSupply; #publishSupplyState; __carrierAssignments;
  constructor({ state, transport, completionService = null, publishDeliveredSupply = null, getSupplyState = null, publishSupplyState = null } = {}) {
    if (!state?.domains || !transport?.carrierAssignments) throw new TypeError('restored transport owners required');
    this.#state = state;
    if (publishDeliveredSupply !== null && typeof publishDeliveredSupply !== 'function') throw new TypeError('delivered supply publication seam must be a function');
    this.#publishSupply = publishDeliveredSupply;
    if (getSupplyState !== null && typeof getSupplyState !== 'function') throw new TypeError('supply read seam must be a function');
    this.#readSupply = getSupplyState;
    if (publishSupplyState !== null && typeof publishSupplyState !== 'function') throw new TypeError('supply state publication seam must be a function');
    this.#publishSupplyState = publishSupplyState;
    this.__carrierAssignments = transport.carrierAssignments;
    this.#settlement = new DeliverySettlementService({ resources: state.resourceState, claims: state.resourceClaims, demands: state.resourceDemands });
    this.#completion = completionService ?? new TransportCompletionService({ jobStore: state.domains.jobs, carrierAssignments: transport.carrierAssignments });
    if (typeof this.#completion?.complete !== 'function') throw new TypeError('transport completion service required');
    for (const binding of transport.active) {
      this.#bindings.set(binding.jobId, binding); this.#executions.set(binding.jobId, binding.execution);
      if (['PICKED_UP', 'TO_DROPOFF'].includes(binding.execution.state)) this.#cargo.set(binding.jobId, cargoFor(binding));
      const currentPosition = state.domains.units.get(binding.unitId)?.position;
      if (!currentPosition) throw new Error(`restored carrier position missing: ${binding.unitId}`);
      this.#movement.set(binding.jobId, CarrierMovementContract.define({ unitId: binding.unitId, currentPosition, state: 'IDLE', targetPosition: null }));
    }
  }
  tickFor(descriptor) {
    if (descriptor?.recoveryAction === 'AWAIT_IM20F_COMPLETION_RECONCILIATION') throw new Error('DELIVERED recovery belongs to IM-20F');
    const binding = this.#bindings.get(descriptor?.jobId);
    if (!binding || binding.unitId !== descriptor.unitId) throw new Error(`missing restored transport binding: ${descriptor?.jobId}`);
    return (dtMs = 100) => this.#tick(binding, Math.max(0.01, Number(dtMs) / 100));
  }
  installDispatch(dispatch) {
    const job = dispatch?.job, unitId = dispatch?.workforce?.personId;
    if (dispatch?.kind !== 'workforce-aware-transport-dispatch' || !job || dispatch.execution?.jobId !== job.id || dispatch.execution.unitId !== unitId) throw new TypeError('frozen workforce transport dispatch required');
    if (this.#bindings.has(job.id)) return false;
    const current = this.#readSupply?.(this.#state) ?? this.#state;
    const ownedJob = current.domains.jobs.get(job.id);
    TransportJobContract.validateLinks(job, { claim: current.resourceClaims.get(job.claimId), demand: current.resourceDemands.get(job.demandId), resource: current.resourceState.get(job.resourceId) });
    if (!ownedJob || ['claimId','demandId','resourceId','definitionId','targetId','amount','status'].some(key => ownedJob[key] !== job[key]) || ownedJob.sourceLocation?.refId !== job.sourceLocation?.refId) throw new Error('dispatch does not match authoritative transport job');
    const reservation = current.buildingStockTransportReservations.find(value => value.id === dispatch.reservation?.id);
    if (!reservation || reservation.state !== 'ACTIVE' || reservation.jobId !== job.id) throw new Error('dispatch requires exact current transport reservation');
    const previous = current.workforceAssignments.find(value => value.personId === unitId);
    if (previous?.availability !== 'FREE') throw new Error('transport dispatch requires current FREE workforce');
    if (!current.workforceProfiles.find(value => value.personId === unitId)?.capabilities?.includes('CAN_SIMPLE_TRANSPORT')) throw new Error('current transport workforce capability required');
    const movement = CarrierMovementContract.define({ unitId, currentPosition: current.domains.units.get(unitId)?.position, state: 'IDLE', targetPosition: null });
    const assignment = this.__carrierAssignments.assign(job, { unitId });
    if (assignment.unitId !== unitId) throw new Error('carrier/workforce dispatch mismatch');
    const binding = Object.freeze({ jobId: job.id, unitId, job, assignment: { jobId: job.id, unitId }, execution: dispatch.execution, workforceAssignmentId: dispatch.workforce.assignmentId });
    this.#bindings.set(job.id, binding); this.#executions.set(job.id, dispatch.execution);
    this.#movement.set(job.id, movement);
    this.#state = Object.freeze({ ...current, workforceAssignments: Object.freeze(current.workforceAssignments.map(value => value.personId === unitId ? dispatch.workforce.assignedState : value)) });
    current.domains.units.update(unitId, draft => { draft.carrier = structuredClone(assignment.carrier); });
    this.#publishSupplyState?.(this.#state);
    return true;
  }
  #tick(binding, maxDistance) {
    const id = binding.jobId; let execution = this.#executions.get(id);
    const pickupPosition = positionFor(this.#state, binding.job.sourceLocation);
    const dropoffPosition = positionFor(this.#state, { refId: binding.job.targetId });
    if (execution.state === 'TO_PICKUP') {
      const movement = MovementTransportExecutionIntegration.advance({ execution, movement: this.#movement.get(id), pickupPosition, dropoffPosition, maxDistance });
      this.#movement.set(id, movement);
      if (movement.state === 'IDLE') {
        const result = MovementTransportExecutionIntegration.pickupAfterArrival({ pickupService: this.#pickup, job: binding.job, assignment: binding.assignment, execution, resource: this.#state.resourceState.get(binding.job.resourceId), movement, pickupPosition, dropoffPosition });
        execution = result.execution; this.#cargo.set(id, result.cargo); this.#executions.set(id, execution);
      }
      return execution;
    }
    if (execution.state === 'PICKED_UP') {
      const result = this.#delivery.beginDropoff({ job: binding.job, assignment: binding.assignment, execution, cargo: this.#cargo.get(id) });
      execution = result.execution; this.#executions.set(id, execution); return execution;
    }
    if (execution.state === 'TO_DROPOFF') {
      const movement = MovementTransportExecutionIntegration.advance({ execution, movement: this.#movement.get(id), pickupPosition, dropoffPosition, maxDistance });
      this.#movement.set(id, movement);
      if (movement.state === 'IDLE') {
        const delivered = MovementTransportExecutionIntegration.deliverAfterArrival({ deliveryService: this.#delivery, job: binding.job, assignment: binding.assignment, execution, cargo: this.#cargo.get(id), movement, pickupPosition, dropoffPosition });
        execution = delivered.execution;
        this.#executions.set(id, execution);
        const claim = this.#state.resourceClaims.get(binding.job.claimId), demand = this.#state.resourceDemands.get(binding.job.demandId), resource = this.#state.resourceState.get(binding.job.resourceId);
        const settlement = DeliverySettlementContract.fromDelivered({ job: binding.job, execution, delivery: delivered.delivery, claim, demand, resource });
        const commit = this.#settlement.commit({ settlement, job: binding.job, execution, delivery: delivered.delivery });
        this.#finishDelivery({ binding, execution, delivery: delivered.delivery, commit });
      }
      return execution;
    }
    if (execution.state === 'DELIVERED') {
      const delivery = Object.freeze({ kind: 'delivered-cargo', jobId: binding.job.id, unitId: binding.unitId, resourceId: binding.job.resourceId, targetId: binding.job.targetId, amount: binding.job.amount });
      this.#finishDelivery({ binding, execution, delivery, commit: this.#consumedCommit(binding.job, execution) });
    }
    return execution;
  }

  #consumedCommit(job, execution) {
    const claim = this.#state.resourceClaims.get(job.claimId);
    if (claim?.state !== 'CONSUMED' || claim.resourceId !== job.resourceId || claim.demandId !== job.demandId || claim.consumerId !== job.targetId || claim.amount !== job.amount) throw new Error('pending supply publication requires matching consumed claim');
    return Object.freeze({ kind: 'delivery-settlement-commit', settlement: DeliverySettlementContract.define({ jobId: job.id, executionJobId: execution.jobId, unitId: execution.unitId, resourceId: job.resourceId, claimId: job.claimId, demandId: job.demandId, targetId: job.targetId, amount: job.amount }), claim, resource: this.#state.resourceState.get(job.resourceId), demand: this.#state.resourceDemands.get(job.demandId), recoveredWithoutSettlementReplay: true });
  }

  #finishDelivery({ binding, execution, delivery, commit }) {
    const current = this.#readSupply?.(this.#state);
    if (current) {
      if (current.resourceState !== this.#state.resourceState) throw new Error('supply read seam must preserve candidate identity');
      this.#state = Object.freeze({ ...this.#state, buildingStocks: current.buildingStocks, buildingStockTransportReservations: current.buildingStockTransportReservations, workforceAssignments: current.workforceAssignments, workforceBindings: current.workforceBindings });
    }
    const job = binding.job;
    const reservations = this.#state.buildingStockTransportReservations ?? [];
    const linked = reservations.filter(value => value.jobId === job.id);
    const compatible = value => value.sourceBuildingId === job.sourceLocation.refId && value.targetBuildingId === job.targetId && value.resourceTypeId === job.definitionId && value.amount === job.amount;
    if (linked.some(value => !compatible(value))) throw new Error('bound BuildingStock reservation contradicts delivered job');
    const matches = linked.length ? linked : reservations.filter(value => value.jobId == null && compatible(value));
    if (linked.length > 1) throw new Error('ambiguous BuildingStock reservation for delivered transport');
    const candidates = matches.filter(value => value.state === 'ACTIVE');
    if (candidates.length > 1) throw new Error('ambiguous BuildingStock reservation for delivered transport');
    const demandSource = this.#state.resourceDemands.get(job.demandId)?.metadata?.source;
    if (!candidates.length && ['IM-36_SETTLED_OUTPUT_HQ_DELIVERY', 'IM-23_PRODUCTION_INPUT'].includes(demandSource) && (linked.length !== 1 || linked[0].state !== 'RELEASED')) throw new Error('missing or ambiguous BuildingStock publication evidence for production logistics delivery');
    if (candidates.length) {
      if (!this.#publishSupply) return Object.freeze({ status: 'AWAITING_SUPPLY_PUBLICATION', jobId: job.id });
      const reservation = candidates[0];
      // The existing supply owner publishes on this candidate before terminal cleanup.
      // A missing/rejected publication leaves the consumed claim and DELIVERED execution intact.
      const next = this.#publishSupply(Object.freeze({ state: this.#state, job, execution, delivery, deliveryCommit: commit, reservation, workforceAssignmentId: binding.workforceAssignmentId ?? null }));
      if (!next || !Array.isArray(next.buildingStocks) || !Array.isArray(next.buildingStockTransportReservations) || !Array.isArray(next.workforceAssignments)) throw new Error('authoritative delivered supply publication required');
      const released = next.buildingStockTransportReservations.find(value => value.id === reservation.id);
      if (!released || released.state !== 'RELEASED' || ['sourceBuildingId','targetBuildingId','resourceTypeId','amount','jobId'].some(key => released[key] !== reservation[key])) throw new Error('supply publication must release the exact delivered reservation');
      const quantity = (stocks, id) => stocks.find(value => value.buildingId === id && value.resourceTypeId === job.definitionId)?.quantity ?? 0;
      if (quantity(next.buildingStocks, reservation.sourceBuildingId) !== quantity(this.#state.buildingStocks, reservation.sourceBuildingId) - job.amount || quantity(next.buildingStocks, job.targetId) !== quantity(this.#state.buildingStocks, job.targetId) + job.amount) throw new Error('supply publication must conserve exact delivered stock');
      this.#state = Object.freeze({ ...this.#state, buildingStocks: next.buildingStocks, buildingStockTransportReservations: next.buildingStockTransportReservations, workforceAssignments: next.workforceAssignments, workforceBindings: next.workforceBindings ?? this.#state.workforceBindings });
      this.#publishSupplyState?.(this.#state);
    }
    const completion = this.#completion.complete({ settlementCommit: commit, execution });
    this.#finalizeTerminal(job.id);
    return Object.freeze({ status: 'COMPLETED', completion });
  }

  authoritativeSupplyState() {
    return Object.freeze({ buildingStocks: this.#state.buildingStocks, buildingStockTransportReservations: this.#state.buildingStockTransportReservations, workforceAssignments: this.#state.workforceAssignments, workforceBindings: this.#state.workforceBindings });
  }

  recoverDelivered({ decision, jobId } = {}) {
    const binding = this.#bindings.get(String(jobId));
    if (!binding) throw new Error(`missing restored transport binding: ${jobId}`);
    const execution = this.#executions.get(binding.jobId);
    if (!execution || execution.state !== 'DELIVERED') throw new Error(`DELIVERED execution required for recovery: ${binding.jobId}`);
    const job = this.#state.domains.jobs.get(binding.jobId);
    const claim = this.#state.resourceClaims.get(job.claimId);
    const demand = this.#state.resourceDemands.get(job.demandId);
    const resource = this.#state.resourceState.get(job.resourceId);
    const delivery = Object.freeze({ kind: 'delivered-cargo', jobId: job.id, unitId: binding.unitId, resourceId: job.resourceId, targetId: job.targetId, amount: Number(job.amount) });
    let commit;
    if (decision === 'SETTLE_AND_COMPLETE') {
      const settlement = DeliverySettlementContract.fromDelivered({ job, execution, delivery, claim, demand, resource });
      commit = this.#settlement.commit({ settlement, job, execution, delivery });
    } else if (decision === 'COMPLETE_ONLY') {
      if (claim?.state !== 'CONSUMED') throw new Error(`COMPLETE_ONLY requires consumed claim: ${job.claimId}`);
      commit = Object.freeze({
        kind: 'delivery-settlement-commit',
        settlement: DeliverySettlementContract.define({ jobId: job.id, executionJobId: execution.jobId, unitId: execution.unitId, resourceId: job.resourceId, claimId: job.claimId, demandId: job.demandId, targetId: job.targetId, amount: job.amount }),
        claim,
        resource,
        demand,
        recoveredWithoutSettlementReplay: true,
      });
    } else throw new Error(`unsupported delivered recovery decision: ${decision}`);
    const result = this.#finishDelivery({ binding, execution, delivery, commit });
    return Object.freeze({ kind: 'im20f-delivered-recovery-result', decision, status: result.status, job: result.completion?.job ?? job, carrierRelease: result.completion?.carrierRelease ?? null, claim: this.#state.resourceClaims.get(job.claimId) });
  }
  #finalizeTerminal(jobId) {
    const terminalExecution = this.#executions.get(jobId);
    if (terminalExecution) this.#terminalEvidence.set(jobId, terminalExecution);
    this.#bindings.delete(jobId);
    this.#executions.delete(jobId);
    this.#movement.delete(jobId);
    this.#cargo.delete(jobId);
    const snapshot = this.#completionAssignmentsSnapshot();
    for (const carrier of snapshot.carriers) {
      this.#state.domains.units.update(carrier.unitId, draft => { draft.carrier = structuredClone(carrier); });
    }
  }
  authoritativeTransportState() {
    const snapshot = this.#completionAssignmentsSnapshot();
    return Object.freeze({
      carrierBindings: Object.freeze(snapshot.assignments.map(value => Object.freeze({ kind: 'carrier-job-binding', jobId: value.jobId, unitId: value.unitId, ...(this.#bindings.get(value.jobId)?.workforceAssignmentId == null ? {} : { workforceAssignmentId: this.#bindings.get(value.jobId).workforceAssignmentId }) }))),
      transportExecutions: Object.freeze([...this.#executions.values()]),
      carriers: snapshot.carriers,
    });
  }
  #completionAssignmentsSnapshot() { return this.#transportAssignments().snapshot(); }
  #transportAssignments() { return this.__carrierAssignments; }
  hasActiveExecution(jobId) { return this.#executions.has(jobId); }
  executionForJob(jobId) { return this.#executions.get(jobId) ?? this.#terminalEvidence.get(jobId) ?? null; }
}
