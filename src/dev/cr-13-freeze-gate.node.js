import { runCr13FreezeGate } from './cr-13-freeze-gate.js';

const report=runCr13FreezeGate();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`\n❌ CR-13 Dynamic Route Validity Foundation Freeze Gate FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('\n✅ CR-13 DYNAMIC ROUTE VALIDITY FOUNDATION FREEZE GATE: PASS / 0 BLOCKER');
