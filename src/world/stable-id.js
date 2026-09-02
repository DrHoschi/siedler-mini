const DEFAULT_WIDTH = 8;

function normalizeKind(kind) {
  const value = String(kind || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(value)) {
    throw new TypeError(`invalid id kind: ${kind}`);
  }
  return value;
}

function normalizeSequence(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError('sequence must be a positive safe integer');
  return n;
}

export function formatStableId(kind, sequence, width = DEFAULT_WIDTH) {
  const normalizedKind = normalizeKind(kind);
  const normalizedSequence = normalizeSequence(sequence);
  const normalizedWidth = Math.max(1, Number(width) | 0);
  return `${normalizedKind}:${String(normalizedSequence).padStart(normalizedWidth, '0')}`;
}

export function parseStableId(id) {
  const value = String(id || '').trim();
  const match = /^([a-z][a-z0-9-]*):(\d+)$/.exec(value);
  if (!match) return null;
  const sequence = Number(match[2]);
  if (!Number.isSafeInteger(sequence) || sequence < 1) return null;
  return Object.freeze({ id: value, kind: match[1], sequence });
}

export class StableIdAllocator {
  #nextByKind = new Map();
  #width;

  constructor({ width = DEFAULT_WIDTH, seeds = {} } = {}) {
    this.#width = Math.max(1, Number(width) | 0);
    for (const [kind, next] of Object.entries(seeds || {})) {
      this.seed(kind, next);
    }
  }

  seed(kind, nextSequence) {
    const normalizedKind = normalizeKind(kind);
    const normalizedSequence = normalizeSequence(nextSequence);
    const current = this.#nextByKind.get(normalizedKind) ?? 1;
    if (normalizedSequence < current) {
      throw new Error(`stable id seed cannot move backwards: ${normalizedKind}`);
    }
    this.#nextByKind.set(normalizedKind, normalizedSequence);
    return normalizedSequence;
  }

  reserve(id) {
    const parsed = parseStableId(id);
    if (!parsed) throw new TypeError(`invalid stable id: ${id}`);
    const next = parsed.sequence + 1;
    const current = this.#nextByKind.get(parsed.kind) ?? 1;
    if (next > current) this.#nextByKind.set(parsed.kind, next);
    return parsed.id;
  }

  next(kind) {
    const normalizedKind = normalizeKind(kind);
    const sequence = this.#nextByKind.get(normalizedKind) ?? 1;
    this.#nextByKind.set(normalizedKind, sequence + 1);
    return formatStableId(normalizedKind, sequence, this.#width);
  }

  peek(kind) {
    const normalizedKind = normalizeKind(kind);
    return formatStableId(normalizedKind, this.#nextByKind.get(normalizedKind) ?? 1, this.#width);
  }

  snapshot() {
    return Object.freeze(Object.fromEntries([...this.#nextByKind.entries()].sort(([a], [b]) => a.localeCompare(b))));
  }
}
