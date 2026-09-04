import { runCr17FreezeGate } from './cr-17-freeze-gate.js';
const report=runCr17FreezeGate();
console.log(`CR-17 DEADLOCK RECOVERY FOUNDATION FREEZE GATE: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
