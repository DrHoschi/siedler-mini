import { runCr09bSelfTest } from './cr-09b-self-test.js';

const report=runCr09bSelfTest();
for(const result of report.results){
  console.log(`${result.pass?'PASS':'FAIL'} ${result.name}${result.error?` — ${result.error}`:''}`);
}
if(!report.pass) process.exitCode=1;
console.log(report.pass?'CR-09B DETERMINISTIC GRID PATHFINDING: PASS / 0 BLOCKER':'CR-09B DETERMINISTIC GRID PATHFINDING: FAIL');
