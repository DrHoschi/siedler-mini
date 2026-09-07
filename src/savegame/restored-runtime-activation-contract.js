import { WorldBackedTraversabilitySource } from '../transport/world-backed-traversability-source.js';
import { DeterministicWorldReachabilityIntegration } from '../transport/deterministic-world-reachability-integration.js';
import { RuntimeEntityNavigationValidationIntegration } from '../transport/runtime-entity-navigation-validation-integration.js';
import { projectVisibleRuntimeState } from '../render/live-runtime-render-integration.js';
import { SaveGameRestoreContract } from './savegame-restore-contract.js';

const ACTIVATION_RESULT_KIND = 'restored-runtime-activation-result';
const ACTIVE_COMPOSITION_KIND = 'active-runtime-composition';

function requireAuthoritativeState(state) {
  if (state?.kind === 'restored-authoritative-runtime-state') {
    // IM-13C committed state: accepted as-is after owner checks below.
  }
  if (!state?.world || typeof state.world.snapshot !== 'function') throw new TypeError('active WorldStore owner required');
  if (!state?.map || typeof state.map.snapshot !== 'function') throw new TypeError('active MapStructure owner required');
  if (!state?.domains || typeof state.domains.names !== 'function') throw new TypeError('active CoreDomainStores owner required');
  if (!state?.goldEconomy || typeof state.goldEconomy.snapshot !== 'function') throw new TypeError('active GoldEconomyOwner required');
  if (!state?.pathClassification || typeof state.pathClassification.classAt !== 'function') throw new TypeError('active path classification owner required');
  if (!state?.pathUsageWear || typeof state.pathUsageWear.entries !== 'function') throw new TypeError('active path/wear owner required');

  return Object.freeze({
    world: state.world,
    map: state.map,
    domains: state.domains,
    goldEconomy: state.goldEconomy,
    pathClassification: state.pathClassification,
    pathUsageWear: state.pathUsageWear,
  });
}

function defaultDerivedFactory(authoritative) {
  const traversability = new WorldBackedTraversabilitySource({
    map: authoritative.map,
    domains: authoritative.domains,
  });

  return Object.freeze({
    kind: 'runtime-derived-rebinding',
    traversability,
    populationPolicy: Object.freeze({
      persisted: false,
      source: 'RESTORED_DOMAIN_HOUSING_TRUTH',
      mutationDuringActivation: false,
    }),
    reachability: Object.freeze({
      evaluate: options => DeterministicWorldReachabilityIntegration.evaluate({
        ...options,
        map: authoritative.map,
        traversability,
      }),
    }),
    navigation: Object.freeze({
      validatePerson: options => RuntimeEntityNavigationValidationIntegration.validatePerson({
        ...options,
        domains: authoritative.domains,
        map: authoritative.map,
        traversability,
      }),
      validateCarrierMovement: options => RuntimeEntityNavigationValidationIntegration.validateCarrierMovement({
        ...options,
        domains: authoritative.domains,
        map: authoritative.map,
        traversability,
      }),
    }),
    render: Object.freeze({
      projectVisibleState: () => projectVisibleRuntimeState({
        map: authoritative.map,
        domains: authoritative.domains,
      }),
    }),
  });
}

function createComposition(authoritativeState, derivedFactory) {
  const authoritative = requireAuthoritativeState(authoritativeState);
  const derived = derivedFactory(authoritative);
  if (!derived?.traversability || !derived?.reachability || !derived?.navigation || !derived?.render) {
    throw new TypeError('complete IM-13D derived rebinding required');
  }
  return Object.freeze({
    kind: ACTIVE_COMPOSITION_KIND,
    authoritative,
    derived,
  });
}

function reject(reason, activeComposition, error = null) {
  return Object.freeze({
    kind: ACTIVATION_RESULT_KIND,
    status: 'REJECTED',
    reason,
    activeComposition,
    error: error ? String(error?.message ?? error) : null,
  });
}

export class RestoredRuntimeActivationContract {
  #activeComposition;
  #derivedFactory;
  #publish;

  constructor({ activeAuthoritativeState, derivedFactory = defaultDerivedFactory, publish = null } = {}) {
    if (typeof derivedFactory !== 'function') throw new TypeError('derivedFactory function required');
    if (publish != null && typeof publish !== 'function') throw new TypeError('publish must be a function');
    this.#derivedFactory = derivedFactory;
    this.#publish = publish;
    this.#activeComposition = createComposition(activeAuthoritativeState, this.#derivedFactory);
  }

  static get resultKind() { return ACTIVATION_RESULT_KIND; }
  static get compositionKind() { return ACTIVE_COMPOSITION_KIND; }

  active() {
    return this.#activeComposition;
  }

  activate(restoredResult) {
    const previous = this.#activeComposition;
    if (restoredResult?.kind !== SaveGameRestoreContract.resultKind || restoredResult?.status !== 'RESTORED') {
      return reject('IM-13C_RESTORED_RESULT_REQUIRED', previous);
    }
    if (restoredResult.runtimeState?.kind !== 'restored-authoritative-runtime-state') {
      return reject('IM-13C_COMMITTED_RUNTIME_STATE_REQUIRED', previous);
    }

    let candidate;
    try {
      candidate = createComposition(restoredResult.runtimeState, this.#derivedFactory);
    } catch (error) {
      return reject('DERIVED_REBIND_FAILED', previous, error);
    }

    try {
      if (this.#publish) this.#publish(candidate);
    } catch (error) {
      return reject('ATOMIC_PUBLISH_FAILED', previous, error);
    }

    this.#activeComposition = candidate;
    return Object.freeze({
      kind: ACTIVATION_RESULT_KIND,
      status: 'ACTIVATED',
      captureStepIndex: restoredResult.captureStepIndex,
      previousComposition: previous,
      activeComposition: candidate,
    });
  }
}
