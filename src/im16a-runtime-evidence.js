import { RuntimeConfig } from './runtime/config.js?v=im16a-1';
import { AuthoritativeConstructionPlacementContract } from './domain/authoritative-construction-placement-contract.js?v=im16a-1';

const output = document.querySelector('#test-status');
const expectedBuildIdentity = 'IM-16A-AUTHORITATIVE-CONSTRUCTION-PLACEMENT-CONTRACT';

function firstEmptyCell(map, domains) {
  const mapSnapshot = map.snapshot();
  const buildings = domains.buildings.snapshot()?.items ?? {};
  const occupied = new Set();
  const mapRecord = mapSnapshot.map;
  for (const record of Object.values(buildings)) {
    if (String(record?.lifecycle?.state ?? 'EXISTS').toUpperCase() !== 'EXISTS') continue;
    const x = Number(record?.position?.x);
    const y = Number(record?.position?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const gx = Math.floor((x - mapRecord.origin.x) / mapRecord.cellSize);
    const gy = Math.floor((y - mapRecord.origin.y) / mapRecord.cellSize);
    const cellId = map.cellIdAt(gx, gy);
    if (cellId) occupied.add(cellId);
  }
  return mapSnapshot.cells.find(cell => !occupied.has(cell.id))?.id ?? null;
}

function firstOccupiedCell(map, domains) {
  const mapSnapshot = map.snapshot();
  const mapRecord = mapSnapshot.map;
  const buildings = domains.buildings.snapshot()?.items ?? {};
  for (const buildingId of Object.keys(buildings).sort()) {
    const record = buildings[buildingId];
    if (String(record?.lifecycle?.state ?? 'EXISTS').toUpperCase() !== 'EXISTS') continue;
    const x = Number(record?.position?.x);
    const y = Number(record?.position?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const gx = Math.floor((x - mapRecord.origin.x) / mapRecord.cellSize);
    const gy = Math.floor((y - mapRecord.origin.y) / mapRecord.cellSize);
    const cellId = map.cellIdAt(gx, gy);
    if (cellId) return Object.freeze({ cellId, buildingId });
  }
  return null;
}

function evaluateEvidence() {
  const runtime = window.CleanRuntime;
  if (!runtime?.map || !runtime?.domains) throw new TypeError('IM-16A active runtime map/domains required');
  const contract = new AuthoritativeConstructionPlacementContract({
    map: runtime.map,
    domains: runtime.domains,
  });

  const emptyCellId = firstEmptyCell(runtime.map, runtime.domains);
  const occupied = firstOccupiedCell(runtime.map, runtime.domains);
  const valid = emptyCellId
    ? contract.evaluate({ definitionId: 'IM16A_EVIDENCE_BUILDING', cellId: emptyCellId })
    : null;
  const blocked = occupied
    ? contract.evaluate({ definitionId: 'IM16A_EVIDENCE_BUILDING', cellId: occupied.cellId })
    : null;
  const missing = contract.evaluate({ definitionId: 'IM16A_EVIDENCE_BUILDING', cellId: 'cell:99999999' });

  const buildIdentityPass = RuntimeConfig.build === expectedBuildIdentity;
  const contractPass = Boolean(
    valid?.valid === true
    && valid.reason === 'VALID'
    && blocked?.valid === false
    && blocked.reason === 'TARGET_CELL_OCCUPIED'
    && blocked.occupiedBy?.id === occupied?.buildingId
    && missing.valid === false
    && missing.reason === 'TARGET_CELL_NOT_FOUND'
    && Object.isFrozen(valid)
    && Object.isFrozen(blocked)
    && Object.isFrozen(missing)
  );
  const pass = buildIdentityPass && contractPass;

  if (output) {
    output.textContent = `IM-16A — Authoritative Construction Placement Contract — ${pass ? 'PASS' : 'FAIL'} — Empty Cell ${valid?.valid ? 'VALID' : 'FAIL'} — Occupied Cell ${blocked?.reason ?? 'FAIL'} — Missing Cell ${missing.reason} — Build Identity ${buildIdentityPass ? 'PASS' : `FAIL [actual: ${RuntimeConfig.build}]`} — no Building creation / no UI Placement Mode`;
    output.dataset.pass = pass ? 'true' : 'false';
  }

  return Object.freeze({
    pass,
    buildIdentityPass,
    contractPass,
    expectedBuildIdentity,
    actualBuildIdentity: RuntimeConfig.build,
    valid,
    blocked,
    missing,
  });
}

const evidence = evaluateEvidence();
window.IM16AConstructionPlacementEvidence = Object.freeze({
  evaluate: evaluateEvidence,
  current: evidence,
});

console.info('[IM-16A] Authoritative Construction Placement Contract', evidence);
