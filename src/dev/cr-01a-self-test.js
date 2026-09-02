import { StableIdAllocator, parseStableId } from '../world/stable-id.js';
import { WorldStore } from '../world/world-store.js';

export function runCr01aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  check('stable-id-deterministic-sequence', () => {
    const ids = new StableIdAllocator();
    return ids.next('entity') === 'entity:00000001'
      && ids.next('entity') === 'entity:00000002'
      && ids.next('unit') === 'unit:00000001';
  });

  check('stable-id-parse-and-reserve', () => {
    const ids = new StableIdAllocator();
    ids.reserve('entity:00000012');
    const parsed = parseStableId(ids.next('entity'));
    return parsed?.kind === 'entity' && parsed.sequence === 13;
  });

  check('world-create-get-remove', () => {
    const world = new WorldStore();
    const created = world.create('entity', { name: 'test' });
    const read = world.get(created.id);
    const removed = world.remove(created.id);
    return created.id === 'entity:00000001'
      && read?.name === 'test'
      && removed === true
      && world.get(created.id) === null;
  });

  check('world-rejects-duplicate-id', () => {
    const world = new WorldStore();
    world.create('entity', {}, { id: 'entity:00000042' });
    try {
      world.create('entity', {}, { id: 'entity:00000042' });
      return false;
    } catch {
      return true;
    }
  });

  check('world-snapshot-frozen-and-detached', () => {
    const world = new WorldStore();
    const created = world.create('entity', { nested: { value: 1 } });
    const snapshot = world.snapshot();
    world.update(created.id, draft => { draft.nested.value = 2; });
    return snapshot.entities[created.id].nested.value === 1
      && Object.isFrozen(snapshot)
      && Object.isFrozen(snapshot.entities)
      && Object.isFrozen(snapshot.entities[created.id].nested);
  });

  check('world-id-and-kind-immutable', () => {
    const world = new WorldStore();
    const created = world.create('entity', {});
    let idRejected = false;
    let kindRejected = false;
    try { world.update(created.id, draft => { draft.id = 'entity:00009999'; }); } catch { idRejected = true; }
    try { world.update(created.id, draft => { draft.kind = 'unit'; }); } catch { kindRejected = true; }
    return idRejected && kindRejected && world.get(created.id)?.kind === 'entity';
  });

  const pass = results.every(r => r.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
