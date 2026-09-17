const DEFAULT_KEY = 'neue-siedler.savegame.im20e.v2';

export class BrowserSaveGameStorageAdapter {
  #storage;
  #key;

  constructor({ storage, key = DEFAULT_KEY } = {}) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new TypeError('Storage-compatible browser storage required');
    }
    this.#storage = storage;
    this.#key = String(key || '').trim();
    if (!this.#key) throw new TypeError('savegame storage key required');
  }

  read() {
    const payload = this.#storage.getItem(this.#key);
    return payload == null ? null : String(payload);
  }

  write(payload) {
    if (typeof payload !== 'string' || payload.length === 0) throw new TypeError('serialized savegame required');
    const previous = this.read();
    try {
      this.#storage.setItem(this.#key, payload);
    } catch (error) {
      const current = this.read();
      if (current !== previous) {
        if (previous == null) this.#storage.removeItem?.(this.#key);
        else this.#storage.setItem(this.#key, previous);
      }
      throw error;
    }
    return Object.freeze({ kind: 'im20e-browser-save-write', key: this.#key, bytes: payload.length });
  }

  get key() { return this.#key; }
}
