function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function finite(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${name} must be finite`);
  return number;
}

function positive(value, name) {
  const number = finite(value, name);
  if (!(number > 0)) throw new TypeError(`${name} must be > 0`);
  return number;
}

function point(position, scale, offset) {
  return {
    x: offset.x + finite(position?.x, 'position.x') * scale,
    y: offset.y + finite(position?.y, 'position.y') * scale
  };
}

function sortById(entries) {
  return [...(entries ?? [])].sort((a, b) => String(a?.id ?? '').localeCompare(String(b?.id ?? '')));
}

const DEFAULT_PALETTE = Object.freeze({
  worldGround: '#334a35',
  gridCell: '#708070',
  building: '#d09a52',
  person: '#f0e7d2'
});

function color(value, fallback, name) {
  const normalized = String(value ?? fallback).trim();
  if (!normalized) throw new TypeError(`${name} required`);
  return normalized;
}

export function buildWorldRenderCommands(projection, {
  cellPixels = 32,
  offset = { x: 16, y: 16 },
  buildingSize = 18,
  personRadius = 5,
  palette = DEFAULT_PALETTE
} = {}) {
  if (!projection || typeof projection !== 'object') throw new TypeError('projection required');
  if (!projection.map || projection.map.kind !== 'map') throw new TypeError('projection.map required');

  const scale = positive(cellPixels, 'cellPixels');
  const originOffset = {
    x: finite(offset?.x ?? 0, 'offset.x'),
    y: finite(offset?.y ?? 0, 'offset.y')
  };
  const bSize = positive(buildingSize, 'buildingSize');
  const pRadius = positive(personRadius, 'personRadius');
  const colors = {
    worldGround: color(palette?.worldGround, DEFAULT_PALETTE.worldGround, 'palette.worldGround'),
    gridCell: color(palette?.gridCell, DEFAULT_PALETTE.gridCell, 'palette.gridCell'),
    building: color(palette?.building, DEFAULT_PALETTE.building, 'palette.building'),
    person: color(palette?.person, DEFAULT_PALETTE.person, 'palette.person')
  };
  const commands = [];

  const widthPx = projection.map.width * scale;
  const heightPx = projection.map.height * scale;
  commands.push({ type: 'clear' });
  commands.push({
    type: 'fillRect',
    role: 'world-ground',
    fillStyle: colors.worldGround,
    x: originOffset.x,
    y: originOffset.y,
    width: widthPx,
    height: heightPx
  });

  for (const cell of sortById(projection.map.cells)) {
    const cellPoint = point(cell.world, scale, originOffset);
    commands.push({
      type: 'strokeRect',
      role: 'grid-cell',
      sourceId: cell.id,
      strokeStyle: colors.gridCell,
      x: cellPoint.x,
      y: cellPoint.y,
      width: scale,
      height: scale
    });
  }

  for (const building of sortById(projection.buildings)) {
    const buildingPoint = point(building.position, scale, originOffset);
    commands.push({
      type: 'fillRect',
      role: 'building',
      sourceId: building.id,
      visibleState: building.visibleState ?? null,
      fillStyle: colors.building,
      x: buildingPoint.x - bSize / 2,
      y: buildingPoint.y - bSize / 2,
      width: bSize,
      height: bSize
    });
  }

  for (const person of sortById(projection.persons)) {
    const personPoint = point(person.position, scale, originOffset);
    commands.push({
      type: 'fillCircle',
      role: 'person',
      sourceId: person.id,
      visibleState: person.visibleState ?? null,
      fillStyle: colors.person,
      x: personPoint.x,
      y: personPoint.y,
      radius: pRadius
    });
  }

  return deepFreeze(commands.map(command => deepFreeze(command)));
}

function requireContext(ctx) {
  const required = ['clearRect', 'fillRect', 'strokeRect', 'beginPath', 'arc', 'fill'];
  if (!ctx || required.some(name => typeof ctx[name] !== 'function')) {
    throw new TypeError('CanvasRenderingContext2D-compatible context required');
  }
  return ctx;
}

export function executeWorldRenderCommands(ctx, commands, { width, height } = {}) {
  const context = requireContext(ctx);
  if (!Array.isArray(commands)) throw new TypeError('commands must be an array');
  const canvasWidth = finite(width ?? context.canvas?.width ?? 0, 'width');
  const canvasHeight = finite(height ?? context.canvas?.height ?? 0, 'height');

  for (const command of commands) {
    switch (command?.type) {
      case 'clear':
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        break;
      case 'fillRect':
        if (command.fillStyle) context.fillStyle = command.fillStyle;
        context.fillRect(command.x, command.y, command.width, command.height);
        break;
      case 'strokeRect':
        if (command.strokeStyle) context.strokeStyle = command.strokeStyle;
        context.strokeRect(command.x, command.y, command.width, command.height);
        break;
      case 'fillCircle':
        if (command.fillStyle) context.fillStyle = command.fillStyle;
        context.beginPath();
        context.arc(command.x, command.y, command.radius, 0, Math.PI * 2);
        context.fill();
        break;
      default:
        throw new TypeError(`unsupported render command: ${command?.type}`);
    }
  }

  return commands.length;
}

export function renderProjectedWorldToCanvas(ctx, projection, options = {}) {
  const commands = buildWorldRenderCommands(projection, options);
  executeWorldRenderCommands(ctx, commands, options);
  return commands;
}
