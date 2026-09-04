import { runCr16aSelfTest } from './cr-16a-self-test.js';
import { runCr16bSelfTest } from './cr-16b-self-test.js';

const cr16a=runCr16aSelfTest();
const cr16b=runCr16bSelfTest();
const results=[{name:'cr16a-regression-pass',pass:cr16a.pass&&cr16a.blockerCount===0},...cr16b.results];
for(const result of results) console.log(`${result.pass?'✅':'❌'} ${result.name}${result.error?` — ${result.error}`:''}`);
const blockerCount=results.filter(result=>!result.pass).length;
console.log(`\n${blockerCount===0?'✅':'❌'} CR-16B DETERMINISTIC DEADLOCK DETECTION: ${blockerCount===0?'PASS':'FAIL'} / ${blockerCount} BLOCKER`);
if(blockerCount>0) process.exitCode=1;
