import { runCr07cSelfTest } from './cr-07c-self-test.js';

const report=runCr07cSelfTest();
for(const result of report.results) console.log(`${result.pass?'PASS':'FAIL'} ${result.name}${result.error?` — ${result.error}`:''}`);
if(!report.pass){
  console.error('❌ CR-07C TransportJob Completion & Carrier Release FAILED');
  process.exitCode=1;
}else{
  console.log('✅ CR-07C TransportJob Completion & Carrier Release PASS');
}
