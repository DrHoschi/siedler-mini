import { runCr14FreezeGate } from './cr-14-freeze-gate.js';

const report=runCr14FreezeGate();
for(const result of report.results) console.log(`${result.pass?'✅':'❌'} ${result.name}${result.error?` — ${result.error}`:''}`);
console.log(`\n${report.pass?'✅':'❌'} CR-14 CELL OCCUPANCY & ENTRY ARBITRATION FOUNDATION FREEZE GATE: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass) process.exitCode=1;
