import { runCr08bSelfTest } from './cr-08b-self-test.js';

const report=runCr08bSelfTest();
for(const result of report.results){
  if(result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error?` — ${result.error}`:''}`);
}
if(!report.pass){console.error('\n❌ CR-08B Direct Target Movement Execution FAILED');process.exitCode=1;}
else console.log('\n✅ CR-08B Direct Target Movement Execution PASS');
