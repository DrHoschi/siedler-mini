import { CarrierMovementContract } from './carrier-movement-contract.js';
import { DeliveryExecutionService } from './delivery-execution-service.js';
import { DeliverySettlementContract } from './delivery-settlement-contract.js';
import { DeliverySettlementService } from './delivery-settlement-service.js';
import { MovementTransportExecutionIntegration } from './movement-transport-execution-integration.js';
import { PickupExecutionService } from './pickup-execution-service.js';
import { TransportCompletionService } from './transport-completion-service.js';

const cargoFor = b => Object.freeze({ kind: 'carrier-cargo', jobId: b.job.id, unitId: b.unitId, resourceId: b.job.resourceId, amount: Number(b.job.amount) });
function positionFor(state, location) {
  const entity = state.world.get(location.refId) ?? state.domains.buildings.get(location.refId) ?? state.domains.units.get(location.refId);
  const value = entity?.world ?? entity?.position;
  if (!value || !Number.isFinite(Number(value.x)) || !Number.isFinite(Number(value.y))) throw new Error(`transport recovery location has no position: ${location.refId}`);
  return Object.freeze({ x: Number(value.x), y: Number(value.y) });
}

export class PostContinueTransportExecutionAdapter {
  #state; #bindings = new Map(); #executions = new Map(); #terminalEvidence = new Map(); #movement = new Map(); #cargo = new Map();
  #pickup = new PickupExecutionService(); #delivery = new DeliveryExecutionService(); #settlement; #completion; __carrierAssignments;
  constructor({ state, transport, completionService = null } = {}) {
    if (!state?.domains || !transport?.carrierAssignments) throw new TypeError('restored transport owners required');
    this.#state = state;
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
        const claim = this.#state.resourceClaims.get(binding.job.claimId), demand = this.#state.resourceDemands.get(binding.job.demandId), resource = this.#state.resourceState.get(binding.job.resourceId);
        const settlement = DeliverySettlementContract.fromDelivered({ job: binding.job, execution, delivery: delivered.delivery, claim, demand, resource });
        const commit = this.#settlement.commit({ settlement, job: binding.job, execution, delivery: delivered.delivery });
        this.#completion.complete({ settlementCommit: commit, execution });
        this.#finalizeTerminal(binding.jobId);
      }
      return execution;
    }
    return execution;
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
    const completion = this.#completion.complete({ settlementCommit: commit, execution });
    this.#finalizeTerminal(binding.jobId);
    return Object.freeze({ kind: 'im20f-delivered-recovery-result', decision, job: completion.job, carrierRelease: completion.carrierRelease, claim: this.#state.resourceClaims.get(job.claimId) });
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
      carrierBindings: Object.freeze(snapshot.assignments.map(value => Object.freeze({ kind: 'carrier-job-binding', jobId: value.jobId, unitId: value.unitId }))),
      transportExecutions: Object.freeze([...this.#executions.values()]),
      carriers: snapshot.carriers,
    });
  }
  #completionAssignmentsSnapshot() { return this.#transportAssignments().snapshot(); }
  #transportAssignments() { return this.__carrierAssignments; }
  hasActiveExecution(jobId) { return this.#executions.has(jobId); }
  executionForJob(jobId) { return this.#executions.get(jobId) ?? this.#terminalEvidence.get(jobId) ?? null; }
}
