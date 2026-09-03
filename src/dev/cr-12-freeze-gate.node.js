import { runCr12FreezeGate } from './cr-12-freeze-gate.js';

const report=runCr12FreezeGate();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`\n❌ CR-12 Freeze Gate FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('\n✅ CR-12 TRAVERSABILITY / OBSTACLE FOUNDATION FREEZE GATE: PASS / 0 BLOCKER');
