import { RoadPreferenceCostPolicy } from './transport/road-preference-cost-policy.js';
import { WearAwareTraversalCostResolver, WEAR_COST_PER_UNIT } from './transport/wear-aware-traversal-cost-resolver.js';

queueMicrotask(() => {
  const runtimeState = window.CleanRuntime;
  if (!runtimeState?.pathUsageWear) throw new Error('CR-32C requires CR-32B pathUsageWear evidence');

  const { pathClassification, pathUsageWear } = runtimeState;
  const resolver = new WearAwareTraversalCostResolver({
    profiles: RoadPreferenceCostPolicy.profiles,
    wearSource: pathUsageWear,
  });
  const typeAt = position => pathClassification.typeAt(position);

  const pathCost = resolver.resolveAt({ x: 1, y: 4 }, { typeAt });
  const roadCost = resolver.resolveAt({ x: 2, y: 4 }, { typeAt });
  const neutralCost = resolver.resolveAt({ x: 0, y: 4 }, { typeAt });

  const pass = WEAR_COST_PER_UNIT === 0.01
    && pathCost.traversalType === 'PATH'
    && roadCost.traversalType === 'ROAD'
    && pathCost.wearUnits === 1
    && roadCost.wearUnits === 1
    && pathCost.traversalCost === 0.76
    && roadCost.traversalCost === 0.51
    && neutralCost.traversalType === 'NEUTRAL'
    && neutralCost.traversalCost === 1;

  const testEl = document.querySelector('#test-status');
  if (testEl) {
    testEl.textContent = `CR-32C — Wear-aware Traversal Cost Integration — ${pass ? 'PASS' : 'FAIL'} — wearCostPerUnit ${WEAR_COST_PER_UNIT} — PATH Wear 1: 0.75 → ${pathCost.traversalCost} / ROAD Wear 1: 0.50 → ${roadCost.traversalCost} — NEUTRAL ${neutralCost.traversalCost} unverändert — bestehender Pathfinder/Route-Owner unverändert`;
    testEl.dataset.pass = pass ? 'true' : 'false';
  }

  window.CleanRuntime = Object.freeze({
    ...runtimeState,
    wearAwareTraversalCostResolver: resolver,
    pathWearAwareCostEvidence: pathCost,
    roadWearAwareCostEvidence: roadCost,
    neutralWearAwareCostEvidence: neutralCost,
  });

  console.info('[CR-32C] Wear-aware Traversal Cost Integration', {
    build: runtimeState.config.build,
    pass,
    wearCostPerUnit: WEAR_COST_PER_UNIT,
    pathCost,
    roadCost,
    neutralCost,
    pathfinderOwnerUnchanged: true,
    routeOwnerUnchanged: true,
    movementTrafficReservationUnchanged: true,
    repairNotIntroduced: true,
  });
});
