import { runIM24SelfTest } from './im-24-self-test.js';
const result=runIM24SelfTest();
console.log(JSON.stringify(result,null,2));
if(result.status!=='PASS')process.exitCode=1;
