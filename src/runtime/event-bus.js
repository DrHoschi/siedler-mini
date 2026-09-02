export class EventBus {
  #listeners = new Map();

  on(type, handler) {
    if (typeof type !== 'string' || !type) throw new TypeError('event type required');
    if (typeof handler !== 'function') throw new TypeError('handler must be function');
    const set = this.#listeners.get(type) ?? new Set();
    set.add(handler);
    this.#listeners.set(type, set);
    return () => this.off(type, handler);
  }

  once(type, handler) {
    const off = this.on(type, payload => { off(); handler(payload); });
    return off;
  }

  off(type, handler) {
    const set = this.#listeners.get(type);
    if (!set) return false;
    const removed = set.delete(handler);
    if (!set.size) this.#listeners.delete(type);
    return removed;
  }

  emit(type, payload = null) {
    const set = this.#listeners.get(type);
    if (!set) return 0;
    for (const handler of [...set]) handler(payload);
    return set.size;
  }

  listenerCount(type) { return this.#listeners.get(type)?.size ?? 0; }
  clear() { this.#listeners.clear(); }
}
