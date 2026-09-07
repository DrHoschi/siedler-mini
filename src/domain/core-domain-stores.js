import { DomainStore } from './domain-store.js';

export class CoreDomainStores {
  constructor({ restoreDomains = null, allocators = null } = {}) {
    const restored = restoreDomains ?? {};
    const ids = allocators ?? {};
    this.buildings = new DomainStore('buildings', 'building', {
      allocator: ids.buildings ?? null,
      restoreState: restored.buildings ?? null,
    });
    this.units = new DomainStore('units', 'unit', {
      allocator: ids.units ?? null,
      restoreState: restored.units ?? null,
    });
    this.resources = new DomainStore('resources', 'resource', {
      allocator: ids.resources ?? null,
      restoreState: restored.resources ?? null,
    });
    this.jobs = new DomainStore('jobs', 'transport-job', {
      allocator: ids.jobs ?? null,
      restoreState: restored.jobs ?? null,
    });
    Object.freeze(this);
  }

  names() {
    return Object.freeze(['buildings', 'units', 'resources', 'jobs']);
  }

  snapshot() {
    return Object.freeze({
      buildings: this.buildings.snapshot(),
      units: this.units.snapshot(),
      resources: this.resources.snapshot(),
      jobs: this.jobs.snapshot()
    });
  }
}
