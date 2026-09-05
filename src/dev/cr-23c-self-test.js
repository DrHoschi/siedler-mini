import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';
import { HousingCapacityOccupancy } from '../domain/housing-capacity-occupancy.js';

export function runCr23cSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const a = ResidentHomeAssignmentContract.define({ personId: 'unit:00000001', state: 'ASSIGNED', homeBuildingId: 'building:00000010' });
  const b = ResidentHomeAssignmentContract.define({ personId: 'unit:00000002', state: 'ASSIGNED', homeBuildingId: 'building:00000010' });
  const other = ResidentHomeAssignmentContract.define({ personId: 'unit:00000003', state: 'ASSIGNED', homeBuildingId: 'building:00000011' });
  const unassigned = ResidentHomeAssignmentContract.define({ personId: 'unit:00000004' });

  check('capacity-contract-is-building-scoped-and-immutable', () => {
    const capacity = HousingCapacityOccupancy.defineCapacity({ buildingId: 'building:00000010', capacity: 2 });
    return capacity.kind === 'housing-capacity'
      && capacity.buildingId === 'building:00000010'
      && capacity.capacity === 2
      && Object.isFrozen(capacity);
  });

  check('capacity-zero-means-no-available-housing-slots', () => {
    const capacity = HousingCapacityOccupancy.defineCapacity({ buildingId: 'building:00000010', capacity: 0 });
    const summary = HousingCapacityOccupancy.summarize({ capacityContract: capacity, assignments: [] });
    return summary.occupancy === 0 && summary.availableSlots === 0 && summary.withinCapacity === true
      && HousingCapacityOccupancy.canAssign({ capacityContract: capacity, assignments: [] }) === false;
  });

  check('occupancy-is-derived-only-from-assigned-home-references', () => {
    const capacity = HousingCapacityOccupancy.defineCapacity({ buildingId: 'building:00000010', capacity: 3 });
    const summary = HousingCapacityOccupancy.summarize({ capacityContract: capacity, assignments: [a, b, other, unassigned] });
    return summary.occupancy === 2 && summary.availableSlots === 1 && summary.withinCapacity === true;
  });

  check('capacity-boundary-allows-exactly-capacity-and-rejects-overflow', () => {
    const capacity = HousingCapacityOccupancy.defineCapacity({ buildingId: 'building:00000010', capacity: 2 });
    const full = HousingCapacityOccupancy.assertWithinCapacity({ capacityContract: capacity, assignments: [a, b] });
    const overflow = ResidentHomeAssignmentContract.define({ personId: 'unit:00000005', state: 'ASSIGNED', homeBuildingId: 'building:00000010' });
    return full.occupancy === 2
      && HousingCapacityOccupancy.canAssign({ capacityContract: capacity, assignments: [a, b] }) === false
      && rejects(() => HousingCapacityOccupancy.assertWithinCapacity({ capacityContract: capacity, assignments: [a, b, overflow] }));
  });

  check('invalid-capacity-or-building-id-is-rejected', () =>
    rejects(() => HousingCapacityOccupancy.defineCapacity({ buildingId: 'unit:00000010', capacity: 2 }))
      && rejects(() => HousingCapacityOccupancy.defineCapacity({ buildingId: 'building:00000010', capacity: -1 }))
      && rejects(() => HousingCapacityOccupancy.defineCapacity({ buildingId: 'building:00000010', capacity: 1.5 }))
  );

  check('occupancy-summary-is-deterministic-and-immutable', () => {
    const capacity = HousingCapacityOccupancy.defineCapacity({ buildingId: 'building:00000010', capacity: 3 });
    const x = HousingCapacityOccupancy.summarize({ capacityContract: capacity, assignments: [a, b, other] });
    const y = HousingCapacityOccupancy.summarize({ capacityContract: capacity, assignments: [a, b, other] });
    return Object.isFrozen(x) && JSON.stringify(x) === JSON.stringify(y);
  });

  check('cr23c-does-not-add-resident-list-population-family-workforce-or-production-state', () => {
    const capacity = HousingCapacityOccupancy.defineCapacity({ buildingId: 'building:00000010', capacity: 2 });
    const summary = HousingCapacityOccupancy.summarize({ capacityContract: capacity, assignments: [a] });
    const forbidden = ['residents','residentIds','household','parent','child','birthTimer','populationGrowth','profession','worker','job','tool','clothing','production','stock','storage','inventory','construction','transport','position','route'];
    return forbidden.every(key => !(key in capacity) && !(key in summary));
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
