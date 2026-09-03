import { runCr08aSelfTest } from './cr-08a-self-test.js';

const report=runCr08aSelfTest();
for(const result of report.results){
  if(result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error?` — ${result.error}`:''}`);
}
if(!report.pass){console.error('\n❌ CR-08A Carrier Movement Contract FAILED');process.exitCode=1;}
else console.log('\n✅ CR-08A Carrier Movement Contract PASS');
