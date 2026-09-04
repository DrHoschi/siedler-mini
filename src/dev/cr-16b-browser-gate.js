import '../main.js';
import { runCr16bSelfTest } from './cr-16b-self-test.js';

const testEl=document.querySelector('#test-status');
const cr16a=window.CleanRuntime?.reports?.cr16a;
const cr16b=runCr16bSelfTest();
const cr16aPass=!!cr16a?.pass&&cr16a.blockerCount===0;
const failures=cr16b.results.filter(result=>!result.pass).map(result=>result.error?`${result.name}: ${result.error}`:result.name);
const pass=cr16aPass&&cr16b.pass&&cr16b.blockerCount===0;
if(testEl) testEl.textContent=pass?'CR-16B DETERMINISTIC DEADLOCK DETECTION: PASS / 0 BLOCKER':`CR-16B DETERMINISTIC DEADLOCK DETECTION: FAIL — ${[...(cr16aPass?[]:['cr16a-regression']),...failures].join(' | ')}`;
window.CR16B=Object.freeze({report:cr16b,selfTest:()=>runCr16bSelfTest()});
console.info('[CR-16B] Deterministic Deadlock Detection',{build:window.CleanRuntime?.config?.build,cr16aRegression:cr16a,cr16b,overallPass:pass});
