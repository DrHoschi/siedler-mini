import { runCr15aSelfTest } from './cr-15a-self-test.js';
import { runCr14FreezeGate } from './cr-14-freeze-gate.js';

const cr14=runCr14FreezeGate();
const cr15a=runCr15aSelfTest();
const results=[{name:'cr14-freeze-regression-pass',pass:cr14.pass&&cr14.blockerCount===0},...cr15a.results];
for(const result of results) console.log(`${result.pass?'✅':'❌'} ${result.name}${result.error?` — ${result.error}`:''}`);
const blockerCount=results.filter(result=>!result.pass).length;
console.log(`\n${blockerCount===0?'✅':'❌'} CR-15A CARRIER WAITING STATE CONTRACT: ${blockerCount===0?'PASS':'FAIL'} / ${blockerCount} BLOCKER`);
if(blockerCount>0) process.exitCode=1;
