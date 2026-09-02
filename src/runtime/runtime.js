import { EventBus } from './event-bus.js';
import { Scheduler } from './scheduler.js';
import { StoreRegistry } from './store.js';

const STATES = Object.freeze(['CREATED','BOOTING','READY','RUNNING','PAUSED','STOPPED']);

export class Runtime {
  #state = 'CREATED';

  constructor(config) {
    this.config = config;
    this.events = new EventBus();
    this.stores = new StoreRegistry();
    this.scheduler = new Scheduler({
      phases: config.simulation.phases,
      stepMs: config.simulation.fixedStepMs
    });
  }

  get state() { return this.#state; }

  #setState(next) {
    if (!STATES.includes(next)) throw new Error(`invalid runtime state: ${next}`);
    const previous = this.#state;
    this.#state = next;
    this.events.emit('runtime.stateChanged', Object.freeze({ previous, current: next }));
  }

  boot() {
    if (this.#state !== 'CREATED') throw new Error(`boot not allowed from ${this.#state}`);
    this.#setState('BOOTING');
    this.events.emit('runtime.booting', null);
    this.#setState('READY');
    this.events.emit('runtime.ready', null);
  }

  start() {
    if (!['READY','PAUSED'].includes(this.#state)) throw new Error(`start not allowed from ${this.#state}`);
    this.scheduler.start();
    this.#setState('RUNNING');
    this.events.emit('runtime.started', null);
  }

  pause() {
    if (this.#state !== 'RUNNING') return false;
    this.scheduler.pause();
    this.#setState('PAUSED');
    this.events.emit('runtime.paused', null);
    return true;
  }

  stop() {
    this.scheduler.stop();
    this.#setState('STOPPED');
    this.events.emit('runtime.stopped', null);
  }
}
