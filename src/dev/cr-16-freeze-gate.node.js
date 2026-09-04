import { runCr16FreezeGate } from './cr-16-freeze-gate.js';

const report=runCr16FreezeGate();
for(const result of report.results) console.log(`${result.pass?'✅':'❌'} ${result.name}${result.error?` — ${result.error}`:''}`);
console.log(`\n${report.pass?'✅':'❌'} CR-16 TRAFFIC DEADLOCK FOUNDATION FREEZE GATE: ${report.pass?'PASS':'FAIL'} / ${report.blockerCount} BLOCKER`);
if(!report.pass) process.exitCode=1;
