import { runCr22bFreezeGate } from './cr-22b-freeze-gate.js';
const report = runCr22bFreezeGate();
console.log(`CR-22B BUILDING LIFECYCLE STATE CONTRACT FREEZE GATE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
