import { runCr20FreezeGate } from './cr-20-freeze-gate.js';
const report=runCr20FreezeGate();
console.log(`CR-20 RESERVATION LIFECYCLE FOUNDATION FREEZE GATE: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
