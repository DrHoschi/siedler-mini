import { runCr16bSelfTest } from './cr-16b-self-test.js';
import { runCr16cSelfTest } from './cr-16c-self-test.js';

const cr16b=runCr16bSelfTest();
const cr16c=runCr16cSelfTest();
const failures=[
  ...(cr16b.pass?[]:['CR-16B regression']),
  ...cr16c.results.filter(r=>!r.pass).map(r=>r.error?`${r.name}: ${r.error}`:r.name)
];
const pass=failures.length===0;
const el=document.querySelector('#test-status');
if(el) el.textContent=pass?'CR-16C DETERMINISTIC DEADLOCK RESOLUTION POLICY: PASS / 0 BLOCKER':`CR-16C DETERMINISTIC DEADLOCK RESOLUTION POLICY: FAIL — ${failures.join(' | ')}`;
console.info('[CR-16C] Deterministic Deadlock Resolution Policy',{cr16b,cr16c,overallPass:pass});
