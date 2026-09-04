import { runCr16bSelfTest } from './cr-16b-self-test.js';
import { runCr16cSelfTest } from './cr-16c-self-test.js';

const cr16b=runCr16bSelfTest();
const cr16c=runCr16cSelfTest();
const results=[{name:'cr16b-regression-pass',pass:cr16b.pass&&cr16b.blockerCount===0},...cr16c.results];
for(const result of results) console.log(`${result.pass?'✅':'❌'} ${result.name}${result.error?` — ${result.error}`:''}`);
const blockerCount=results.filter(result=>!result.pass).length;
console.log(`\n${blockerCount===0?'✅':'❌'} CR-16C DETERMINISTIC DEADLOCK RESOLUTION POLICY: ${blockerCount===0?'PASS':'FAIL'} / ${blockerCount} BLOCKER`);
if(blockerCount>0) process.exitCode=1;
