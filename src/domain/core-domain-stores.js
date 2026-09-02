import { DomainStore } from './domain-store.js';

export class CoreDomainStores {
  constructor() {
    this.buildings = new DomainStore('buildings', 'building');
    this.units = new DomainStore('units', 'unit');
    this.resources = new DomainStore('resources', 'resource');
    this.jobs = new DomainStore('jobs', 'job');
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
