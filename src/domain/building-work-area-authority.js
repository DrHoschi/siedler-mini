import { parseStableId } from '../world/stable-id.js';

const CAPABILITIES = Object.freeze({
  WOODCUTTER: Object.freeze({ shape: 'circle', defaultRadius: 2.5 }),
  QUARRY: Object.freeze({ shape: 'circle', defaultRadius: 2.5 }),
  FISHER: Object.freeze({ shape: 'circle', defaultRadius: 2.5 }),
  HUNTER: Object.freeze({ shape: 'circle', defaultRadius: 2.5 }),
});

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireBuildingId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'building') throw new TypeError(`invalid building id: ${value}`);
  return parsed.id;
}

function requireStores(domains) {
  const buildings = domains?.buildings;
  if (!buildings || buildings.kind !== 'building' || buildings.domain !== 'buildings') {
    throw new TypeError('building domain store required');
  }
  return buildings;
}

function requireMap(map) {
  if (!map || !Number.isFinite(map.width) || !Number.isFinite(map.height)) throw new TypeError('map bounds required');
  return map;
}

function capabilityFor(building) {
  const definitionId = String(building?.identity?.definitionId ?? '').trim().toUpperCase();
  return CAPABILITIES[definitionId] ?? null;
}

function normalizeArea(area, { buildingId, capability, map }) {
  if (!area || area.shape !== capability.shape) throw new TypeError('supported Work Area shape required');
  const cx = Number(area.cx);
  const cy = Number(area.cy);
  const radius = Number(area.radius);
  if (![cx, cy, radius].every(Number.isFinite) || !(radius > 0)) throw new TypeError('finite positive Work Area geometry required');
  const valid = cx - radius >= 0 && cy - radius >= 0 && cx + radius <= map.width && cy + radius <= map.height;
  return deepFreeze({ kind: 'building-work-area', buildingId, shape: capability.shape, cx, cy, radius, valid });
}

export class BuildingWorkAreaAuthority {
  #buildings;
  #map;

  constructor({ domains, map } = {}) {
    this.#buildings = requireStores(domains);
    this.#map = requireMap(map);
  }

  capability(buildingId) {
    const id = requireBuildingId(buildingId);
    const building = this.#buildings.get(id);
    if (!building) return deepFreeze({ eligible: false, buildingId: id, reason: 'BUILDING_NOT_FOUND' });
    const capability = capabilityFor(building);
    if (!capability) return deepFreeze({ eligible: false, buildingId: id, reason: 'WORK_AREA_NOT_SUPPORTED' });
    return deepFreeze({ eligible: true, buildingId: id, definitionId: building.identity.definitionId, ...capability });
  }

  project(buildingId) {
    const id = requireBuildingId(buildingId);
    const building = this.#buildings.get(id);
    const capability = this.capability(id);
    if (!capability.eligible) return deepFreeze({ kind: 'building-work-area-projection', buildingId: id, eligible: false, area: null, source: null });
    const source = building.workArea ? 'AUTHORITATIVE' : 'CAPABILITY_DEFAULT';
    const candidate = building.workArea ?? {
      shape: capability.shape,
      cx: building.position?.x,
      cy: building.position?.y,
      radius: capability.defaultRadius,
    };
    const area = normalizeArea(candidate, { buildingId: id, capability, map: this.#map });
    return deepFreeze({ kind: 'building-work-area-projection', buildingId: id, eligible: true, area, source });
  }

  validate(buildingId, candidate) {
    const id = requireBuildingId(buildingId);
    const capability = this.capability(id);
    if (!capability.eligible) return deepFreeze({ accepted: false, buildingId: id, reason: capability.reason, area: null });
    try {
      const area = normalizeArea(candidate, { buildingId: id, capability, map: this.#map });
      return deepFreeze({ accepted: area.valid, buildingId: id, reason: area.valid ? 'VALID' : 'OUT_OF_BOUNDS', area });
    } catch {
      return deepFreeze({ accepted: false, buildingId: id, reason: 'INVALID_GEOMETRY', area: null });
    }
  }

  commit(buildingId, candidate) {
    const validation = this.validate(buildingId, candidate);
    if (!validation.accepted) return deepFreeze({ status: 'REJECTED', ...validation });
    this.#buildings.update(validation.buildingId, draft => {
      draft.workArea = {
        kind: 'building-work-area',
        buildingId: validation.buildingId,
        shape: validation.area.shape,
        cx: validation.area.cx,
        cy: validation.area.cy,
        radius: validation.area.radius,
      };
    });
    return deepFreeze({ status: 'COMMITTED', buildingId: validation.buildingId, area: this.project(validation.buildingId).area });
  }

  static capabilities() {
    return deepFreeze({
      buildingBound: true,
      stableBuildingId: true,
      failClosedEligibility: true,
      authoritativeProjection: true,
      authoritativeBoundsValidation: true,
      controlledMutation: true,
      domainStorePersistence: true,
      legacyAuthority: false,
    });
  }
}

export const BuildingWorkAreaCapabilityContract = Object.freeze({
  supportedDefinitionIds: Object.freeze(Object.keys(CAPABILITIES)),
  capabilities: CAPABILITIES,
});
