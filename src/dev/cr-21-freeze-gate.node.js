import { runCr21FreezeGate } from './cr-21-freeze-gate.js';
const report=runCr21FreezeGate();
console.log(`CR-21 RESERVATION-CONTROLLED TRAFFIC EXECUTION FOUNDATION FREEZE GATE: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
