function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function asFiniteNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${name} must be finite`);
  return number;
}

function requireId(value, name) {
  const id = String(value ?? '').trim();
  if (!id) throw new TypeError(`${name} required`);
  return id;
}

function optionalString(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function projectPosition(source, name) {
  if (!source || typeof source !== 'object') throw new TypeError(`${name} required`);
  return deepFreeze({
    x: asFiniteNumber(source.x, `${name}.x`),
    y: asFiniteNumber(source.y, `${name}.y`)
  });
}

function sourcePosition(record, name) {
  const source = record?.position
    ?? record?.world
    ?? record?.placement?.world
    ?? record?.lifecycle?.position;
  return projectPosition(source, `${name}.position`);
}

function stableEntries(items, projector) {
  if (items == null) return Object.freeze([]);
  if (typeof items !== 'object' || Array.isArray(items)) throw new TypeError('items must be an object');
  return Object.freeze(
    Object.values(items)
      .map(projector)
      .sort((a, b) => a.id.localeCompare(b.id))
  );
}

export function projectMap(mapSnapshot) {
  if (!mapSnapshot || typeof mapSnapshot !== 'object') throw new TypeError('map snapshot required');
  const map = mapSnapshot.map;
  if (!map || typeof map !== 'object') throw new TypeError('map snapshot.map required');

  const cells = Array.isArray(mapSnapshot.cells) ? mapSnapshot.cells : [];
  const projectedCells = cells.map(cell => deepFreeze({
    id: requireId(cell?.id, 'cell.id'),
    grid: deepFreeze({
      x: asFiniteNumber(cell?.grid?.x, 'cell.grid.x'),
      y: asFiniteNumber(cell?.grid?.y, 'cell.grid.y')
    }),
    world: projectPosition(cell?.world, 'cell.world'),
    tileId: requireId(cell?.tileId, 'cell.tileId')
  })).sort((a, b) => a.id.localeCompare(b.id));

  return deepFreeze({
    id: requireId(map.id, 'map.id'),
    kind: 'map',
    width: asFiniteNumber(map.width, 'map.width'),
    height: asFiniteNumber(map.height, 'map.height'),
    cellSize: asFiniteNumber(map.cellSize, 'map.cellSize'),
    origin: projectPosition(map.origin, 'map.origin'),
    cells: Object.freeze(projectedCells)
  });
}

export function projectBuildings(buildingSnapshot) {
  const items = buildingSnapshot?.items ?? buildingSnapshot;
  return stableEntries(items, record => {
    const identity = record?.identity ?? {};
    const lifecycle = record?.lifecycle ?? {};
    return deepFreeze({
      id: requireId(identity.buildingId ?? record?.id, 'building.id'),
      kind: 'building',
      definitionId: optionalString(identity.definitionId ?? record?.definitionId),
      position: sourcePosition(record, 'building'),
      visibleState: optionalString(lifecycle.state ?? lifecycle.status ?? record?.visibleState ?? record?.state)
    });
  });
}

export function projectPersons(personSnapshot) {
  const items = personSnapshot?.items ?? personSnapshot;
  return stableEntries(items, record => {
    const identity = record?.identity ?? {};
    return deepFreeze({
      id: requireId(identity.personId ?? record?.personId ?? record?.id, 'person.id'),
      kind: 'person',
      position: sourcePosition(record, 'person'),
      visibleState: optionalString(
        record?.visibleState
        ?? record?.state
        ?? identity.existenceState
      )
    });
  });
}

export function projectGameState({ map, buildings = { items: {} }, persons = { items: {} } } = {}) {
  return deepFreeze({
    version: 1,
    map: projectMap(map),
    buildings: projectBuildings(buildings),
    persons: projectPersons(persons)
  });
}
