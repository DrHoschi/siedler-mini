export class Scheduler {
  #phases;
  #systems = new Map();
  #running = false;
  #timer = null;
  #stepMs;

  constructor({ phases, stepMs }) {
    this.#phases = [...phases];
    this.#stepMs = stepMs;
    for (const phase of this.#phases) this.#systems.set(phase, new Map());
  }

  register({ id, phase, tick }) {
    if (!id || typeof tick !== 'function') throw new TypeError('system id/tick required');
    const bucket = this.#systems.get(phase);
    if (!bucket) throw new Error(`unknown phase: ${phase}`);
    if (this.has(id)) throw new Error(`duplicate system: ${id}`);
    bucket.set(id, tick);
    return () => bucket.delete(id);
  }

  has(id) {
    for (const bucket of this.#systems.values()) if (bucket.has(id)) return true;
    return false;
  }

  systemCount() {
    let n = 0;
    for (const bucket of this.#systems.values()) n += bucket.size;
    return n;
  }

  step(dtMs = this.#stepMs) {
    for (const phase of this.#phases) {
      for (const tick of this.#systems.get(phase).values()) tick(dtMs);
    }
  }

  start() {
    if (this.#running) return false;
    this.#running = true;
    this.#timer = setInterval(() => this.step(this.#stepMs), this.#stepMs);
    return true;
  }

  pause() {
    if (!this.#running) return false;
    clearInterval(this.#timer);
    this.#timer = null;
    this.#running = false;
    return true;
  }

  stop() { return this.pause(); }
  get running() { return this.#running; }
  get stepMs() { return this.#stepMs; }
  get phases() { return Object.freeze([...this.#phases]); }
}
