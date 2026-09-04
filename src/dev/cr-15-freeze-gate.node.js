import { runCr15FreezeGate } from './cr-15-freeze-gate.js';

const report=runCr15FreezeGate();
for(const result of report.results) console.log(result.pass?'✅':'❌',result.name,result.error?`— ${result.error}`:'');
if(!report.pass){console.error(`CR-15 Deterministic Waiting & Fairness Foundation Freeze Gate: FAIL / ${report.blockerCount} BLOCKER`);process.exitCode=1;}
else console.log('CR-15 DETERMINISTIC WAITING & FAIRNESS FOUNDATION FREEZE GATE: PASS / 0 BLOCKER');
