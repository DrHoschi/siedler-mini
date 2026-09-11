import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';

const PLAYER_STATES = Object.freeze({
  WAITING_FOR_MATERIAL: 'WAITING_FOR_MATERIAL',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION',
  COMPLETED: 'COMPLETED'
});

function requireRequirement(value) {
  if (!value || value.kind !== 'economic-construction-requirement') {
    throw new TypeError('economic construction requirement required');
  }
  const amounts = ['targetAmount', 'reservedAmount', 'fulfilledAmount', 'remainingAmount'];
  for (const key of amounts) {
    if (!Number.isSafeInteger(value[key]) || value[key] < 0) {
      throw new TypeError(`invalid construction requirement ${key}: ${value[key]}`);
    }
  }
  if (value.targetAmount < 1) throw new TypeError('construction requirement targetAmount must be positive');
  if (value.reservedAmount + value.fulfilledAmount + value.remainingAmount !== value.targetAmount) {
    throw new Error('construction requirement quantity invariant failed');
  }
  return value;
}

function requireCompletion(value, buildingId, progress) {
  if (value == null) return null;
  if (value.kind !== 'construction-completion-integration') {
    throw new TypeError('frozen IM-17F construction completion integration required');
  }
  if (value.buildingId !== buildingId || value.progress?.buildingId !== buildingId) {
    throw new Error('construction completion building identity mismatch');
  }
  if (value.progress.progress !== progress.progress || value.progress.state !== progress.state) {
    throw new Error('construction completion progress does not match authoritative progress');
  }
  return value;
}

export function projectPlayerConstructionState({ requirement, progress, completion = null } = {}) {
  const authoritativeRequirement = requireRequirement(requirement);
  const authoritativeProgress = BuildingConstructionProgressTransitionContract.define(progress);
  if (authoritativeRequirement.buildingId !== authoritativeProgress.buildingId) {
    throw new Error('construction projection building identity mismatch');
  }

  const expectedProgress = authoritativeRequirement.fulfilledAmount / authoritativeRequirement.targetAmount;
  if (expectedProgress !== authoritativeProgress.progress) {
    throw new Error('construction projection progress no longer matches authoritative fulfilled material');
  }

  const authoritativeCompletion = requireCompletion(
    completion,
    authoritativeRequirement.buildingId,
    authoritativeProgress
  );

  if (authoritativeProgress.state === 'COMPLETED') {
    if (!authoritativeCompletion?.completionEffective || authoritativeCompletion.completionCount !== 1) {
      throw new Error('completed Player construction state requires authoritative frozen IM-17F completion');
    }
  } else if (authoritativeCompletion?.completionEffective) {
    throw new Error('incomplete construction cannot project authoritative completion');
  }

  const status = authoritativeCompletion?.completionEffective
    ? PLAYER_STATES.COMPLETED
    : authoritativeProgress.state === 'IN_PROGRESS'
      ? PLAYER_STATES.UNDER_CONSTRUCTION
      : PLAYER_STATES.WAITING_FOR_MATERIAL;

  return Object.freeze({
    kind: 'player-construction-state-projection',
    buildingId: authoritativeRequirement.buildingId,
    definitionId: authoritativeRequirement.definitionId,
    demandId: authoritativeRequirement.demandId,
    status,
    progress: authoritativeProgress.progress,
    constructionState: authoritativeProgress.state,
    demandStatus: authoritativeRequirement.status,
    targetAmount: authoritativeRequirement.targetAmount,
    reservedAmount: authoritativeRequirement.reservedAmount,
    fulfilledAmount: authoritativeRequirement.fulfilledAmount,
    remainingAmount: authoritativeRequirement.remainingAmount,
    completionEffective: authoritativeCompletion?.completionEffective === true,
    sources: Object.freeze({
      requirement: authoritativeRequirement,
      progress: authoritativeProgress,
      completion: authoritativeCompletion
    })
  });
}

function ensureSurface() {
  let surface = document.querySelector('[data-im17g-construction-state]');
  if (surface) return surface;
  const footer = document.querySelector('.player-action-region');
  if (!footer) return null;
  surface = document.createElement('output');
  surface.dataset.im17gConstructionState = 'true';
  surface.setAttribute('aria-live', 'polite');
  surface.textContent = 'Bauzustand · noch keine autoritative Projektion';
  footer.append(surface);
  return surface;
}

export function renderPlayerConstructionStateProjection(projection, surface = ensureSurface()) {
  if (!projection || projection.kind !== 'player-construction-state-projection') {
    throw new TypeError('player construction state projection required');
  }
  if (!surface) return projection;
  surface.dataset.status = projection.status;
  const percent = Math.round(projection.progress * 100);
  const label = projection.status === PLAYER_STATES.COMPLETED
    ? 'Fertig'
    : projection.status === PLAYER_STATES.UNDER_CONSTRUCTION
      ? 'Im Bau'
      : 'Wartet auf Material';
  surface.textContent = `Bauzustand · ${label} · ${percent}% · ${projection.buildingId}`;
  return projection;
}

export const PlayerConstructionStateProjection = Object.freeze({
  states: PLAYER_STATES,
  project: projectPlayerConstructionState,
  render: renderPlayerConstructionStateProjection,
  capabilities: Object.freeze({
    admissionAuthority: false,
    demandAuthority: false,
    resourceAuthority: false,
    deliveryAuthority: false,
    progressAuthority: false,
    completionAuthority: false,
    workforceAuthority: false,
    productionAuthority: false
  })
});

if (typeof window !== 'undefined') {
  window.IM17GPlayerConstructionStateProjection = PlayerConstructionStateProjection;
}
