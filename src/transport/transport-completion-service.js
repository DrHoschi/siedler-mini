import { TransportJobContract } from './transport-job-contract.js';

function requireCompatible(name, value, methods) {
  if (!value || methods.some(method => typeof value[method] !== 'function')) {
    throw new TypeError(`${name}-compatible instance required`);
  }
  return value;
}

export class TransportCompletionService {
  #jobs;
  #carrierAssignments;

  constructor({ jobStore, carrierAssignments } = {}) {
    this.#jobs = requireCompatible('jobStore', jobStore, ['get', 'update']);
    this.#carrierAssignments = requireCompatible('CarrierAssignmentService', carrierAssignments, ['assignmentForJob', 'carrierForJob', 'release']);
  }

  complete({ settlementCommit, execution } = {}) {
    if (!settlementCommit || settlementCommit.kind !== 'delivery-settlement-commit') {
      throw new TypeError('successful CR-07B delivery-settlement-commit required');
    }
    const settlement = settlementCommit.settlement;
    if (!settlement || settlement.kind !== 'delivery-settlement') throw new TypeError('settlement contract missing from commit');
    if (!settlementCommit.claim || settlementCommit.claim.state !== 'CONSUMED') throw new Error('CR-07C requires consumed settlement claim');

    const job = this.#jobs.get(settlement.jobId);
    if (!job) throw new TypeError(`unknown transport job id: ${settlement.jobId}`);
    if (job.status !== 'PENDING') throw new Error(`CR-07C requires pending transport job: ${job.id}`);

    if (!execution || execution.kind !== 'transport-execution' || execution.state !== 'DELIVERED') {
      throw new Error('CR-07C requires DELIVERED transport execution');
    }
    if (execution.jobId !== job.id) throw new Error(`completion execution job mismatch: ${execution.jobId} != ${job.id}`);
    if (execution.unitId !== settlement.unitId) throw new Error(`completion execution carrier mismatch: ${execution.unitId} != ${settlement.unitId}`);

    const assignment = this.#carrierAssignments.assignmentForJob(job.id);
    if (!assignment) throw new Error(`completion requires active carrier assignment: ${job.id}`);
    if (assignment.unitId !== settlement.unitId) throw new Error(`completion carrier assignment mismatch: ${assignment.unitId} != ${settlement.unitId}`);
    const occupiedCarrier = this.#carrierAssignments.carrierForJob(job.id);
    if (!occupiedCarrier || occupiedCarrier.state !== 'OCCUPIED') throw new Error(`completion requires OCCUPIED carrier: ${assignment.unitId}`);

    TransportJobContract.assertTransition(job.status, 'RELEASED');
    const completedJob = this.#jobs.update(job.id, draft => { draft.status = 'RELEASED'; });
    const release = this.#carrierAssignments.release(completedJob);
    if (!release.released || release.unitId !== assignment.unitId || release.carrier?.state !== 'AVAILABLE') {
      throw new Error(`carrier release failed after transport completion: ${job.id}`);
    }

    return Object.freeze({
      kind: 'transport-completion',
      job: completedJob,
      carrierRelease: release,
      settlementCommit
    });
  }
}
