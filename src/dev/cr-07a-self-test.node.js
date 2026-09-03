import { runCr07aSelfTest } from './cr-07a-self-test.js';

const report=runCr07aSelfTest();
for(const result of report.results){
  if(result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error?` — ${result.error}`:''}`);
}
if(!report.pass){console.error('\n❌ CR-07A Delivery Settlement Contract FAILED');process.exitCode=1;}
else console.log('\n✅ CR-07A Delivery Settlement Contract PASS');
