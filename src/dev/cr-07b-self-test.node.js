import { runCr07bSelfTest } from './cr-07b-self-test.js';

const report=runCr07bSelfTest();
for(const result of report.results) console.log(`${result.pass?'PASS':'FAIL'} ${result.name}${result.error?` — ${result.error}`:''}`);
if(!report.pass){
  console.error('❌ CR-07B Resource / Claim / Demand Settlement Commit FAILED');
  process.exitCode=1;
}else{
  console.log('✅ CR-07B Resource / Claim / Demand Settlement Commit PASS');
}
