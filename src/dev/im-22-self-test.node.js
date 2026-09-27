import { runIM22SelfTest } from './im-22-self-test.js';
const result=runIM22SelfTest();
console.log(JSON.stringify(result,null,2));
if(result.status!=='PASS')process.exitCode=1;
