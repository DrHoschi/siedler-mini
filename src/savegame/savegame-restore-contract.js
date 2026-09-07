import { StableIdAllocator } from '../world/stable-id.js';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { WorldBackedPathClassificationSource } from '../transport/world-backed-path-classification-source.js';
import { DeterministicPathUsageWearIntegration } from '../transport/deterministic-path-usage-wear-integration.js';
import { SaveGameValidationContract } from './savegame-validation-contract.js';

const RESULT_KIND = 'savegame-restore-result';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function allocatorFrom(snapshot) {
  return new StableIdAllocator({ seeds: clone(snapshot) });
}

function prepareDomains(snapshot) {
  const allocators = {};
  const restoreDomains = {};
  for (const name of ['buildings', 'units', 'resources', 'jobs']) {
    allocators[name] = allocatorFrom(snapshot.domains[name].allocator);
    restoreDomains[name] = clone(snapshot.domains[name].state);
  }
  return new CoreDomainStores({ restoreDomains, allocators });
}

function prepareOwners(snapshot) {
  const world = new WorldStore({
    allocator: allocatorFrom(snapshot.world.allocator),
    restoreState: clone(snapshot.world.state),
  });
  const map = new MapStructure(world, { restoreSnapshot: clone(snapshot.map) });
  const domains = prepareDomains(snapshot);
  const goldEconomy = new GoldEconomyOwner({ initialGold: snapshot.economy.gold.balance });
  const pathClassification = new WorldBackedPathClassificationSource({ map, world });
  const pathUsageWear = new DeterministicPathUsageWearIntegration({
    map,
    classification: pathClassification,
    initialEntries: clone(snapshot.pathWear.entries),
  });

  return Object.freeze({
    world,
    map,
    domains,
    goldEconomy,
    pathClassification,
    pathUsageWear,
  });
}

export class SaveGameRestoreContract {
  static get resultKind() { return RESULT_KIND; }

  static prepare(snapshot) {
    const validation = SaveGameValidationContract.validate(snapshot);
    if (validation.status !== 'VALID') {
      return Object.freeze({
        kind: RESULT_KIND,
        status: 'REJECTED',
        validation,
        prepared: null,
      });
    }

    const owners = prepareOwners(snapshot);
    return Object.freeze({
      kind: RESULT_KIND,
      status: 'PREPARED',
      validation,
      captureStepIndex: snapshot.capture.stepIndex,
      owners,
    });
  }

  static commit(preparedResult) {
    if (preparedResult?.kind !== RESULT_KIND || preparedResult?.status !== 'PREPARED' || !preparedResult.owners) {
      throw new TypeError('IM-13C PREPARED restore result required');
    }
    return Object.freeze({
      kind: 'restored-authoritative-runtime-state',
      captureStepIndex: preparedResult.captureStepIndex,
      world: preparedResult.owners.world,
      map: preparedResult.owners.map,
      domains: preparedResult.owners.domains,
      goldEconomy: preparedResult.owners.goldEconomy,
      pathClassification: preparedResult.owners.pathClassification,
      pathUsageWear: preparedResult.owners.pathUsageWear,
    });
  }

  static restore(snapshot) {
    const prepared = this.prepare(snapshot);
    if (prepared.status !== 'PREPARED') return prepared;
    return Object.freeze({
      kind: RESULT_KIND,
      status: 'RESTORED',
      validation: prepared.validation,
      captureStepIndex: prepared.captureStepIndex,
      runtimeState: this.commit(prepared),
    });
  }
}
