import { runCr21bFreezeGate } from './cr-21b-freeze-gate.js';
const report=runCr21bFreezeGate();
console.log(`CR-21B DETERMINISTIC RESERVATION EXECUTION CYCLE FREEZE GATE: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
