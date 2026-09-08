import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { AuthoritativeConstructionPlacementContract } from '../domain/authoritative-construction-placement-contract.js';

function createFixture() {
  const world = new WorldStore();
  const map = new MapStructure(world, { width: 4, height: 3, cellSize: 1, origin: { x: 0, y: 0 } });
  const domains = new CoreDomainStores();

  const occupiedBuildingId = domains.buildings.allocateId();
  domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({
      buildingId: occupiedBuildingId,
      definitionId: 'WOODCUTTER',
    }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId: occupiedBuildingId }),
    position: { x: 1.2, y: 1.3 },
  }, { id: occupiedBuildingId });

  const retiredBuildingId = domains.buildings.allocateId();
  domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({
      buildingId: retiredBuildingId,
      definitionId: 'STOREHOUSE',
    }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId: retiredBuildingId, state: 'RETIRED' }),
    position: { x: 2.2, y: 1.1 },
  }, { id: retiredBuildingId });

  return {
    world,
    map,
    domains,
    occupiedBuildingId,
    retiredBuildingId,
    contract: new AuthoritativeConstructionPlacementContract({ map, domains }),
  };
}

export function runIm16aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  check('accepts-real-empty-map-cell-with-immutable-valid-result', () => {
    const { map, contract } = createFixture();
    const cellId = map.cellIdAt(0, 0);
    const result = contract.evaluate({ definitionId: '  HOUSE_SMALL  ', cellId });
    return result.kind === 'authoritative-construction-placement-evaluation'
      && result.valid === true
      && result.reason === 'VALID'
      && result.candidate.definitionId === 'HOUSE_SMALL'
      && result.candidate.cellId === cellId
      && result.cell.cellId === cellId
      && result.cell.grid.x === 0
      && result.cell.grid.y === 0
      && result.occupiedBy === null
      && Object.isFrozen(result)
      && Object.isFrozen(result.candidate)
      && Object.isFrozen(result.cell)
      && Object.isFrozen(result.cell.grid)
      && Object.isFrozen(result.cell.world);
  });

  check('rejects-nonexistent-cell-as-invalid-without-throwing', () => {
    const { contract } = createFixture();
    const result = contract.evaluate({ definitionId: 'HOUSE_SMALL', cellId: 'cell:99999999' });
    return result.valid === false
      && result.reason === 'TARGET_CELL_NOT_FOUND'
      && result.cell === null
      && result.candidate.cellId === 'cell:99999999';
  });

  check('existing-building-cell-is-invalid-and-identifies-authoritative-blocker', () => {
    const { map, contract, occupiedBuildingId } = createFixture();
    const cellId = map.cellIdAt(1, 1);
    const result = contract.evaluate({ definitionId: 'HOUSE_SMALL', cellId });
    return result.valid === false
      && result.reason === 'TARGET_CELL_OCCUPIED'
      && result.occupiedBy.kind === 'building'
      && result.occupiedBy.id === occupiedBuildingId
      && Object.isFrozen(result.occupiedBy);
  });

  check('retired-building-does-not-block-placement', () => {
    const { map, contract } = createFixture();
    const result = contract.evaluate({ definitionId: 'HOUSE_SMALL', cellId: map.cellIdAt(2, 1) });
    return result.valid === true && result.reason === 'VALID';
  });

  check('requires-definition-and-cell-references-but-does-not-invent-definition-registry', () => {
    const { map, contract } = createFixture();
    const cellId = map.cellIdAt(0, 0);
    const unknownButWellFormed = contract.evaluate({ definitionId: 'FUTURE_AUTHORITATIVE_DEFINITION', cellId });
    return rejects(() => contract.evaluate({ definitionId: '', cellId }))
      && rejects(() => contract.evaluate({ definitionId: '   ', cellId }))
      && rejects(() => contract.evaluate({ definitionId: 'HOUSE_SMALL', cellId: '' }))
      && unknownButWellFormed.valid === true
      && unknownButWellFormed.candidate.definitionId === 'FUTURE_AUTHORITATIVE_DEFINITION';
  });

  check('evaluation-does-not-mutate-world-map-or-building-store', () => {
    const { world, map, domains, contract } = createFixture();
    const worldBefore = JSON.stringify(world.snapshot());
    const mapBefore = JSON.stringify(map.snapshot());
    const buildingsBefore = JSON.stringify(domains.buildings.snapshot());
    contract.evaluate({ definitionId: 'HOUSE_SMALL', cellId: map.cellIdAt(0, 0) });
    contract.evaluate({ definitionId: 'HOUSE_SMALL', cellId: map.cellIdAt(1, 1) });
    contract.evaluate({ definitionId: 'HOUSE_SMALL', cellId: 'cell:99999999' });
    return JSON.stringify(world.snapshot()) === worldBefore
      && JSON.stringify(map.snapshot()) === mapBefore
      && JSON.stringify(domains.buildings.snapshot()) === buildingsBefore;
  });

  check('im16a-does-not-expose-commit-register-cost-ui-or-pointer-capability', () => {
    const keys = Object.getOwnPropertyNames(AuthoritativeConstructionPlacementContract.prototype).sort();
    const forbidden = ['commit', 'confirm', 'register', 'create', 'place', 'deduct', 'cost', 'pointer', 'preview', 'ghost', 'cancel'];
    const source = AuthoritativeConstructionPlacementContract.toString().toLowerCase();
    return keys.join(',') === 'constructor,evaluate'
      && forbidden.every(name => !keys.includes(name))
      && !source.includes('.create(')
      && !source.includes('.update(')
      && !source.includes('.remove(');
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results: Object.freeze(results.map(Object.freeze)),
  });
}
