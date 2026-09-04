import { runCr21aFreezeGate } from './cr-21a-freeze-gate.js';
const report=runCr21aFreezeGate();
console.log(`CR-21A NEXT CELL RESERVATION INTENT CONTRACT FREEZE GATE: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
