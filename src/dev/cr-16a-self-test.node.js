import { runCr16aSelfTest } from './cr-16a-self-test.js';
import { runCr15FreezeGate } from './cr-15-freeze-gate.js';

const cr15=runCr15FreezeGate();
const cr16a=runCr16aSelfTest();
const results=[{name:'cr15-freeze-regression-pass',pass:cr15.pass&&cr15.blockerCount===0},...cr16a.results];
for(const result of results) console.log(`${result.pass?'✅':'❌'} ${result.name}${result.error?` — ${result.error}`:''}`);
const blockerCount=results.filter(result=>!result.pass).length;
console.log(`\n${blockerCount===0?'✅':'❌'} CR-16A WAIT DEPENDENCY CONTRACT: ${blockerCount===0?'PASS':'FAIL'} / ${blockerCount} BLOCKER`);
if(blockerCount>0) process.exitCode=1;
