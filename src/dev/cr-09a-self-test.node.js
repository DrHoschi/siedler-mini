import { runCr09aSelfTest } from './cr-09a-self-test.js';

const report=runCr09aSelfTest();
for(const result of report.results){
  if(result.pass) console.log(`✅ ${result.name}`);
  else console.error(`❌ ${result.name}${result.error?` — ${result.error}`:''}`);
}
if(!report.pass){console.error('\n❌ CR-09A Route Contract FAILED');process.exitCode=1;}
else console.log('\n✅ CR-09A Route Contract PASS');
