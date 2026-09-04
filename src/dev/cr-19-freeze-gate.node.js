import { runCr19FreezeGate } from './cr-19-freeze-gate.js';
const report=runCr19FreezeGate();console.log(`CR-19 CELL RESERVATION FOUNDATION FREEZE GATE: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);if(!report.pass){for(const r of report.results.filter(x=>!x.pass))console.error(r);process.exitCode=1;}
