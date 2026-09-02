import { TransportJobContract } from './transport-job-contract.js?v=cr04c-4';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export class TransportJobService {
  #jobs;
  #claims;
  #demands;
  #resources;

  constructor({ jobStore, claims, demands, resourceState }) {
    if (!jobStore || typeof jobStore.create !== 'function' || typeof jobStore.allocateId !== 'function' || typeof jobStore.update !== 'function') throw new TypeError('jobStore required');
    if (!claims || typeof claims.get !== 'function') throw new TypeError('claims required');
    if (!demands || typeof demands.get !== 'function' || typeof demands.releaseClaim !== 'function') throw new TypeError('demands required');
    if (!resourceState || typeof resourceState.get !== 'function') throw new TypeError('resourceState required');
    this.#jobs = jobStore;
    this.#claims = claims;
    this.#demands = demands;
    this.#resources = resourceState;
  }

  createFromAssignment(assignment) {
    if (!assignment || !Array.isArray(assignment.claimIds)) throw new TypeError('assignment with claimIds required');
    return this.createFromClaimIds(assignment.claimIds);
  }

  createFromClaimIds(claimIds) {
    if (!Array.isArray(claimIds) || claimIds.length === 0) throw new TypeError('non-empty claimIds required');
    if (new Set(claimIds).size !== claimIds.length) throw new Error('duplicate claim id in transport job creation');

    const existingByClaim = this.#existingByClaim();
    const plan = claimIds.map(claimId => {
      const existing = existingByClaim.get(claimId);
      if (existing) return { existing };
      const claim = this.#claims.get(claimId);
      if (!claim) throw new TypeError(`unknown claim id: ${claimId}`);
      const demand = this.#demands.get(claim.demandId);
      const resource = this.#resources.get(claim.resourceId);
      const job = TransportJobContract.validateLinks({
        id: this.#jobs.allocateId(),
        claimId: claim.id,
        demandId: claim.demandId,
        resourceId: claim.resourceId,
        definitionId: demand?.definitionId,
        sourceLocation: resource?.location,
        targetId: claim.consumerId,
        amount: claim.amount,
        status: 'PENDING'
      }, { claim, demand, resource });
      return { job };
    });

    const jobs = plan.map(item => {
      if (item.existing) return item.existing;
      const { id, kind, ...data } = item.job;
      return this.#jobs.create(data, { id });
    });

    return deepFreeze({
      source: 'CR-04B_CONTROLLED_CREATION',
      jobCount: jobs.length,
      createdCount: plan.filter(item => item.job).length,
      jobs
    });
  }

  cancel(jobId) {
    const job = this.#requireJob(jobId);
    if (job.status === 'CANCELLED') return job;
    TransportJobContract.assertTransition(job.status, 'CANCELLED');
    return this.#jobs.update(job.id, draft => { draft.status = 'CANCELLED'; });
  }

  release(jobId) {
    const job = this.#requireJob(jobId);
    if (job.status === 'RELEASED') return job;
    TransportJobContract.assertTransition(job.status, 'RELEASED');

    const claim = this.#claims.get(job.claimId);
    if (!claim) throw new TypeError(`unknown claim id: ${job.claimId}`);
    if (claim.state === 'CONSUMED') throw new Error(`consumed claim cannot release transport job: ${job.claimId}`);
    if (claim.state === 'ACTIVE') this.#demands.releaseClaim(job.claimId);
    const releasedClaim = this.#claims.get(job.claimId);
    if (releasedClaim?.state !== 'RELEASED') throw new Error(`transport job claim release failed: ${job.claimId}`);

    return this.#jobs.update(job.id, draft => { draft.status = 'RELEASED'; });
  }

  #requireJob(jobId) {
    const job = this.#jobs.get(jobId);
    if (!job) throw new TypeError(`unknown transport job id: ${jobId}`);
    return job;
  }

  #existingByClaim() {
    const map = new Map();
    for (const id of this.#jobs.ids()) {
      const job = this.#jobs.get(id);
      if (job?.claimId) map.set(job.claimId, job);
    }
    return map;
  }
}
