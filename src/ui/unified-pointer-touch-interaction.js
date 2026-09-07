const INPUT_OWNER = Object.freeze({ UI: 'UI', WORLD: 'WORLD' });
const CONTACT_LIFECYCLE = Object.freeze({ ACTIVE: 'ACTIVE', ENDED: 'ENDED', CANCELLED: 'CANCELLED' });

function closestUiRegion(target) {
  return target instanceof Element ? target.closest('[data-ui-region]') : null;
}

export function classifyInputTarget(target) {
  const region = closestUiRegion(target);
  const regionName = region?.dataset?.uiRegion ?? null;
  const owner = regionName === 'world' ? INPUT_OWNER.WORLD : INPUT_OWNER.UI;
  return Object.freeze({ owner, region: regionName ?? 'unclassified' });
}

export function transitionContactLifecycle(previous, phase) {
  if (phase === 'pointerdown') return CONTACT_LIFECYCLE.ACTIVE;
  if (previous !== CONTACT_LIFECYCLE.ACTIVE) return previous ?? null;
  if (phase === 'pointerup') return CONTACT_LIFECYCLE.ENDED;
  if (phase === 'pointercancel') return CONTACT_LIFECYCLE.CANCELLED;
  return CONTACT_LIFECYCLE.ACTIVE;
}

function localPoint(event, surface) {
  if (!(surface instanceof Element)) return Object.freeze({ x: event.clientX, y: event.clientY });
  const rect = surface.getBoundingClientRect();
  return Object.freeze({ x: event.clientX - rect.left, y: event.clientY - rect.top });
}

function freezeSample(event, classification, lifecycle, surface) {
  return Object.freeze({
    phase: event.type,
    owner: classification.owner,
    region: classification.region,
    lifecycle,
    pointerId: event.pointerId,
    pointerType: event.pointerType || 'mouse',
    isPrimary: event.isPrimary !== false,
    button: event.button,
    buttons: event.buttons,
    client: Object.freeze({ x: event.clientX, y: event.clientY }),
    local: localPoint(event, surface),
    timeStamp: event.timeStamp,
  });
}

export function createUnifiedPointerTouchInteraction({ root, worldSurface } = {}) {
  if (!(root instanceof Element)) throw new TypeError('IM-14B root element required');
  if (!(worldSurface instanceof Element)) throw new TypeError('IM-14B world surface required');

  const activeContacts = new Map();
  const listeners = new Map([
    [INPUT_OWNER.UI, new Set()],
    [INPUT_OWNER.WORLD, new Set()],
  ]);

  function emit(sample) {
    for (const listener of listeners.get(sample.owner) ?? []) listener(sample);
  }

  function handle(event) {
    const classification = classifyInputTarget(event.target);
    const previous = activeContacts.get(event.pointerId)?.lifecycle ?? null;
    const lifecycle = transitionContactLifecycle(previous, event.type);

    if (event.type !== 'pointerdown' && previous !== CONTACT_LIFECYCLE.ACTIVE) return;

    const surface = classification.owner === INPUT_OWNER.WORLD
      ? worldSurface
      : closestUiRegion(event.target) ?? root;
    const sample = freezeSample(event, classification, lifecycle, surface);

    if (event.type === 'pointerdown' || event.type === 'pointermove') {
      activeContacts.set(event.pointerId, sample);
    } else {
      activeContacts.delete(event.pointerId);
    }

    emit(sample);
  }

  root.addEventListener('pointerdown', handle, { capture: true, passive: true });
  root.addEventListener('pointermove', handle, { capture: true, passive: true });
  root.addEventListener('pointerup', handle, { capture: true, passive: true });
  root.addEventListener('pointercancel', handle, { capture: true, passive: true });

  return Object.freeze({
    kind: 'unified-pointer-touch-interaction',
    owners: INPUT_OWNER,
    lifecycle: CONTACT_LIFECYCLE,
    subscribe(owner, listener) {
      if (!listeners.has(owner)) throw new TypeError(`unsupported IM-14B input owner: ${owner}`);
      if (typeof listener !== 'function') throw new TypeError('IM-14B listener required');
      listeners.get(owner).add(listener);
      return () => listeners.get(owner).delete(listener);
    },
    activeContacts() {
      return Object.freeze([...activeContacts.values()]);
    },
    destroy() {
      root.removeEventListener('pointerdown', handle, { capture: true });
      root.removeEventListener('pointermove', handle, { capture: true });
      root.removeEventListener('pointerup', handle, { capture: true });
      root.removeEventListener('pointercancel', handle, { capture: true });
      activeContacts.clear();
      for (const set of listeners.values()) set.clear();
    },
  });
}

export const UnifiedPointerTouchInteractionContract = Object.freeze({
  INPUT_OWNER,
  CONTACT_LIFECYCLE,
  classifyInputTarget,
  transitionContactLifecycle,
  create: createUnifiedPointerTouchInteraction,
});
