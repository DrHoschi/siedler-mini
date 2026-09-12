import { GoldEconomyOwner } from './gold-economy-owner.js';

function requireGoldOwner(value) {
  if (!(value instanceof GoldEconomyOwner) || value.kind !== 'gold-economy-owner') {
    throw new TypeError('existing GoldEconomyOwner required');
  }
  return value;
}

function requireAdmission(value) {
  if (!value || value.kind !== 'gold-economy-admission-flow' || value.status !== 'ADMITTED') {
    throw new TypeError('frozen IM-19E admitted gold flow required');
  }
  if (value.flowType !== 'POPULATION_INCOME') {
    throw new TypeError('IM-19F accepts POPULATION_INCOME only');
  }
  if (value.physical !== false) {
    throw new TypeError('gold flow must remain non-physical');
  }
  if (!value.derivedIncome || value.derivedIncome.kind !== 'derived-gold-income') {
    throw new TypeError('admitted derived gold income required');
  }
  if (!Number.isSafeInteger(value.amount) || value.amount < 0 || value.amount !== value.derivedIncome.amount) {
    throw new TypeError('admitted gold amount mismatch');
  }
  if (!value.stateBefore || value.stateBefore.kind !== 'gold-economy-state' || value.stateBefore.physical !== false) {
    throw new TypeError('admitted gold stateBefore required');
  }
  return value;
}

function requireSettlementId(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('settlementId required');
  }
  return value.trim();
}

function requireSettledIds(value) {
  if (!Array.isArray(value)) throw new TypeError('settledIds must be an array');
  if (value.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
    throw new TypeError('settledIds must contain non-empty strings');
  }
  const normalized = value.map((id) => id.trim());
  if (new Set(normalized).size !== normalized.length) {
    throw new Error('settledIds contains duplicate ids');
  }
  return Object.freeze(normalized);
}

function sameGoldState(left, right) {
  return left?.kind === 'gold-economy-state'
    && right?.kind === 'gold-economy-state'
    && left.balance === right.balance
    && left.physical === right.physical;
}

export class OperationalEconomyGoldSettlement {
  static settle({ goldOwner, admittedFlow, settlementId } = {}) {
    const owner = requireGoldOwner(goldOwner);
    const flow = requireAdmission(admittedFlow);
    const id = requireSettlementId(settlementId);
    const currentState = owner.snapshot();

    if (!sameGoldState(currentState, flow.stateBefore)) {
      throw new Error('admitted gold flow is stale for current GoldEconomyOwner state');
    }

    const stateAfter = owner.applyIncome(flow.derivedIncome);

    if (stateAfter.balance !== flow.stateBefore.balance + flow.amount) {
      throw new Error('gold settlement balance invariant violated');
    }
    if (stateAfter.physical !== false) {
      throw new Error('gold settlement must remain non-physical');
    }

    return Object.freeze({
      kind: 'operational-economy-gold-settlement',
      settlementId: id,
      flowType: flow.flowType,
      amount: flow.amount,
      admittedFlow: flow,
      stateBefore: flow.stateBefore,
      stateAfter
    });
  }

  static settleOnce({
    goldOwner,
    admittedFlow,
    settlementId,
    settledIds = []
  } = {}) {
    const id = requireSettlementId(settlementId);
    const previousIds = requireSettledIds(settledIds);

    if (previousIds.includes(id)) {
      throw new Error(`gold settlement already applied: ${id}`);
    }

    const settlement = this.settle({
      goldOwner,
      admittedFlow,
      settlementId: id
    });

    return Object.freeze({
      settlement,
      settledIds: Object.freeze([...previousIds, id])
    });
  }
}
