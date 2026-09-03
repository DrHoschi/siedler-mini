import { runCr08cSelfTest } from './cr-08c-self-test.js';

const report=runCr08cSelfTest();
for(const result of report.results){
  if(result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error?` — ${result.error}`:''}`);
}
if(!report.pass){console.error('\n❌ CR-08C Movement ↔ Transport Execution Integration FAILED');process.exitCode=1;}
else console.log('\n✅ CR-08C Movement ↔ Transport Execution Integration PASS');
