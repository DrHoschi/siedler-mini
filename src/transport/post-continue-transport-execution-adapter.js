import { TransportExecutionContract } from './transport-execution-contract.js';

const NEXT_STATE = Object.freeze({
  CONTINUE_TO_PICKUP: 'PICKED_UP',
  BEGIN_DROPOFF_TRANSITION: 'TO_DROPOFF',
  CONTINUE_TO_DROPOFF: 'DELIVERED',
});

export class PostContinueTransportExecutionAdapter {
  #executions = new Map();

  constructor({ executions = [] } = {}) {
    for (const input of executions) {
      const execution = TransportExecutionContract.define(input);
      this.#executions.set(execution.jobId, execution);
    }
  }

  tickFor(descriptor) {
    const action = String(descriptor?.recoveryAction || '');
    if (action === 'AWAIT_IM20F_COMPLETION_RECONCILIATION') {
      throw new Error('DELIVERED recovery belongs to IM-20F');
    }
    const nextState = NEXT_STATE[action];
    if (!nextState) throw new Error(`unsupported IM-20D recovery action: ${action}`);
    const execution = this.#executions.get(descriptor.jobId);
    if (!execution || execution.unitId !== descriptor.unitId) {
      throw new Error(`missing restored transport execution: ${descriptor?.jobId}`);
    }
    let consumed = false;
    return () => {
      if (consumed) return this.#executions.get(descriptor.jobId);
      const current = this.#executions.get(descriptor.jobId);
      const next = TransportExecutionContract.transition(current, nextState);
      this.#executions.set(descriptor.jobId, next);
      consumed = true;
      return next;
    };
  }

  executionForJob(jobId) { return this.#executions.get(jobId) ?? null; }
}
