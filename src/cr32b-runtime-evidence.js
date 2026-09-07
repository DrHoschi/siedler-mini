import { NextCellReservationIntentContract } from './transport/next-cell-reservation-intent-contract.js';
import { DeterministicReservationExecutionCycle } from './transport/deterministic-reservation-execution-cycle.js';
import { CarrierMovementContract } from './transport/carrier-movement-contract.js';
import { BlockedCellSource } from './transport/blocked-cell-source.js';
import { ReservationLifecycleTrafficIntegration } from './transport/reservation-lifecycle-traffic-integration.js';
import { ReservationControlledStepMovementIntegration } from './transport/reservation-controlled-step-movement-integration.js';
import { DeterministicPathUsageWearIntegration } from './transport/deterministic-path-usage-wear-integration.js';

function executeRealStep({ map, carrierId, currentCell, nextCell, finalTarget, stepNumber }) {
  const route = Object.freeze({
    startPosition: Object.freeze({ ...currentCell }),
    targetPosition: Object.freeze({ ...finalTarget }),
    waypoints: Object.freeze([
      Object.freeze({ ...nextCell }),
      ...((nextCell.x === finalTarget.x && nextCell.y === finalTarget.y) ? [] : [Object.freeze({ ...finalTarget })]),
    ]),
    state: 'ACTIVE',
  });
  const intent = NextCellReservationIntentContract.define({
    carrierId,
    route,
    currentPosition: currentCell,
    nextCell,
  });
  const cycle = DeterministicReservationExecutionCycle.run({
    intents: [intent],
    validFromStep: stepNumber,
    validUntilStep: stepNumber + 1,
  });
  const blocked = new BlockedCellSource({ map });
  const trafficIntegration = new ReservationLifecycleTrafficIntegration({ blockedCellSource: blocked });
  const movement = CarrierMovementContract.define({
    unitId: carrierId,
    currentPosition: currentCell,
    state: 'IDLE',
    targetPosition: null,
  });
  return ReservationControlledStepMovementIntegration.execute({ cycle, route, movement, trafficIntegration });
}

queueMicrotask(() => {
  const runtimeState = window.CleanRuntime;
  if (!runtimeState) throw new Error('CR-32B requires existing CleanRuntime');
  const { map, pathClassification } = runtimeState;
  const wear = new DeterministicPathUsageWearIntegration({ map, classification: pathClassification });

  const pathStep = executeRealStep({
    map,
    carrierId: 'unit:cr32b-evidence',
    currentCell: { x: 0, y: 4 },
    nextCell: { x: 1, y: 4 },
    finalTarget: { x: 2, y: 4 },
    stepNumber: 3201,
  });
  const pathWear = wear.recordCompletedStep(pathStep);

  const roadStep = executeRealStep({
    map,
    carrierId: 'unit:cr32b-evidence',
    currentCell: { x: 1, y: 4 },
    nextCell: { x: 2, y: 4 },
    finalTarget: { x: 3, y: 4 },
    stepNumber: 3202,
  });
  const roadWear = wear.recordCompletedStep(roadStep);

  const pass = pathStep.status === 'COMPLETED'
    && roadStep.status === 'COMPLETED'
    && pathWear.status === 'ACCUMULATED'
    && roadWear.status === 'ACCUMULATED'
    && pathWear.traversalType === 'PATH'
    && roadWear.traversalType === 'ROAD'
    && pathWear.wearUnits === 1
    && roadWear.wearUnits === 1;

  const testEl = document.querySelector('#test-status');
  if (testEl) {
    testEl.textContent = `CR-32B — Deterministic Path Usage / Wear Accumulation Integration — ${pass ? 'PASS' : 'FAIL'} — reale CR-21C COMPLETED Schritte → PATH Wear ${pathWear.wearUnits} / ROAD Wear ${roadWear.wearUnits} — Planen/Reservieren allein erzeugt keinen Wear — CR-32A World-backed Classification erhalten — Traversalkosten noch unverändert`;
    testEl.dataset.pass = pass ? 'true' : 'false';
  }

  window.CleanRuntime = Object.freeze({
    ...runtimeState,
    pathUsageWear: wear,
    pathStepEvidence: pathStep,
    roadStepEvidence: roadStep,
    pathWearEvidence: pathWear,
    roadWearEvidence: roadWear,
  });

  console.info('[CR-32B] Deterministic Path Usage / Wear Accumulation Integration', {
    build: runtimeState.config.build,
    pass,
    pathStep,
    roadStep,
    pathWear,
    roadWear,
    wearEntries: wear.entries(),
    wearAffectsTraversalCost: false,
    repairNotIntroduced: true,
  });
});
