import { CoreDomainStores } from '../domain/core-domain-stores.js';

export function runCr01cSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  check('four-empty-separated-stores', () => {
    const stores = new CoreDomainStores();
    return stores.names().join(',') === 'buildings,units,resources,jobs' &&
      stores.buildings.size === 0 && stores.units.size === 0 &&
      stores.resources.size === 0 && stores.jobs.size === 0;
  });

  check('stable-domain-ids', () => {
    const stores = new CoreDomainStores();
    return stores.buildings.create({ label:'A' }).id === 'building:00000001' &&
      stores.units.create({ label:'U' }).id === 'unit:00000001' &&
      stores.resources.create({ label:'R' }).id === 'resource:00000001' &&
      stores.jobs.create({ label:'J' }).id === 'transport-job:00000001';
  });

  check('domain-isolation', () => {
    const stores = new CoreDomainStores();
    const b = stores.buildings.create({ value:1 });
    return stores.buildings.has(b.id) && !stores.units.has(b.id) &&
      stores.resources.size === 0 && stores.jobs.size === 0;
  });

  check('snapshot-detached-and-frozen', () => {
    const stores = new CoreDomainStores();
    const b = stores.buildings.create({ nested:{ value:1 } });
    const snap = stores.snapshot();
    stores.buildings.update(b.id, item => { item.nested.value = 2; });
    return snap.buildings.items[b.id].nested.value === 1 &&
      Object.isFrozen(snap) && Object.isFrozen(snap.buildings.items[b.id].nested);
  });

  check('immutable-id-kind-and-duplicate-rejection', () => {
    const stores = new CoreDomainStores();
    const b = stores.buildings.create({});
    let idRejected = false;
    let kindRejected = false;
    let duplicateRejected = false;
    try { stores.buildings.update(b.id, item => { item.id = 'building:99999999'; }); } catch { idRejected = true; }
    try { stores.buildings.update(b.id, item => { item.kind = 'unit'; }); } catch { kindRejected = true; }
    try { stores.buildings.create({}, { id:b.id }); } catch { duplicateRejected = true; }
    return idRejected && kindRejected && duplicateRejected;
  });

  const pass = results.every(r => r.pass);
  return Object.freeze({ pass, results:Object.freeze(results.map(Object.freeze)) });
}
