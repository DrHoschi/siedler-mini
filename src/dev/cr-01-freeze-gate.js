export function runCr01FreezeGate({ world, map, domains }) {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  check('world-map-ownership', () => {
    const ids = world.ids();
    const kinds = ids.map(id => world.get(id)?.kind);
    const counts = kinds.reduce((acc, kind) => {
      acc[kind] = (acc[kind] || 0) + 1;
      return acc;
    }, {});
    return counts.map === 1 && counts.tile === 1 && counts.cell === 64 && Object.keys(counts).every(k => ['map','tile','cell'].includes(k));
  });

  check('map-reference-integrity', () => {
    const snap = map.snapshot();
    if (!snap.map || snap.cells.length !== 64) return false;
    return snap.cells.every(cell =>
      cell.mapId === map.mapId &&
      !!world.get(cell.tileId) &&
      world.get(cell.tileId).kind === 'tile'
    );
  });

  check('domain-stores-empty-and-separated', () => {
    const names = domains.names();
    if (names.join(',') !== 'buildings,units,resources,jobs') return false;
    return names.every(name => domains[name].size === 0 && domains[name].snapshot().revision === 0);
  });

  check('snapshots-are-frozen', () => {
    const worldSnap = world.snapshot();
    const mapSnap = map.snapshot();
    const domainSnap = domains.snapshot();
    return Object.isFrozen(worldSnap) && Object.isFrozen(mapSnap) && Object.isFrozen(domainSnap)
      && Object.isFrozen(domainSnap.buildings) && Object.isFrozen(domainSnap.units)
      && Object.isFrozen(domainSnap.resources) && Object.isFrozen(domainSnap.jobs);
  });

  check('no-productive-gameplay-state', () => {
    return domains.buildings.size === 0 && domains.units.size === 0 && domains.resources.size === 0 && domains.jobs.size === 0;
  });

  const pass = results.every(r => r.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
